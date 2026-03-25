# Smart Bookmark — 구현된 기능 목록

> 현재 구현된 기능 전체 목록. 파일 위치 포함.

---

## 요약

| 기능              | 상태 | 비고                           |
| ----------------- | ---- | ------------------------------ |
| URL 저장 (비회원) | ✅   | localStorage, 5개 제한         |
| URL 저장 (회원)   | ✅   | Supabase                       |
| 자동 크롤링       | ✅   | Cheerio, 3회 재시도            |
| AI 요약           | ✅   | Gemini 2.5-flash               |
| AI 자동 태깅      | ✅   | Gemini 2.5-flash               |
| 임베딩 생성       | ✅   | gemini-embedding-001, 3072차원 |
| 키워드 검색       | ✅   | 제목/요약/태그 텍스트 매칭     |
| 태그 필터링       | ✅   | 다중 선택, URL 쿼리스트링      |
| 시맨틱 검색       | ✅   | 벡터 유사도, 정확/연관 분리    |
| 북마크 상세 보기  | ✅   | 우측 슬라이드 패널             |
| 북마크 편집       | ✅   | 제목/태그 수정                 |
| 로그인/회원가입   | ✅   | Supabase Auth, 이메일 인증     |
| 다크 모드         | ✅   | 전체 지원                      |
| 반응형            | ✅   | 모바일~데스크톱                |

---

## 1. 인증

**파일**: `pages/login.tsx`, `features/auth/model/auth-schema.ts`, `middleware.ts`

- 이메일/비밀번호 로그인 및 회원가입
- React Hook Form + Zod 유효성 검사
- 회원가입 후 이메일 인증 대기 화면 (session null 감지)
- 로그인 시 이메일 미인증 에러 메시지 처리
- 비회원 게스트 모드 (`is_guest` 쿠키)
- OAuth 콜백: `pages/api/auth/callback.ts`
- 미들웨어 라우트 보호:
  - 인증 O + `/landing`, `/login` → `/` 리다이렉트
  - 인증 X + 메인 페이지 → `/landing` 리다이렉트

---

## 2. 북마크 저장 파이프라인

**파일**: `features/bookmark/ui/AddBookmarkOverlay.tsx`, `pages/api/crawl.ts`, `pages/api/ai-analyze.ts`, `pages/api/embed.ts`

```
URL 입력
  → DB 저장 (aiStatus: "crawling") → 카드 즉시 표시
  → 크롤링 (Cheerio, OG 메타 + 본문 추출)
  → aiStatus: "processing"
  → AI 분석 (요약 + 태그 생성, Gemini 2.5-flash)
  → 임베딩 생성 (gemini-embedding-001, 3072차원)
  → aiStatus: "completed"
```

- 비회원: localStorage 저장 (5개 초과 시 차단)
- 회원: Supabase 저장
- 각 단계 실패 시 `aiStatus: "failed"` 처리

---

## 3. 검색 및 필터링

**파일**: `pages/bookmarks.tsx`, `features/bookmark/model/filterBookmarks.ts`, `pages/api/semantic-search.ts`

### 키워드 검색

- 제목, 요약, 태그에서 대소문자 무시 텍스트 매칭
- URL 쿼리스트링: `?q=검색어`

### 태그 필터

- 다중 선택 가능 (OR 조건)
- URL 쿼리스트링: `?tag=React&tag=Next.js`
- 선택된 태그 뱃지 표시 + X 버튼 제거
- 카드 태그 클릭, FilterBar 드롭다운에서 선택 가능

### 시맨틱 검색

- 검색어를 임베딩으로 변환 → Supabase RPC `match_bookmarks` 호출
- 태그 필터 동시 적용 (DB 레벨)
- 유사도 0.8 기준으로 정확한 결과 / 연관된 결과 분리
- 키워드 검색 결과와 중복 제거 후 표시
- `match_threshold: 0.65`, `match_count: 10`

---

## 4. 북마크 목록 및 상세

**파일**: `entities/bookmark/ui/BookmarkCard.tsx`, `entities/bookmark/ui/BookmarkDetailPanel.tsx`

### BookmarkCard

- 썸네일 / 도메인명 표시 (썸네일 없을 시)
- aiStatus별 상태 표시:
  - `crawling`: 로더
  - `processing`: 반투명 오버레이 + 로더
  - `failed`: 에러 메시지
- unread 배지, 읽음 점 표시
- 태그 (최대 2개 표시, 초과 시 +N 뱃지)
- 클릭 시 상세 패널 오픈

### BookmarkDetailPanel (우측 슬라이드 패널)

- 뷰 모드: 썸네일, 제목, URL, 요약, 태그 표시
- 편집 모드: 제목, 태그 수정 가능
- 태그 클릭 → 필터 추가 + 패널 닫힘
- 배경 클릭 / X 버튼으로 닫기

---

## 5. 필터 바

**파일**: `features/bookmark/ui/FilterBar.tsx`, `components/layout/Header.tsx`

- 헤더에 항상 표시 (모든 페이지)
- 탭 구조:
  - **최근**: 마지막 저장 5개 북마크의 태그
  - **자주 쓰는**: 전체 북마크 태그 빈도순 top 10
  - **전체**: 알파벳순 전체 태그
- 태그 클릭: 선택/해제 토글
- 선택된 태그 수 뱃지 표시
- 외부 클릭 시 닫기

---

## 6. 메인 대시보드

**파일**: `pages/index.tsx`, `widgets/bookmark/RecentBookmarkSlider.tsx`

- 최근 북마크 가로 슬라이더 (CSS snap 스크롤)
- 북마크 카드 그리드 목록
- 태그 클릭 → `/bookmarks?tag=` 이동

---

## 7. 헤더

**파일**: `components/layout/Header.tsx`

- 글로벌 검색창 (포커스 시 `/bookmarks`로 이동)
- 필터 버튼 (항상 표시)
- 북마크 추가 버튼 (AddBookmarkOverlay)
- 유저 메뉴 (회원/게스트/비로그인 상태별)
- 모바일: 검색 + 필터 별도 행
