# docs — 보안 및 엣지 케이스 문서

보안 취약점과 엣지 케이스 분석 문서 목록입니다.

| 번호 | 파일                                                            | 심각도   | 요약                                                                 |
| ---- | --------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| 001  | [security-ssrf](./001-security-ssrf.md)                         | Critical | `/api/crawl`이 내부망 URL을 서버에서 fetch — SSRF                    |
| 002  | [security-idor](./002-security-idor.md)                         | Critical | Supabase repository의 delete/update에 user_id 필터 없음              |
| 003  | [security-auth-bypass](./003-security-auth-bypass.md)           | Critical | `is_guest` 쿠키 조작으로 인증 전체 우회 가능                         |
| 004  | [security-unauthed-api](./004-security-unauthed-api.md)         | High     | `/api/crawl`, `/api/ai-analyze` 인증 없이 누구나 호출 가능           |
| 005  | [security-rate-limit](./005-security-rate-limit.md)             | High     | 전체 API Route에 Rate Limiting 없음                                  |
| 006  | [security-prompt-injection](./006-security-prompt-injection.md) | Medium   | 크롤 데이터가 AI 프롬프트에 직접 삽입 — Prompt Injection             |
| 007  | [security-error-leak](./007-security-error-leak.md)             | Medium   | 500 응답에 `error.message` 그대로 노출                               |
| 008  | [edge-localstorage-race](./008-edge-localstorage-race.md)       | Low      | 멀티탭 동시 저장 시 비회원 5개 제한 초과 가능                        |
| 009  | [edge-thumbnail-url](./009-edge-thumbnail-url.md)               | Low      | og:image URL 미검증 — 사용자 추적 가능                               |
| 010  | [edge-body-size-limit](./010-edge-body-size-limit.md)           | Low      | bodyChunks 크기 제한 없어 대용량 페이지 시 불필요한 메모리/전송 낭비 |
