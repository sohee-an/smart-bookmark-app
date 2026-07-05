# 테스트 전략 (Testing Strategy)

SmartMark는 핵심 도메인 로직과 AI 파이프라인의 실패 흐름을 빠르게 회귀 검증하는 것을 우선한다.

---

## 현재 테스트 현황

| 구분          | 범위                                                          | 상태 |
| ------------- | ------------------------------------------------------------- | ---- |
| URL 검증      | URL 형식, 허용 스킴, 예외 케이스                              | 완료 |
| SSRF 방어     | 사설망, 루프백, 링크 로컬, 비 HTTP 스킴 차단                  | 완료 |
| 북마크 도메인 | mapper, store, 필터링, 회원/비회원 저장 흐름                  | 완료 |
| AI 파이프라인 | 상태 전환, 실패 처리, 재시도 전환                             | 완료 |
| AI 응답 파싱  | JSON 추출, summary 필수 검증, tags 복구, Gemini retry/backoff | 완료 |
| UI 컴포넌트   | BookmarkCard, BookmarkList, FilterBar, TagFilter              | 완료 |

현재 단위 테스트는 140개 이상이며, `vitest run --project unit`으로 전체 검증한다.

---

## 핵심 검증 원칙

- 사용자 입력 URL은 저장 전에 형식 검증과 SSRF 방어를 통과해야 한다.
- LLM 응답은 신뢰하지 않고 Zod 스키마로 검증한다.
- `summary`는 핵심 산출물이므로 누락되거나 비어 있으면 실패 처리한다.
- `tags`는 보조 데이터이므로 잘못된 응답은 빈 배열로 복구한다.
- 크롤링 실패(`crawl_failed`)와 AI 분석 실패(`failed`)는 다른 상태로 다룬다.
- 실패 카드는 개별 북마크 단위 재시도를 지원하고, 무한 재시도를 막는다.

---

## 실행 명령어

```bash
# 웹 앱 타입 검사
pnpm --filter @smart-bookmark/web typecheck

# 웹 앱 단위 테스트
pnpm --filter @smart-bookmark/web test

# 현재 브랜치에서 사용한 직접 검증 명령
cd apps/web
./node_modules/.bin/tsc.CMD --noEmit
./node_modules/.bin/vitest.CMD run --project unit
```

---

## 보강 후보

| 후보                        | 이유                                           | 우선순위 |
| --------------------------- | ---------------------------------------------- | -------- |
| Repository 단위 테스트 확대 | Supabase 변환/태그 교체 로직의 회귀 방지       | 중간     |
| API Route 통합 테스트       | 인증, 저장, 수정, 삭제 응답 계약 검증          | 중간     |
| Playwright E2E              | 실제 브라우저에서 저장 → 분석 → 검색 흐름 검증 | 중간     |
| 익스텐션 bulk import E2E    | 대량 저장과 개별 실패 격리 검증                | 낮음     |

---

## 참고

- 테스트 파일 위치: 구현 파일 근처의 `*.test.ts` / `*.test.tsx`
- 테스트 도구: Vitest, Testing Library, Supabase/API mock
- 주요 회귀 방지 대상: URL 검증, SSRF, AI 응답 파싱, 북마크 상태 전환
