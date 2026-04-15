# 005 · Rate Limiting 없음

## 심각도

High

## 위치

- `apps/web/src/pages/api/crawl.ts`
- `apps/web/src/pages/api/ai-analyze.ts`
- `apps/web/src/pages/api/` (전체 API Route)

## 문제

모든 API Route에 요청 횟수 제한이 없습니다.

- `/api/ai-analyze`: 자동화 스크립트로 Gemini API 크레딧 빠르게 소진 가능
- `/api/crawl`: 반복 호출로 서버 과부하 또는 외부 사이트 DDoS 경유지로 악용 가능

## 수정 방향

### 옵션 A — Vercel / 인프라 레이어에서 처리 (권장)

Vercel을 사용한다면 Edge Config나 Firewall 규칙으로 IP당 분당 요청 수 제한.
AWS라면 API Gateway의 Usage Plan 또는 WAF 규칙 적용.

### 옵션 B — 미들웨어 + in-memory 카운터 (간단 구현)

```ts
// shared/lib/rateLimit.ts
const requestMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = requestMap.get(ip);

  if (!entry || now > entry.resetAt) {
    requestMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
```

```ts
// crawl.ts, ai-analyze.ts
const ip = req.headers["x-forwarded-for"]?.toString() ?? req.socket.remoteAddress ?? "unknown";
if (!checkRateLimit(ip, 20)) {
  return res.status(429).json({ message: "Too many requests" });
}
```

> 서버리스 환경에서는 in-memory 방식이 인스턴스 간 공유가 안 되므로 Redis 또는 Upstash를 사용하는 것이 더 정확합니다.
