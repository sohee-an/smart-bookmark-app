# Project Index — 키워드 → 파일 맵

> Claude가 핀포인트로 파일을 찾기 위한 인덱스.
> 새 파일 추가/삭제 시 반드시 업데이트할 것.

---

## 크롤링

- `CrawlResult`, `CrawlerErrorCode`, `CrawlerService` → `apps/web/src/server/services/crawler.service.ts`
- 크롤링 전용 API Route → `apps/web/src/app/api/crawl/route.ts`

## AI 분석

- `AIAnalysisResult`, `AIService` → `apps/web/src/server/services/ai.service.ts`
- AI 분석 전용 API Route → `apps/web/src/app/api/ai-analyze/route.ts`
- 시맨틱 서치 임베딩 API Route → `apps/web/src/app/api/embed/route.ts`
- 시맨틱 서치 검색 API Route → `apps/web/src/app/api/semantic-search/route.ts`

## 북마크 대화 (RAG 챗)

- SSE 챗 API Route (RAG + grounding, text/event-stream) → `apps/web/src/app/api/chat/route.ts`
- `useBookmarkChat` (SSE fetch 파싱 + AbortController 중단) → `apps/web/src/features/chat/model/useBookmarkChat.ts`
- `ChatContent` (스트리밍·근거 카드·자동스크롤·중단·빈상태) → `apps/web/src/features/chat/ui/ChatContent.tsx`
- `Markdown` (의존성 없는 경량 마크다운 렌더러) → `apps/web/src/features/chat/ui/Markdown.tsx`
- 챗 페이지 (회원 전용) → `apps/web/src/app/(main)/chat/page.tsx`

**테스트**:

- `useBookmarkChat.test.ts` ✅ (SSE 파싱, 청크 경계, 에러/401) → `apps/web/src/features/chat/model/useBookmarkChat.test.ts`
- `Markdown.test.tsx` ✅ (볼드/리스트/코드/링크, 스트리밍 미완성) → `apps/web/src/features/chat/ui/Markdown.test.tsx`

## 북마크 타입

- `Bookmark`, `AIStatus`, `BookmarkStatus` → `apps/web/src/entities/bookmark/model/types.ts`
- DB 레이어 타입 `BookmarkRow`, `CreateBookmarkRequest`, `BookmarkFilter` → `apps/web/src/entities/bookmark/api/bookmark.types.db.ts`

## 북마크 저장/조회

- `BookmarkService` (Factory, Local/Supabase 동적 선택) → `apps/web/src/features/bookmark/model/bookmark.service.ts`
- `BookmarkRepository` 인터페이스 → `apps/web/src/entities/bookmark/api/bookmark.repository.ts`
- `LocalRepository` (localStorage, 비회원 20개 제한) → `apps/web/src/entities/bookmark/api/local.repository.ts`
- `SupabaseBookmarkRepository` (회원) → `apps/web/src/entities/bookmark/api/supabase.repository.ts`
- `BookmarkMapper` (DB ↔ 앱 타입 변환) → `apps/web/src/entities/bookmark/lib/bookmark.mapper.ts`

**테스트**:

- `bookmark.mapper.test.ts` ✅ → `apps/web/src/entities/bookmark/lib/bookmark.mapper.test.ts`
- `local.repository.test.ts` ✅ (게스트 20개 제한 등 핵심 경로) → `apps/web/src/entities/bookmark/api/local.repository.test.ts`
- `supabase.repository.test.ts` (작성 예정) → `apps/web/src/entities/bookmark/api/supabase.repository.test.ts`

## 북마크 상태 관리

- `useBookmarkStore` (Zustand, UI 상태만: selectedBookmarkId) → `apps/web/src/entities/bookmark/model/useBookmarkStore.ts`
- `useBookmarks`, `useUpdateBookmark` (TanStack Query) → `apps/web/src/features/bookmark/model/queries.ts`
- `bookmarkKeys` (query key factory) → `apps/web/src/features/bookmark/model/queries.ts`

**테스트**:

- `useBookmarkStore.test.ts` ✅ → `apps/web/src/entities/bookmark/model/useBookmarkStore.test.ts`
- `queries.test.tsx` ✅ (낙관적 업데이트/롤백 핵심 경로) → `apps/web/src/features/bookmark/model/queries.test.tsx`

## 북마크 UI

- `BookmarkCard` → `apps/web/src/entities/bookmark/ui/BookmarkCard.tsx`
- `BookmarkDetailPanel` (우측 슬라이드 상세 패널, 뷰/편집 모드) → `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx`
- `AddBookmarkOverlay` (URL + 메모 입력 모달) → `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx`
- `RecentBookmarkSlider` → `apps/web/src/widgets/bookmark/RecentBookmarkSlider.tsx`
- `HomeContent` (메인 페이지 전체 콘텐츠) → `apps/web/src/widgets/home/ui/HomeContent.tsx`
- `BookmarkList` (48개 초과 시 가상 스크롤 전환) → `apps/web/src/features/bookmark/ui/BookmarkList.tsx`
- `VirtualBookmarkGrid` (window 가상 스크롤·반응형 그리드·동적 측정) → `apps/web/src/features/bookmark/ui/VirtualBookmarkGrid.tsx`
- `makeFakeBookmarks` (성능 데모용 가짜 데이터 팩토리) → `apps/web/src/features/bookmark/lib/fakeBookmarks.ts`
- 성능 데모 라우트 (`/demo?count=N&virtual=off`, **로컬 전용** — 프로덕션 404) → `apps/web/src/app/demo/page.tsx` + `DemoContent.tsx`
  - **결정 문서**: `docs/decisions/025-리스트-가상화-렌더성능.md`

## 컬렉션 (북마크 폴더, 공유)

- `Collection`, `CollectionDetail`, `CollectionMember`, `CollectionRole` → `apps/web/src/entities/collection/model/types.ts`
- `CollectionRepository` 인터페이스 → `apps/web/src/entities/collection/api/collection.repository.ts`
- `SupabaseCollectionRepository` → `apps/web/src/entities/collection/api/supabase-collection.repository.ts`
- `CollectionCard` (역할 뱃지, 북마크/멤버 수) → `apps/web/src/entities/collection/ui/CollectionCard.tsx`
- `collectionKeys`, `useCollections`, `useCollection`, `useCollectionBookmarks`, `useCreateCollection`, `useUpdateCollection`, `useDeleteCollection`, `useAddBookmarkToCollection`, `useRemoveBookmarkFromCollection`, `useInviteMember`, `useUpdateMemberRole`, `useRemoveMember` → `apps/web/src/features/collection/model/queries.ts`
- `CreateCollectionModal` → `apps/web/src/features/collection/ui/CreateCollectionModal.tsx`
- `InviteMemberModal` (이메일 초대, 멤버 역할 관리) → `apps/web/src/features/collection/ui/InviteMemberModal.tsx`
- `AddToCollectionButton` (북마크 상세 패널에서 컬렉션 추가/제거) → `apps/web/src/features/collection/ui/AddToCollectionButton.tsx`
- 컬렉션 목록 페이지 → `apps/web/src/app/(main)/collections/page.tsx` + `CollectionsContent.tsx`
- 컬렉션 상세 페이지 → `apps/web/src/app/(main)/collections/[id]/page.tsx` + `CollectionDetailContent.tsx`
- API: 목록/생성 → `apps/web/src/app/api/collections/route.ts`
- API: 상세/수정/삭제 → `apps/web/src/app/api/collections/[id]/route.ts`
- API: 북마크 추가/제거 → `apps/web/src/app/api/collections/[id]/bookmarks/route.ts`
- API: 멤버 역할변경/제거 → `apps/web/src/app/api/collections/[id]/members/route.ts`
- API: 이메일 초대 → `apps/web/src/app/api/collections/invite/route.ts`
- DB 스키마 (컬렉션 테이블 + RLS) → `docs/collections-schema.sql`

## 인증

- 인증 미들웨어 (비회원→랜딩, 회원→메인) → `apps/web/src/middleware.ts`
- Supabase 브라우저 클라이언트 (`supabase`) → `apps/web/src/shared/api/supabase/client.ts`
- Supabase 서버 클라이언트 (`createSupabaseServerClient`) → `apps/web/src/shared/api/supabase/server.ts`
- OAuth 콜백 처리 → `apps/web/src/app/api/auth/callback/route.ts` + `apps/web/src/app/auth/callback/page.tsx`
- 익스텐션 토큰 발급 페이지 → `apps/web/src/app/auth/extension-token/page.tsx`
- 익스텐션 인증 후 리디렉트 → `apps/web/src/app/auth/web-redirect/page.tsx`
- 로그인/회원가입 Zod 스키마 → `apps/web/src/features/auth/model/auth-schema.ts`

## 페이지 라우팅

> App Router 기반. 라우트 그룹 `(main)` = 로그인 필요, `(public)` = 비로그인 접근 가능.

- 루트 레이아웃 → `apps/web/src/app/layout.tsx`
- 메인 대시보드 → `apps/web/src/app/(main)/page.tsx`
- 북마크 목록 → `apps/web/src/app/(main)/bookmarks/page.tsx` + `BookmarksContent.tsx`
- 메인 레이아웃 (로그인 필요) → `apps/web/src/app/(main)/layout.tsx`
- 랜딩 (비회원) → `apps/web/src/app/(public)/landing/page.tsx` + `LandingActions.tsx`
- 로그인 → `apps/web/src/app/(public)/login/page.tsx` + `LoginClient.tsx`
- 공개 레이아웃 → `apps/web/src/app/(public)/layout.tsx`
- 개인정보처리방침 → `apps/web/src/app/privacy/page.tsx`
- OG 이미지 API → `apps/web/src/app/api/og/route.tsx`

## 익스텐션 API

- 익스텐션 북마크 저장 → `apps/web/src/app/api/extension/save-bookmark/route.ts`
- 익스텐션 bulk import → `apps/web/src/app/api/extension/bulk-import/route.ts`
- 익스텐션 AI 정리 → `apps/web/src/app/api/extension/organize/route.ts`
- 익스텐션 API 공용 유틸 → `apps/web/src/app/api/extension/_lib/auth.ts`, `pipeline.ts`

## 공용 유틸

- `QueryProvider` (TanStack Query 클라이언트 래퍼) → `apps/web/src/shared/lib/QueryProvider.tsx`
- URL 유효성 검사 → `apps/web/src/shared/lib/validateUrl.ts`
  - **테스트**: `validateUrl.test.ts` ✅ → `apps/web/src/shared/lib/validateUrl.test.ts`
- 에러 메시지 추출 (`getErrorMessage`) → `apps/web/src/shared/lib/error.ts`
- `useClientNow` (SSR hydration 방지용 클라이언트 현재 시간 훅) → `apps/web/src/shared/lib/useClientNow.ts`
- API 응답 표준 규격 `ApiResponse`, `ApiError`, `ErrorCode` → `apps/web/src/shared/lib/api-response.ts`
- 비회원 익명 ID → `apps/web/src/shared/lib/guest.ts`
- localStorage + cookie 관리 → `apps/web/src/shared/lib/storage.ts`

## 모달/오버레이 시스템

- `overlay.open()`, `overlay.close()` → `apps/web/src/shared/lib/overlay/overlay.ts`
- 오버레이 타입 → `apps/web/src/shared/lib/overlay/overlay.types.ts`
- EventEmitter → `apps/web/src/shared/lib/overlay/overlay.emitter.ts`
- 상태 리듀서 → `apps/web/src/shared/lib/overlay/overlay.reducer.ts`
- 렌더링 컨테이너 → `apps/web/src/shared/lib/overlay/OverlayProvider.tsx`

## 공용 UI

- `Input` (레이블/에러/아이콘) → `apps/web/src/shared/ui/input/Input.tsx`
- `TagGroup` (태그 목록, 편집 모드 지원) → `apps/web/src/shared/ui/tag/Tag.tsx`
- `TagPrimitive` (Headless) → `packages/ui/src/tag/tag.primitive.tsx`
- `Avatar` → `apps/web/src/shared/ui/Avatar.tsx`
- `Header` → `apps/web/src/components/layout/Header.tsx`

---

## 아키텍처 레이어

```
app/         → Next.js App Router (라우팅, API Route, 레이아웃)
widgets/     → 복합 UI 조합
features/    → 비즈니스 로직
entities/    → 도메인 모델, Repository
shared/      → 유틸, 공용 UI, API 클라이언트
```

## 주요 패턴

| 패턴            | 위치                                          |
| --------------- | --------------------------------------------- |
| Repository 패턴 | `entities/bookmark/api/`                      |
| Factory 패턴    | `features/bookmark/model/bookmark.service.ts` |
| Zustand 상태    | `entities/bookmark/model/useBookmarkStore.ts` |
| Overlay 시스템  | `shared/lib/overlay/`                         |

---

## 문서 (docs/)

- 개발 워크플로우 (브랜치 · CI · 테스트 · 배포) → `docs/development-workflow.md`

에이전트가 참조할 스펙 문서는 `docs/spec/` 아래에만 있다.

### 기획/스펙 (docs/spec/)

| 문서                                              | 내용                                                         |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `docs/spec/testing-strategy.md`                   | 테스트 전략 (단위/통합/E2E 체크리스트, 로드맵)               |
| `docs/spec/web/api.md`                            | 웹 API 스펙                                                  |
| `docs/spec/web/features.md`                       | 웹 기능 목록                                                 |
| `docs/spec/web/deployment.md`                     | 배포 설정                                                    |
| `docs/spec/extension/extension-browser-import.md` | 익스텐션 기획 (가져오기 탭 + 북마크 정리 탭) — **메인 스펙** |
| `docs/spec/extension/chrome-extension-plan.md`    | 익스텐션 초기 계획                                           |
| `docs/spec/extension/extension-auth-flow.md`      | 익스텐션 인증 흐름                                           |
| `docs/spec/extension/extension-import-tasks.md`   | 익스텐션 태스크 목록                                         |
| `docs/spec/architecture/architecture.md`          | 아키텍처 결정사항                                            |

### 구현 결정 기록 (docs/decisions/)

| 문서                                             | 내용                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `docs/decisions/026-iOS-input-자동줌-대응.md`    | iOS Safari input 자동 줌 대응 — 대안 4개 비교, 모바일 16px 하한 채택                                  |
| `docs/decisions/027-웹폰트-동적-서브셋-실측.md`  | Pretendard 도입 — 통파일(2,058kB) vs 동적 서브셋(457kB) 실측, 미들웨어 매처 버그 수정 포함            |
| `docs/decisions/028-RLS-스키마-드리프트-추적.md` | RLS 드리프트 포스트모템 — upsert×RLS 회귀, pg_policies 실측, update 타입 필드 누락까지 전체 체인 추적 |

### 개인 학습/포폴 (docs/personal/)

- 에이전트가 참조하지 않는 개인 학습 노트 및 포폴 어필용 문서
- `docs/personal/decisions/` — 구현 결정사항 학습 기록
