# Smart Bookmark — 아키텍처

---

## 폴더 구조

```
apps/web/src/
├── pages/              # 라우팅 + API Routes
│   ├── index.tsx       # 메인 대시보드
│   ├── bookmarks.tsx   # 검색 전용 페이지
│   ├── login.tsx       # 로그인/회원가입
│   ├── landing.tsx     # 비회원 랜딩
│   └── api/
│       ├── crawl.ts          # URL 크롤링
│       ├── ai-analyze.ts     # AI 요약/태깅
│       ├── embed.ts          # 임베딩 생성
│       ├── semantic-search.ts # 시맨틱 검색
│       └── auth/callback.ts  # OAuth 콜백
├── components/
│   └── layout/Header.tsx
├── widgets/
│   └── bookmark/RecentBookmarkSlider.tsx
├── features/
│   └── bookmark/
│       ├── model/
│       │   ├── bookmark.service.ts   # Factory (Local/Supabase 선택)
│       │   └── filterBookmarks.ts   # 키워드+태그 필터
│       └── ui/
│           ├── AddBookmarkOverlay.tsx
│           ├── FilterBar.tsx
│           ├── TagFilter.tsx
│           ├── BookmarkList.tsx
│           └── SemanticResultSection.tsx
├── entities/
│   └── bookmark/
│       ├── model/
│       │   ├── types.ts             # Bookmark 타입 정의
│       │   └── useBookmarkStore.ts  # Zustand store
│       ├── api/
│       │   ├── bookmark.repository.ts    # 인터페이스
│       │   ├── local.repository.ts       # localStorage
│       │   ├── supabase.repository.ts    # Supabase
│       │   └── bookmark.types.db.ts      # DB 타입
│       ├── lib/bookmark.mapper.ts        # DB ↔ 앱 타입 변환
│       └── ui/
│           ├── BookmarkCard.tsx
│           └── BookmarkDetailPanel.tsx
└── shared/
    ├── api/supabase/
    │   ├── client.ts   # 브라우저 클라이언트
    │   └── server.ts   # API Routes 서버 클라이언트
    ├── lib/
    │   ├── overlay/    # 모달 시스템
    │   ├── storage.ts  # localStorage + cookie
    │   ├── guest.ts    # 게스트 ID 관리
    │   ├── validateUrl.ts
    │   └── api-response.ts
    └── ui/
        ├── input/Input.tsx
        ├── tag/Tag.tsx
        └── Avatar.tsx
```

---

## FSD 레이어 규칙

```
pages → widgets → features → entities → shared
```

상위 레이어만 하위 레이어를 import. 역방향 금지.

---

## 주요 패턴

### Repository 패턴

```
BookmarkRepository (interface)
  ├── LocalRepository      → localStorage (비회원)
  └── SupabaseRepository   → Supabase (회원)
```

`BookmarkService` (Factory)가 세션 여부를 보고 둘 중 하나를 반환.
백엔드가 Spring Boot로 바뀌어도 Repository 구현체만 교체하면 됨.

### Headless UI 패턴

```
packages/ui (로직, 상태)
  └── apps/web/src/shared/ui (스타일 적용)
```

React Native 앱 추가 시 `packages/ui`는 공유하고 스타일 레이어만 교체.

### Overlay 시스템

```typescript
overlay.open(({ isOpen, close }) => <MyModal isOpen={isOpen} onClose={close} />)
```

EventEmitter 기반. 어디서든 호출 가능.

---

## 데이터 흐름

### 북마크 저장

```
AddBookmarkOverlay
  → bookmarkService.addBookmark(url)
      → LocalRepository.save() or SupabaseRepository.save()
  → useBookmarkStore.addBookmark() (즉시 UI 반영)
  → /api/crawl → /api/ai-analyze → /api/embed (백그라운드)
  → bookmarkService.updateBookmark() (AI 결과 반영)
  → useBookmarkStore.updateBookmark()
```

### 검색

```
Header 검색창 엔터
  → router.push("/bookmarks?q=검색어")
  → bookmarks.tsx
      → filterBookmarks() (키워드 + 태그, 클라이언트)
      → /api/semantic-search (서버, 벡터 유사도)
  → BookmarkList + SemanticResultSection 렌더링
```

---

## 데이터베이스 스키마

```
bookmarks (id, user_id, url, title, summary, ai_status, status, thumbnail_url, ...)
    ↓ 1:1
embeddings (id, bookmark_id, embedding vector(3072))

bookmarks ↔ bookmark_tags ↔ tags (N:M)

auth.users ↔ public.users (1:1, OAuth 자동 생성)
```

### RPC 함수

```sql
match_bookmarks(
  query_embedding vector(3072),
  p_user_id uuid,
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 10,
  p_tags text[] DEFAULT NULL
)
-- 벡터 코사인 유사도 검색 + 태그 필터 (OR)
-- 유사도 내림차순 정렬
```

---

## 기술 스택

| 항목         | 기술                             |
| ------------ | -------------------------------- |
| 프레임워크   | Next.js (Pages Router)           |
| 언어         | TypeScript strict                |
| 스타일       | Tailwind CSS v4                  |
| 상태 관리    | Zustand                          |
| 폼 검증      | React Hook Form + Zod            |
| DB/Auth      | Supabase (PostgreSQL + pgvector) |
| AI 요약/태깅 | Gemini 2.5-flash                 |
| AI 임베딩    | gemini-embedding-001 (3072차원)  |
| 크롤링       | Cheerio                          |
| 모노레포     | pnpm + Turborepo                 |
| 배포         | Vercel                           |
| 이메일       | Resend (SMTP)                    |
