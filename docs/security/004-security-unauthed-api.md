# 004 · API Route 인증 없음

## 심각도

High

## 위치

- `apps/web/src/pages/api/crawl.ts`
- `apps/web/src/pages/api/ai-analyze.ts`

## 문제

두 엔드포인트 모두 로그인 여부를 확인하지 않아 누구나 호출 가능합니다.

- `/api/crawl` — 서버를 외부 URL 프록시로 악용, SSRF 공격 진입점
- `/api/ai-analyze` — Gemini API 크레딧을 무제한 소진 가능

```bash
# 인증 없이 Gemini API 호출
curl -X POST https://example.com/api/ai-analyze \
  -H "Content-Type: application/json" \
  -d '{"title":"...", "description":"...", "bodyChunks":["...","...","..."]}'
```

## 수정 방향

각 API Route 핸들러 시작 부분에 세션 검증을 추가합니다.

```ts
// crawl.ts, ai-analyze.ts 공통 패턴
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 이후 기존 로직
}
```

> 비회원도 크롤링을 사용해야 한다면 Supabase Anonymous Auth(003 참조)로 일관되게 처리합니다.
