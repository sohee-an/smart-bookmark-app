# SmartMark

> 저장만 하는 북마크에서, 언제든 꺼내 쓰는 지식 저장소로.

URL을 저장하면 AI가 자동으로 요약·태깅하고, 의미 기반(시맨틱) 검색으로 키워드가 달라도 원하는 콘텐츠를 바로 찾을 수 있는 북마크 앱.

---

## 주요 기능

| 기능               | 설명                                                         |
| ------------------ | ------------------------------------------------------------ |
| AI 자동 요약·태깅  | URL 저장 시 Gemini가 3줄 요약 + 태그 자동 생성               |
| 시맨틱 검색        | 임베딩 벡터 유사도 기반 의미 검색 (키워드 불일치여도 검색됨) |
| 즉각적인 UI 피드백 | AI 완료를 기다리지 않고 카드 즉시 표시, 상태별 UI 전환       |
| 비회원 체험        | localStorage 기반 5개 제한 체험, 로그인 시 무제한 전환       |
| 태그 필터링        | 복수 태그 선택 + URL 쿼리스트링 기반 상태 관리               |
| 북마크 편집        | 우측 슬라이드 패널에서 제목·태그 인라인 편집                 |

---

## 기술 스택

| 분류            | 기술                             |
| --------------- | -------------------------------- |
| 프레임워크      | Next.js 16 (App Router)          |
| 언어            | TypeScript strict                |
| 스타일          | Tailwind CSS v4                  |
| 서버 상태       | TanStack Query v5                |
| 클라이언트 상태 | Zustand v5 (UI 상태 전용)        |
| DB / Auth       | Supabase (PostgreSQL + pgvector) |
| AI 요약·태깅    | Gemini 2.5-flash                 |
| AI 임베딩       | gemini-embedding-001 (3072차원)  |
| 크롤링          | Cheerio                          |
| 폼 유효성       | React Hook Form + Zod            |
| 테스트          | Vitest + Playwright + Storybook  |
| 모노레포        | pnpm + Turborepo                 |
| 배포            | Vercel                           |

---

## 아키텍처

### Feature-Sliced Design (FSD)

```
smart-bookmark-app/
├── apps/
│   └── web/
│       └── src/
│           ├── app/           # App Router 레이아웃·페이지
│           ├── widgets/       # 복합 UI (RecentBookmarkSlider)
│           ├── features/      # 비즈니스 로직 (AddBookmarkOverlay, FilterBar)
│           ├── entities/      # 도메인 모델 + Repository (BookmarkCard, Store)
│           └── shared/        # 유틸, 공용 UI, API 클라이언트
└── packages/
    ├── ui/                    # Headless 공용 컴포넌트
    └── types/                 # 공통 타입
```

레이어 의존 방향: `app → widgets → features → entities → shared`

상위 레이어만 하위를 import할 수 있고 역방향은 금지. 레이어 경계 덕분에 Spring Boot 백엔드 전환이나 React Native 앱 추가 시 영향 범위가 Repository 구현체 하나로 좁혀진다.

### Repository 패턴

```
BookmarkRepository (interface)
  ├── LocalRepository      → localStorage (비회원, 5개 제한)
  └── SupabaseRepository   → Supabase (회원)
```

`BookmarkService` (Factory)가 세션 유무로 구현체를 동적 선택. 스토리지가 바뀌어도 상위 레이어 코드는 변경 없음.

### 서버 상태 관리 — TanStack Query v5

서버 상태(북마크 목록)와 클라이언트 UI 상태(선택된 북마크 ID)를 분리해 관리한다.

```
TanStack Query  →  서버 상태: 북마크 목록 캐싱, 낙관적 업데이트
Zustand         →  UI 상태: selectedBookmarkId (패널 열림/닫힘)
```

업데이트 시 낙관적 업데이트 → 실패 시 자동 롤백 패턴 적용:

```ts
onMutate: async ({ id, data }) => {
  await queryClient.cancelQueries({ queryKey: bookmarkKeys.all });
  const previousData = queryClient.getQueriesData<Bookmark[]>({ ... });
  queryClient.setQueriesData(..., old => old.map(b => b.id === id ? { ...b, ...data } : b));
  return { previousData };
},
onError: (_err, _vars, context) => {
  context?.previousData.forEach(([key, value]) => queryClient.setQueryData(key, value));
},
```

### 북마크 저장 파이프라인

```
URL 입력
  → DB 저장 (aiStatus: "crawling")  →  카드 즉시 표시
  → /api/crawl        Cheerio로 OG 메타 + 본문 추출
  → /api/ai-analyze   Gemini 2.5-flash로 3줄 요약 + 태그 생성  (aiStatus: "processing")
  → /api/embed        gemini-embedding-001로 3072차원 벡터 생성
  → DB 업데이트       (aiStatus: "completed")
```

AI 작업은 UI 차단 없이 백그라운드에서 순차 실행. 각 단계 완료 시 카드 UI가 실시간 업데이트됨.

---

## 기술적 도전

### 1. 시맨틱 서치 — 벡터 유사도 검색

단순 키워드 매칭 대신 **의미 기반 검색**을 구현했다.

- 북마크 저장 시 제목·요약을 `RETRIEVAL_DOCUMENT` 타입으로 3072차원 벡터 변환 → Supabase(pgvector) 저장
- 검색 시 쿼리를 `RETRIEVAL_QUERY` 타입으로 임베딩 → 코사인 유사도 비교
- 유사도 0.8 기준으로 **정확한 결과 / 연관된 결과** 섹션 분리 표시

```
"React 상태관리"로 검색
→ Zustand 아티클, Context API 비교 글도 검색됨 (키워드 불일치여도)
```

**PostgreSQL 시그니처 충돌 문제**: 태그 필터 파라미터(`p_tags text[]`) 추가 시 `CREATE OR REPLACE`만으로는 교체 불가 — PostgreSQL은 시그니처가 다르면 오버로드로 처리. 기존 함수를 먼저 `DROP`한 뒤 재생성해 해결.

**`SELECT DISTINCT` + `ORDER BY` 충돌**: `ORDER BY` 식이 `SELECT` 목록에 없으면 PostgreSQL이 에러를 던짐. DISTINCT를 제거하고 EXISTS 서브쿼리로 교체해 해결.

### 2. 태그 필터 + 시맨틱 서치 동시 적용

태그 필터를 클라이언트 후처리가 아닌 **DB 레벨에서 벡터 검색과 동시에 적용**했다.

```sql
-- match_bookmarks RPC
WHERE
  b.user_id = p_user_id
  AND 1 - (e.embedding <=> query_embedding) >= match_threshold   -- 벡터 필터
  AND (
    p_tags IS NULL
    OR EXISTS (                                                    -- 태그 필터 (OR)
      SELECT 1 FROM bookmark_tags bt
      JOIN tags t ON t.id = bt.tag_id
      WHERE bt.bookmark_id = b.id AND t.name = ANY(p_tags)
    )
  )
ORDER BY similarity DESC
LIMIT match_count;
```

키워드 검색 결과와 시맨틱 결과는 클라이언트에서 중복 제거 후 각 섹션에 표시한다.

### 3. SSRF 방어

크롤러 API에서 사용자 입력 URL을 그대로 요청하면 내부 네트워크 접근이 가능하다. 화이트리스트 기반 `validateSsrf` 유틸을 구현해 API Route 진입 시점에 차단한다.

- `localhost`, `127.0.0.1`, `0.0.0.0`, IPv6 루프백 차단
- Private IP 대역 (`10.x`, `172.16-31.x`, `192.168.x`) 차단
- `file://`, `ftp://` 등 비 HTTP 스킴 차단
- DNS Rebinding 방지: URL 파싱 후 실제 IP 재검증

### 4. Headless UI + 모노레포

`packages/ui`에 로직·상태만 담은 Headless 컴포넌트를 두고, 스타일은 `apps/web/src/shared/ui`에서 Tailwind로 입힌다. 추후 React Native 앱 추가 시 `packages/ui`는 공유하고 스타일 레이어만 교체하면 된다.

### 5. 전역 Overlay 시스템

EventEmitter 기반으로 컴포넌트 트리 바깥에서도 모달을 제어할 수 있다.

```typescript
overlay.open(({ isOpen, close }) => (
  <AddBookmarkOverlay isOpen={isOpen} onClose={close} />
))
```

Redux나 Context 없이 어느 레이어에서든 모달을 열고 닫을 수 있어 FSD 레이어 간 결합도를 낮춘다.

---

## 성능

### 즉각적인 UI 피드백

북마크 저장 시 AI 파이프라인 완료를 기다리지 않고 카드를 즉시 표시한다.

| aiStatus     | UI                         |
| ------------ | -------------------------- |
| `crawling`   | 스켈레톤 + 로더            |
| `processing` | 반투명 오버레이 + 로더     |
| `completed`  | 썸네일·요약·태그 완전 표시 |
| `failed`     | 에러 메시지                |

### 검색 성능

| 검색 종류   | 방식                         | 응답 속도 |
| ----------- | ---------------------------- | --------- |
| 키워드 검색 | 클라이언트 인메모리 필터링   | 즉시      |
| 태그 필터   | 클라이언트 인메모리 필터링   | 즉시      |
| 시맨틱 검색 | 서버 API → Supabase pgvector | ~1–2초    |

키워드·태그는 이미 로드된 TanStack Query 캐시 데이터를 필터링하므로 서버 왕복 없음. 시맨틱 검색 결과는 별도 섹션으로 비동기 렌더링해 키워드 결과 표시를 블로킹하지 않는다.

### 벡터 검색 최적화

- `match_threshold: 0.65` — 유사도 65% 미만을 DB 레벨에서 제거해 네트워크 전송량 축소
- `match_count: 10` — 최대 10개 제한
- pgvector HNSW 인덱스 (Supabase 기본 제공) — 전체 스캔 대비 검색 속도 대폭 개선

### Vercel Speed Insights

<img width="2064" height="1268" alt="Speed Insights" src="https://github.com/user-attachments/assets/53700d2c-9da1-4cbd-bc60-d10f839b5870" />

| 지표 | 수치  | 기준             |
| ---- | ----- | ---------------- |
| LCP  | 2.24s | Good (2.5s 이하) |
| CLS  | 0     | Perfect          |
| FID  | 1ms   | Perfect          |
| TTFB | 0.42s | Good             |
| RES  | 99점  | Great            |

---

## 로컬 실행

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp apps/web/.env.example apps/web/.env.local
# .env.local에 아래 키 입력:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
# SUPABASE_SERVICE_ROLE_KEY
# GEMINI_API_KEY

# 개발 서버
pnpm dev

# 테스트
pnpm test
```

---

## 향후 계획

- Spring Boot 3 + MyBatis + PostgreSQL 백엔드 전환 (Repository 구현체 교체만으로 가능)
- 대화형 북마크 — "저번에 저장한 React 최적화 글에서 뭐라고 했지?" AI가 내 북마크를 컨텍스트로 답변
- React Native 앱 — `packages/ui` Headless 공유, 스타일만 교체
- 북마클릿 + PWA — 브라우저에서 원클릭 저장
