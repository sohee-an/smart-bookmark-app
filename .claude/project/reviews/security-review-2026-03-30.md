# 보안 리뷰 — 북마크 삭제 기능 추가

> 분석 일자: 2026-03-30
> 분석 대상: BookmarkDetailPanel.tsx (onDelete prop/UI), queries.ts (useDeleteBookmark)
> 연관 파일: supabase.repository.ts, bookmark.service.ts, middleware.ts
> 기준: security-reviewer.md 체크리스트

---

## 발견된 취약점

---

### [Critical] 삭제 쿼리 소유권 검증 누락

- 위치: `apps/web/src/entities/bookmark/api/supabase.repository.ts:74-76`
- 문제: `delete(id)` 메서드가 `.eq("id", id)` 조건만 사용하고 `.eq("user_id", this.userId)` 조건이 없다.
- 공격 시나리오: 공격자가 타인의 북마크 UUID를 알고 있다면 자신의 인증 세션으로 `bookmarkService.deleteBookmark(피해자_id)`를 호출해 피해자의 북마크를 삭제할 수 있다. Supabase RLS가 미적용 상태라면 DB 레벨 방어도 없다.
- 수정:
  - `supabase.from("bookmarks").delete().eq("id", id).eq("user_id", this.userId)` 로 변경
  - Supabase 콘솔에서 bookmarks 테이블 RLS 정책에 `auth.uid() = user_id` DELETE 정책 추가

---

### [High] findById 소유권 검증 누락

- 위치: `apps/web/src/entities/bookmark/api/supabase.repository.ts:63-72`
- 문제: `findById(id)`가 `.eq("id", id)`만 사용해 타인 북마크 조회 가능.
- 공격 시나리오: UUID 노출 경로(공유 기능, 로그, 네트워크 탭)를 통해 타인 북마크 ID를 획득한 뒤 URL/요약/태그/메모 전체를 조회할 수 있다.
- 수정: `.eq("id", id).eq("user_id", this.userId)` 조건 추가

---

### [Medium] searchQuery PostgREST 필터 직접 삽입

- 위치: `apps/web/src/entities/bookmark/api/supabase.repository.ts:46`
- 문제: `query.or(`title.ilike.%${q}%,...`)` 형태로 사용자 입력이 PostgREST 필터 문자열에 직접 삽입됨.
- 공격 시나리오: `q = "x%,user_id.eq.타인UUID"` 형태의 값을 전달하면 의도하지 않은 필터 조건이 주입되어 타인 데이터가 조회 결과에 포함될 수 있다.
- 수정: `.ilike("title", ...)`, `.ilike("summary", ...)` 등 개별 메서드 체이닝으로 교체, 또는 입력값에서 `,()%` 등 PostgREST 특수문자를 사전 이스케이프 처리

---

### [Medium] is_guest 쿠키 클라이언트 위조 가능

- 위치: `apps/web/src/middleware.ts:63-65`
- 문제: `is_guest` 쿠키 값이 `"true"`이면 인증된 것으로 처리. 이 쿠키는 클라이언트에서 `document.cookie`로 임의 설정 가능.
- 공격 시나리오: 비인증 사용자가 브라우저에서 `is_guest=true` 쿠키를 수동 설정하면 미들웨어의 랜딩 페이지 리다이렉트를 우회해 메인 대시보드 UI에 접근 가능.
- 수정: 게스트 판단을 서명된 서버 발급 쿠키 또는 Supabase anonymous session으로 대체.

---

### [Medium] useDeleteBookmark — 클라이언트 소유권 guard 없음

- 위치: `apps/web/src/features/bookmark/model/queries.ts:50-71`
- 문제: `mutationFn`이 `id: string`만 받아 현재 사용자 소유 여부를 확인하지 않는다.
- 공격 시나리오: 클라이언트 코드를 조작하거나 React Query devtools를 통해 임의 UUID를 `mutate` 호출에 주입하면 소유하지 않은 북마크 삭제 시도가 API까지 전달됨.
- 수정: Repository 레벨 수정(Critical) 선행 필수. 훅에서도 캐시의 북마크 목록과 id를 대조해 소유 여부 확인 guard 추가 권장.

---

### [Low] updateBookmark 파라미터 타입 any

- 위치: `apps/web/src/features/bookmark/model/bookmark.service.ts:74`
- 문제: `async updateBookmark(id: string, data: any)` — any 타입으로 잘못된 필드 전달을 타입 체커가 잡지 못함.
- 수정: `data` 파라미터 타입을 `UpdateBookmarkData`로 교체

---

### [Low] console.error 에러 객체 전체 노출

- 위치: `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx:65, 80`
- 문제: `console.error("[BookmarkDetailPanel] 삭제 실패:", err)` 로 Supabase 에러 객체 전체 출력. Supabase 에러에는 내부 쿼리 힌트, 테이블명, 컬럼명이 포함될 수 있음.
- 수정: `err instanceof Error ? err.message : String(err)` 형태로 메시지만 출력.

---

## 확인 불가 항목

- Supabase RLS bookmarks 테이블 실제 적용 여부 — 스키마 파일 부재로 확인 불가. Supabase 콘솔에서 직접 확인 필수.
- Rate Limiting (AI 분석/크롤링 API) — 이번 분석 범위 외.

---

## 우선순위 요약

| 심각도   | 건수 | 즉시 수정 필요                                      |
| -------- | ---- | --------------------------------------------------- |
| Critical | 1    | supabase.repository.ts delete() user_id 조건 누락   |
| High     | 1    | supabase.repository.ts findById() user_id 조건 누락 |
| Medium   | 3    | searchQuery 주입, is_guest 위조, 클라이언트 guard   |
| Low      | 2    | any 타입, console.error 노출                        |

Critical → High 순으로 즉시 수정 후 RLS 정책 적용 여부를 Supabase 콘솔에서 확인할 것.
