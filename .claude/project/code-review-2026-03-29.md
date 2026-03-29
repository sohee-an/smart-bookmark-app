# 코드 리뷰 — 포트폴리오/사업성 관점

> 일자: 2026-03-29
> 대상: 컬렉션, 익스텐션 제외 전체 기능
> 기준: FSD 레이어, 타입 안전성, 보안, UX 완성도

---

## 치명적 문제 (즉시 수정)

### [1] API 에러 응답에 내부 구현 노출

- `apps/web/src/app/api/ai-analyze/route.ts:58-60`
- `apps/web/src/app/api/embed/route.ts:50`

```ts
details: error.message; // Gemini API 키 오류 등 내부 메시지가 브라우저 DevTools에 노출
```

**영향:** 배포된 상태에서 API 키 관련 오류, 내부 스택 정보가 외부에 노출됨
**수정:** `details` 필드 제거. 클라이언트에는 고정 메시지만 반환하고, 상세 내용은 서버 로그 전용으로 처리

---

### [2] Pages Router 잔재 파일이 App Router와 혼재

- `apps/web/src/server/services/ai.service.ts` — Pages Router용, 실제 미사용
- `apps/web/src/app/api/ai-analyze/route.ts` — App Router, 실제 사용 중

**영향:** 사용되지 않는 파일이 `@google/generative-ai`를 import해 번들에 영향. App Router 마이그레이션이 완료되지 않은 것처럼 보임
**수정:** Pages Router 잔재 파일 전체 제거 (`server/services/ai.service.ts`, 연관 구버전 파일들)

---

### [3] 비회원 5개 제한 — localStorage 조작으로 우회 가능

- `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx:47-48`
- `apps/web/src/entities/bookmark/api/local.repository.ts` (save 메서드)

```ts
// 제한 로직이 클라이언트 체크에만 의존
const cachedBookmarks = queryClient.getQueryData<Bookmark[]>(bookmarkKeys.list()) ?? [];
const isFifth = cachedBookmarks.length === 4;
```

**영향:** localStorage를 직접 수정하면 `getRows()`가 빈 배열 반환 → 제한 무력화. 비즈니스 핵심 전환점(비회원→회원 유도)이 뚫림
**수정:** `/api/crawl` 호출 시 서버에서 게스트 ID 기반 카운트를 DB에서 검증하는 로직 추가

---

## 설계 문제 (포트폴리오 제출 전 수정)

### [4] 서비스 핵심 메서드 `updateBookmark`가 `any`

- `apps/web/src/features/bookmark/model/bookmark.service.ts:72`

```ts
async updateBookmark(id: string, data: any): Promise<void>
// UpdateBookmarkData 타입이 bookmark.repository.ts에 이미 정의되어 있음
```

**영향:** TypeScript strict를 어필 포인트로 내세우는 프로젝트에서 핵심 서비스 메서드가 `any`면 설득력 없음
**수정:** `data: UpdateBookmarkData`로 교체

---

### [5] `supabase.repository.ts` 전반 — `any` 남용

- `apps/web/src/entities/bookmark/api/supabase.repository.ts:54, 95, 157, 159, 165`

`toRow(dbData: any)`, `extractTags(dbData: any)`, `data.map((row: any) => ...)` 등 5곳
`BookmarkRow` 타입이 이미 있음에도 Supabase 응답을 `any`로 받아 수동 매핑

**수정:** Supabase `Database` 타입 생성 후 쿼리 제네릭 적용. 최소한 `toRow`, `extractTags` 파라미터를 인터페이스로 명시

---

### [6] UI 컴포넌트가 전체 AI 파이프라인 오케스트레이션

- `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx:37-152`

저장 → 크롤링 → AI 분석 → 임베딩 → 캐시 갱신 전체(115줄)가 `handleSave` 안에 구현됨

**영향:** FSD 위반 (비즈니스 로직이 `ui/` 레이어에 존재). 테스트 작성 불가. 다른 진입점(북마크릿 등)에서 재사용 불가
**수정:** `useAddBookmark` 훅 또는 `bookmarkPipelineService`로 파이프라인 로직 분리

---

### [7] 저장 실패 시 사용자 피드백 없음

- `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx:57-58`

```ts
} catch (err) {
  console.error("[BookmarkDetailPanel] 저장 실패:", err)
  // 사용자는 저장이 실패했는지 알 방법이 없음
}
```

**영향:** UX 버그. 저장 버튼 누르면 스피너가 멈추고 아무 일도 없는 것처럼 보임
**수정:** toast 또는 에러 상태 표시 추가

---

### [8] SSRF 방어 — IPv6 사설망 차단 미흡

- `apps/web/src/shared/lib/validateSsrf.ts:35-41`

IPv6 사설 범위(`::1`, `fc00::/7`, `fe80::/10`) 미차단. DNS Rebinding 방어 없음
**수정:** IPv6 사설 범위 추가 차단 로직 추가

---

### [9] `storage.ts` — try/catch 없는 `JSON.parse`

- `apps/web/src/shared/lib/storage.ts:4`

```ts
return JSON.parse(value); // localStorage 손상 시 throw → 비회원 북마크 전체 렌더링 불가
```

**수정:**

```ts
try {
  return JSON.parse(value);
} catch {
  return null;
}
```

---

### [10] 태그 필터링을 앱 레이어에서 처리

- `apps/web/src/entities/bookmark/api/supabase.repository.ts:56-58`

```ts
if (filter?.tag) {
  return bookmarks.filter((b) => b.tags.includes(filter.tag!));
  // 전체 데이터 가져온 후 JS에서 필터링
}
```

**영향:** 북마크 수백 개 이상 시 불필요한 데이터 전송
**수정:** Supabase 쿼리에서 직접 필터링 (`eq` 또는 RPC)

---

## 개선 권장

### [11] 5번째 감지 로직이 캐시 의존으로 불안정

- `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx:47-48`

`bookmarkKeys.list()` 키로 캐시 조회 시, 필터 조건이 있는 키(`bookmarkKeys.list(filter)`)에 데이터가 캐싱된 경우 빈 배열 반환 → `isFifth` 판단 오류 가능
**수정:** `bookmarkKeys.all`로 범위 넓히거나 count API 직접 호출

---

### [12] User-Agent 하드코딩

- `apps/web/src/server/services/crawler.service.ts:34-37`

고정 User-Agent로 Cloudflare 방어 사이트에서 일관 실패 가능
**수정:** 환경변수 또는 상수로 분리

---

### [13] `useBookmarkStore`를 Zustand로 관리할 필요 없음

- `apps/web/src/entities/bookmark/model/useBookmarkStore.ts`

`selectedBookmarkId` 하나뿐. 상위 컴포넌트 `useState` 또는 URL 쿼리스트링으로 처리하면 뒤로가기 지원도 자연스럽게 됨

---

## 잘된 부분

- **SSRF 방어 구조** — 프로토콜 제한 + DNS 조회 + 사설 IP 대역 차단을 모두 처리. `SsrfError` 커스텀 예외 분리까지 체계적
- **Repository 패턴 추상화** — `BookmarkRepository` 인터페이스로 `LocalRepository` / `SupabaseBookmarkRepository` 교체 가능한 구조. 백엔드 전환 어필에 충분
- **API 라우트 인증 검증 일관됨** — `/api/crawl`, `/api/ai-analyze`, `/api/embed` 모두 `user && isGuest` 이중 체크
- **`BookmarkMapper`** — DB 레이어 타입과 도메인 타입 분리 원칙 잘 적용됨
- **AI 파이프라인 단계별 `aiStatus` 처리** — 실패 시 카드에 상태 표시되는 구조

---

## 우선순위 요약

| 순위 | 항목                        | 이유                           |
| ---- | --------------------------- | ------------------------------ |
| 1    | [2] Pages Router 잔재 정리  | App Router 마이그레이션 완성도 |
| 2    | [1] API 에러 내부 정보 제거 | 보안                           |
| 3    | [4][5] `any` 제거           | TypeScript strict 어필 일관성  |
| 4    | [6] 파이프라인 로직 분리    | 테스트 가능성 + FSD 준수       |
| 5    | [3] 비회원 제한 서버 검증   | 비즈니스 모델 안정성           |
