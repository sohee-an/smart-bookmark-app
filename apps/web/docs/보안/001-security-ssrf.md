# 001 · SSRF (Server-Side Request Forgery)

## 심각도

Critical

## 위치

- `apps/web/src/pages/api/crawl.ts`
- `apps/web/src/server/services/crawler.service.ts`

## 문제

`/api/crawl`은 클라이언트로부터 받은 URL을 아무 검증 없이 서버에서 직접 `fetch()`합니다.
`validateUrl.ts`는 클라이언트 UI에서만 실행되므로 API를 직접 호출하면 완전히 우회됩니다.

`new URL()`은 다음을 모두 유효한 URL로 통과시킵니다.

- `http://localhost:5432` — 내부 DB 포트 스캔
- `http://127.0.0.1`, `http://10.x.x.x`, `http://192.168.x.x` — 내부망 탐색
- `http://169.254.169.254/latest/meta-data/` — AWS EC2 메타데이터 탈취
- `file:///etc/passwd` — 파일 시스템 접근 시도
- `ftp://`, `gopher://` 등 비HTTP 스킴

```bash
# 공격 예시
curl -X POST https://example.com/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}'
```

## 수정 방향

`/api/crawl` 서버 진입점에서 URL을 허용 목록 기반으로 검증합니다.

```ts
function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  // http/https만 허용
  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const hostname = parsed.hostname;

  // localhost 및 사설 IP 차단
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./, // link-local (AWS metadata)
    /^::1$/,
    /^0\.0\.0\.0$/,
  ];
  if (privatePatterns.some((p) => p.test(hostname))) return false;

  return true;
}
```

`crawl.ts`에서 `crawlerService.crawl()` 호출 전에 `isSafeUrl(url)` 통과 여부를 체크합니다.
