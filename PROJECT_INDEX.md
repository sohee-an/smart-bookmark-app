# Project Index — 키워드 → 파일 맵

> Claude가 핀포인트로 파일을 찾기 위한 인덱스.
> 새 파일 추가/삭제 시 반드시 업데이트할 것.

---

## 크롤링

- `CrawlResult`, `CrawlerErrorCode`, `CrawlerService` → `apps/web/src/server/services/crawler.service.ts`
- 크롤링 전용 API Route → `apps/web/src/pages/api/crawl.ts`

## AI 분석

- `AIAnalysisResult`, `AIService` → `apps/web/src/server/services/ai.service.ts`
- AI 분석 전용 API Route → `apps/web/src/pages/api/ai-analyze.ts`

## 북마크 타입

- `Bookmark`, `AIStatus`, `BookmarkStatus` → `apps/web/src/entities/bookmark/model/types.ts`
- DB 레이어 타입 `BookmarkRow`, `CreateBookmarkRequest`, `BookmarkFilter` → `apps/web/src/entities/bookmark/api/bookmark.types.db.ts`

## 북마크 저장/조회

- `BookmarkService` (Factory, Local/Supabase 동적 선택) → `apps/web/src/features/bookmark/model/bookmark.service.ts`
- `BookmarkRepository` 인터페이스 → `apps/web/src/entities/bookmark/api/bookmark.repository.ts`
- `LocalRepository` (localStorage, 비회원 5개 제한) → `apps/web/src/entities/bookmark/api/local.repository.ts`
- `SupabaseBookmarkRepository` (회원) → `apps/web/src/entities/bookmark/api/supabase.repository.ts`
- `BookmarkMapper` (DB ↔ 앱 타입 변환) → `apps/web/src/entities/bookmark/lib/bookmark.mapper.ts`

## 북마크 상태 관리

- `useBookmarkStore` (Zustand) → `apps/web/src/entities/bookmark/model/useBookmarkStore.ts`

## 북마크 UI

- `BookmarkCard` → `apps/web/src/entities/bookmark/ui/BookmarkCard.tsx`
- `BookmarkDetailPanel` (우측 슬라이드 상세 패널, 뷰/편집 모드) → `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx`
- `AddBookmarkOverlay` (URL + 메모 입력 모달) → `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx`
- `RecentBookmarkSlider` → `apps/web/src/widgets/bookmark/RecentBookmarkSlider.tsx`

## 인증

- 인증 미들웨어 (비회원→랜딩, 회원→메인) → `apps/web/src/middleware.ts`
- Supabase 클라이언트 → `apps/web/src/shared/api/supabase.ts`
- 로그인/회원가입 Zod 스키마 → `apps/web/src/features/auth/model/auth-schema.ts`

## 페이지 라우팅

- 메인 대시보드 → `apps/web/src/pages/index.tsx`
- 랜딩 (비회원) → `apps/web/src/pages/landing.tsx`
- 로그인 → `apps/web/src/pages/login.tsx`
- 앱 진입점 → `apps/web/src/pages/_app.tsx`

## 공용 유틸

- URL 유효성 검사 → `apps/web/src/shared/lib/validateUrl.ts`
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
pages/       → 라우팅 전용
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
