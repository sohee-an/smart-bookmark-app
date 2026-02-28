📚 AI Smart Bookmark

저장만 하는 북마크에서, 언제든 꺼내 쓰는 지식 저장소로

📌 프로젝트 소개
URL을 저장하는 순간, AI가 자동으로 내용을 요약하고 태그를 생성합니다.
"왜 저장했는지"를 기억하고, 필요한 순간에 꺼내 쓸 수 있는 스마트 북마크 서비스입니다.

✨ 주요 기능
① 스마트 북마크 수집 (Collector)

URL 자동 크롤링 — URL 입력 시 제목, 본문, 대표 이미지를 자동으로 수집
저장 메모 (Context) — "왜 저장하는지"에 대한 사용자 메모 입력 (리마인드의 핵심)

② AI 지능형 가공 (AI Processor)

자동 요약 — AI가 본문을 3줄 내외로 핵심 요약
자동 태깅 — 콘텐츠를 분석해 #개발, #레시피, #뉴스 등 태그 자동 생성
저장 의도 분석 — 메모와 본문을 조합해 보관 목적을 명시화

③ 지식 관리 및 탐색 (Management)

비주얼 카드 뷰 — 썸네일과 요약문이 포함된 카드 형태의 목록
시맨틱 검색 — "저번에 본 리액트 최적화 글"처럼 자연어로 검색
리마인드 큐레이션 — 저장 후 읽지 않은 글 중 현재 관심사와 유사한 글 추천

🛠 기술 스택
구분기술이유FrameworkNext.js (App Router)SSR을 통한 빠른 속도 및 API Routes 활용StylingTailwind CSS빠르고 일관된 UI 컴포넌트 제작DatabaseSupabase (PostgreSQL)실시간 DB 및 인증(Auth) 기능 제공AI 모델OpenAI API (GPT-4o)텍스트 요약 및 임베딩 처리ORMPrismaDB 스키마 관리 및 타입 안정성 확보

## 🏗️ 아키텍처 & 컴포넌트 설계

### 폴더 구조 — Feature-Sliced Design (FSD)

단순히 `components/`, `hooks/`를 모아두는 방식 대신,
기능(Feature) 단위로 관련 코드를 응집시켜 유지보수성을 높였습니다.

```
src/
├── features/
│   ├── bookmark/          # 북마크 CRUD, 카드 UI, 관련 hooks
│   └── ai-summary/        # AI 요약 요청, 결과 표시
├── shared/
│   ├── ui/                # 공통 Atom/Molecule 컴포넌트
│   └── hooks/             # 전역에서 쓰이는 hooks
└── pages/
```

---

### 컴포넌트 분류 — Atomic Design

재사용 컴포넌트는 Atomic Design 기준으로 분류해
컴포넌트의 역할과 의존 관계를 명확히 했습니다.

| 단계      | 예시                                      |
| --------- | ----------------------------------------- |
| Atoms     | Button, Input, Tag, Badge                 |
| Molecules | SearchBar, TagGroup                       |
| Organisms | BookmarkCard (Thumbnail + Summary + Tags) |
| Templates | 페이지 레이아웃 골격                      |

---

### 복잡한 UI 컴포넌트 — Headless + Compound Component

모달, 드롭다운처럼 로직이 복잡한 UI는
**Headless 패턴**으로 로직과 스타일을 분리하고,
**Compound Component 패턴**으로 유연한 조합이 가능하게 설계했습니다.

```tsx
// 사용 예시 — 필요한 조각만 골라서 조립
<Dropdown>
  <Dropdown.Trigger>옵션</Dropdown.Trigger>
  <Dropdown.List>
    <Dropdown.Item>수정</Dropdown.Item>
    <Dropdown.Item>삭제</Dropdown.Item>
  </Dropdown.List>
</Dropdown>
```

→ 스타일이 바뀌어도 로직을 건드리지 않아도 되고,
사용하는 쪽에서 구조를 자유롭게 조합할 수 있습니다.

🗺 페이지 구조
/ 메인 페이지 (서비스 소개 + 로그인)
/bookmarks 대시보드 (전체 목록, 필터, 검색)
/bookmarks/[id] 상세 페이지 (원본 링크, AI 요약, 메모 편집)

🗄 데이터베이스 스키마
prismamodel User {
id String @id @default(cuid())
email String @unique
createdAt DateTime @default(now())
bookmarks Bookmark[]
}

model Bookmark {
id String @id @default(cuid())
url String
title String
summary String // AI 생성 요약
content String // 본문 텍스트 (검색용)
userMemo String // 사용자 메모
thumbnailUrl String?
tags String[]
status String @default("unread") // unread | read
createdAt DateTime @default(now())
userId String
user User @relation(fields: [userId], references: [id])
}

🚀 개발 로드맵

Step 1 — 기초: Next.js 세팅 + DB 연결 + URL 저장 기능
Step 2 — 핵심: 본문 크롤링 + GPT API 연동 + 자동 요약 생성
Step 3 — 고급: 카드 UI 디자인 + 검색 및 필터링 고도화
Step 4 — 완성: 크롬 익스텐션 연동 또는 PWA 모바일 최적화

🏃 시작하기
bash# 의존성 설치
npm install

# 환경변수 설정

cp .env.example .env.local

# DB 마이그레이션

npx prisma migrate dev

# 개발 서버 실행

npm run dev
필요한 환경변수
envDATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
