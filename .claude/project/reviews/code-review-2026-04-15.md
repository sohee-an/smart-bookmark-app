# 코드 리뷰 결과 — 2026-04-15

공격적 비평가 시점. 우선순위: Critical > High > Medium > Low.

---

## Critical (즉시 수정)

### C-1. `thumbnailUrl`이 DB에 실제로 저장 안 되는 묵음 버그

**파일**: `apps/web/src/features/bookmark/model/bookmark.service.ts:74`
`UpdateBookmarkData`에 `thumbnailUrl`이 없어서 `SupabaseBookmarkRepository.update()`에서 `thumbnail_url` 매핑 누락. 회원 저장 시 썸네일 항상 유실.
**수정**: `UpdateBookmarkData`에 `thumbnailUrl?: string` 추가 → `supabase.repository.ts`에 `thumbnail_url` 매핑 추가 → 서비스 `any` 타입 제거.

### C-2. `JSON.parse` try/catch 없음 — Gemini 응답 파싱 시 서버 500

**파일**:

- `apps/web/src/app/api/extension/organize/route.ts:107`
- `apps/web/src/app/api/extension/_lib/pipeline.ts:48`
- `apps/web/src/app/api/ai-analyze/route.ts:44`
  Gemini 잘린 응답 시 throw → 서버 500. 공통 `safeJsonParse` 유틸 추출 후 3곳 모두 적용.

### C-3. Extension API — anon 키 클라이언트로 DB 쓰기

**파일**: `apps/web/src/app/api/extension/_lib/auth.ts:28-37`
RLS 정책에 따라 다른 유저 데이터 접근 우회 가능. `createSupabaseServerClient()`로 교체.

### C-4. `invite/route.ts` — `auth.users` 직접 SELECT

**파일**: `apps/web/src/app/api/collections/invite/route.ts:38-42`
비공식 내부 스키마 의존. `adminSupabase.auth.admin.getUserByEmail()`로 교체.

---

## High

### H-1. FSD 레이어 위반 — entities가 Zustand store 직접 접근

**파일**: `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx:4`
entities가 `useBookmarkStore`를 import해 `setSelectedBookmarkId(null)` 직접 호출. `onClose?: () => void` prop으로 위임.

### H-2. `LocalRepository.findAll` — filter 완전히 무시

**파일**: `apps/web/src/entities/bookmark/api/local.repository.ts:53-57`
비회원 태그 필터/검색 전혀 작동 안 함. Supabase 구현체와 동작 불일치.

### H-3. Realtime 캐시 패치 — tags 미갱신

**파일**: `apps/web/src/features/bookmark/model/useBookmarkRealtime.ts:33-40`
`bookmark_tags`가 별도 테이블이라 realtime payload에 tags 없음. `ai_status === 'completed'` 시 `queryClient.invalidateQueries` 호출 필요.

### H-4. `storage.get` — `JSON.parse` 예외 처리 없음

**파일**: `apps/web/src/shared/lib/storage.ts:7`
localStorage 값 손상 시 앱 전체 crash.

### H-5. `organize/route.ts` — 월 1회 제한 TOCTOU 레이스 컨디션

**파일**: `apps/web/src/app/api/extension/organize/route.ts:52-72`
SELECT 확인 → INSERT 기록 사이 동시 요청 시 두 번 모두 통과. `(user_id, feature, month)` Unique 제약으로 DB 레벨 강제.

### H-6. AI 응답 title이 문자열 `"null"` 일 때 처리 누락

**파일**: `apps/web/src/app/api/extension/_lib/pipeline.ts:50`
`aiData.title || title`에서 `"null"` 문자열이 truthy 평가됨. `rawTitle && rawTitle !== "null" ? rawTitle : null` 처리 추가.

---

## Medium

### M-1. `CORS_HEADERS` — `Access-Control-Allow-Origin: "*"`

**파일**: `apps/web/src/app/api/extension/_lib/auth.ts:3-7`
Extension API가 모든 Origin에 열려 있음. `chrome-extension://[id]`로 제한.

### M-2. `AddBookmarkOverlay` — `handleClose`가 useEffect 의존성 누락

**파일**: `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx:39`
stale closure 가능. `useCallback` 메모이제이션 또는 의존성 추가.

### M-3. `HomeContent` — useEffect 의존성 `[!!bookmarks.length]` boolean 축약

**파일**: `apps/web/src/widgets/home/ui/HomeContent.tsx:46`
북마크 목록 교체돼도 이펙트 재실행 안 됨. stuck 감지 로직 첫 마운트 이후 미작동.

### M-4. `BookmarkService.addBookmark` — `getSession()` 이중 호출

**파일**: `apps/web/src/features/bookmark/model/bookmark.service.ts:38-52`
같은 메서드에서 세션 조회 2번. `getRepository()`로 통일.

### M-5. `SupabaseBookmarkRepository.insertTags` — N+1 쿼리

**파일**: `apps/web/src/entities/bookmark/api/supabase.repository.ts:141-153`
태그 10개 = Supabase 요청 20번. 배열 bulk upsert로 교체.

### M-6. `semantic-search/route.ts` — DB row 타입 전체 `any`

**파일**: `apps/web/src/app/api/semantic-search/route.ts:48, 58, 68`
`supabase.rpc<MatchBookmarkRow>()` 제네릭 타입 지정 필요.

### M-7. `ai.service.ts` — `pages/api` 레거시와 `app/api` 중복 공존

**파일**: `apps/web/src/server/services/ai.service.ts`
`app/api/ai-analyze/route.ts`와 기능 중복. 사용처 확인 후 삭제.

### M-8. `BookmarkDetailPanel.handleSave` — 실패 시 toast 없음

**파일**: `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx:64-66`
삭제 실패는 UI에 표시하는데 저장 실패는 누락. 일관성 없음.

### M-9. `validateUrl` — `javascript:` URL 통과 → XSS

**파일**: `apps/web/src/shared/lib/validateUrl.ts`
`<a href={bookmark.url}>`에서 XSS 가능. `http:`/`https:` 외 차단.

---

## Low

- **L-1** `handleCopyUrl` — clipboard 실패 시 에러 미처리 (`apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx:97`)
- **L-2** `BookmarkCard.isNew` — 매 렌더링마다 `new Date()` 생성 (`BookmarkCard.tsx:36`)
- **L-3** `BookmarkFilter` 타입 두 곳에 중복 정의
- **L-4** `storage.cookie.set` — JS 쿠키는 HttpOnly 불가, 인증 관련은 서버 발급 권장

---

## 기획 확정 필요

| 항목 | 내용                                                                                   |
| ---- | -------------------------------------------------------------------------------------- |
| P-1  | 비회원 파이프라인 — 탭 닫으면 크롤링/AI 중단. 비회원 경험 보장 수준 결정 필요          |
| P-2  | 월 1회 초기화 기준 UTC vs KST                                                          |
| P-3  | Realtime 구독 범위 — 협업 확장 시 어떤 이벤트만 구독할지                               |
| P-4  | `bulk-import` — waitUntil로 200개 순차 파이프라인 (Vercel 10초 제한). QStash 전환 시점 |

---

## 핵심 3가지 요약

1. **C-1 (Critical/버그)**: `thumbnailUrl`이 DB에 실제로 저장 안 됨 — `updateBookmark`의 `any` 타입 때문
2. **M-9 (Medium/보안)**: `javascript:` URL이 `validateUrl` 통과 → XSS 가능
3. **H-2 (High/기능)**: 비회원 태그/상태 필터 작동 안 함 — `LocalRepository.findAll`이 filter 무시
