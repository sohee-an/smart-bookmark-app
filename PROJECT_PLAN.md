# 📌 Smart Bookmark — 프로젝트 기획안

## 1. 프로젝트 개요

URL을 저장하면 AI가 자동으로 요약, 태깅, 의미 기반 검색을 해주는 북마크 앱.

**핵심 차별점**: 단순 키워드 검색이 아닌 **시맨틱 서치(임베딩 기반)** — "React 최적화"를 검색하면 관련 의미를 가진 글도 함께 검색됨.

---

## 2. 타겟 유저

- **1차 타겟**: 개발자 (기술 아티클, 문서 정리)
- **2차 타겟**: 지식 관리가 필요한 일반 사용자

---

## 3. 핵심 기능

### Phase 1 — 포트폴리오 MVP (현재)

| 기능                   | 설명                                    | 상태      |
| ---------------------- | --------------------------------------- | --------- |
| URL 입력 → 자동 크롤링 | 메타데이터, 본문 추출                   | ✅ 완료   |
| AI 자동 요약           | Gemini API 활용                         | ✅ 완료   |
| AI 자동 태깅           | 카테고리 자동 분류                      | ✅ 완료   |
| 북마크 상세 보기       | 우측 슬라이드 패널, 제목/태그 편집      | ✅ 완료   |
| 비회원 저장            | localStorage (5개 제한)                 | ✅ 완료   |
| 회원 저장              | Supabase                                | ✅ 완료   |
| 태그 필터링            | 태그 클릭 → `/bookmarks?tag=React` 이동 | 🔨 개발중 |
| 키워드 검색            | 제목/설명 텍스트 매칭                   | 🔨 개발중 |
| 시맨틱 서치            | 임베딩 + 벡터 유사도 기반 의미 검색     | 🔨 개발중 |
| 북마클릿 + PWA         | 브라우저에서 바로 저장                  | ⏳ 예정   |

### Phase 2 — 차별점 강화 (Raindrop 대비)

| 기능              | 설명                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| 대화형 북마크     | "저번에 저장한 React 최적화 글에서 뭐라고 했지?" AI가 내 북마크 전체를 컨텍스트로 답변 |
| AI 오케스트레이션 | 매니저 AI → 태스크 분해 → 검수 → Notion 자동 생성                                      |

---

## 4. 기술 스택

### Frontend

- **Framework**: Next.js (Pages Router)
- **Language**: TypeScript (strict)
- **Style**: Tailwind CSS
- **State**: Zustand
- **Architecture**: FSD (Feature-Sliced Design)

### Backend

- **현재**: Supabase (Auth + DB)
- **예정**: Spring Boot 3 + MyBatis + PostgreSQL
- **패턴**: Repository 패턴으로 백엔드 교체 가능하게 추상화

### AI

- **요약/태깅**: Gemini API
- **시맨틱 서치**: OpenAI Embeddings + 벡터 유사도 검색

### 인프라

- **모노레포**: pnpm + Turborepo
- **배포**: AWS EC2 + Nginx

---

## 5. 아키텍처

```
smart-bookmark/
├── apps/
│   └── web/          # Next.js 메인 앱
│       └── src/
│           ├── shared/    # Atoms, 유틸, Hooks
│           ├── entities/  # 도메인 엔티티, Repository
│           ├── features/  # 비즈니스 로직
│           ├── widgets/   # 복합 UI
│           └── pages/     # 라우팅 전용
└── packages/
    ├── ui/            # 공통 UI (Headless)
    └── types/         # 공통 타입
```

**FSD 레이어 규칙**: `pages → widgets → features → entities → shared` (역방향 import 금지)

---

## 6. 데이터 흐름

### 북마크 저장 파이프라인

```
URL 입력
    ↓
DB 저장 (aiStatus: "crawling") → 카드 즉시 표시
    ↓
크롤링 (본문 추출)
    ↓ aiStatus: "processing"
AI 파이프라인 (비동기)
    ├── 요약 생성
    ├── 태그 추출
    └── 임베딩 생성
    ↓ aiStatus: "completed"
저장
    ├── 비회원 → localStorage
    └── 회원 → Supabase
```

### 검색 흐름

```
검색창 입력 / 태그 클릭
    ↓
/bookmarks 페이지로 이동 (URL 쿼리스트링)
    ↓
    ├── 태그 필터    → DB에서 태그 기준 조회
    ├── 키워드 검색  → 제목/설명 텍스트 매칭
    └── 시맨틱 검색  → 임베딩 벡터 유사도 계산
            ↓
    결과 섹션 분리
    ├── 정확한 결과 (similarity >= 0.80)
    └── 연관된 결과 (similarity < 0.80)
```

---

## 7. 검색 & 필터링 상세 기획

### 페이지 구조

| 페이지       | 역할                                       |
| ------------ | ------------------------------------------ |
| `/`          | 최근 북마크 슬라이더 + 전체 목록 요약      |
| `/bookmarks` | 검색 + 태그 필터링 + 시맨틱 서치 통합 제공 |

메인(`/`)에서 태그를 클릭하면 `/bookmarks?tag=React`로 이동해 필터된 결과를 보여준다.

### URL 구조

```
/bookmarks                                      # 전체 목록
/bookmarks?tag=React                            # 태그 단일 필터
/bookmarks?tag=React&tag=Next.js                # 태그 다중 필터
/bookmarks?q=리액트+상태관리                    # 키워드 검색
/bookmarks?q=리액트+상태관리&mode=semantic      # 시맨틱 검색
/bookmarks?q=상태관리&tag=React&mode=semantic   # 태그 + 시맨틱 조합
```

URL 쿼리스트링으로 상태 관리 → 링크 공유 가능, 뒤로가기 정상 동작.

### UI 구조

```
[검색창_______________________] [시맨틱 ON/OFF]
[#React ×] [#Next.js ×]           ← 선택된 태그 뱃지 (클릭으로 해제)
──────────────────────────────────────────────

# 키워드 검색 결과
검색 결과 12개
│ 북마크 카드
│ 북마크 카드
│ ...

# 시맨틱 검색 결과 (mode=semantic 시)
── 정확한 결과 ─────────────────
│ 북마크 카드 (similarity >= 0.80)
│ 북마크 카드
│ ...

── 연관된 결과 ─────────────────
│ 북마크 카드 (similarity < 0.80)
│ 북마크 카드
│ ...
```

### 검색 종류별 동작

| 검색 종류   | 트리거                       | 동작                                        |
| ----------- | ---------------------------- | ------------------------------------------- |
| 태그 필터   | 태그 클릭                    | 태그 기준 필터링, 뱃지 표시, 복수 선택 가능 |
| 키워드 검색 | 검색창 입력                  | 제목/설명 텍스트 매칭                       |
| 시맨틱 검색 | 검색창 입력 + 시맨틱 토글 ON | 벡터 유사도 기반 검색, 정확/연관 섹션 분리  |

### 시맨틱 결과 분리 로직

```typescript
const THRESHOLD = 0.8; // 추후 실데이터 기반 튜닝 (0.75 ~ 0.85 권장)

const exact = results.filter((r) => r.similarity >= THRESHOLD);
const related = results.filter((r) => r.similarity < THRESHOLD);
```

### FSD 작업 범위

```
pages/
  bookmarks.tsx                         # 쿼리스트링 읽기, 필터 적용

features/
  bookmark/
    ui/
      TagFilter.tsx                     # 선택된 태그 뱃지 + 제거 버튼
      SearchBar.tsx                     # 검색창 + 시맨틱 토글
      BookmarkList.tsx                  # 결과 목록 렌더링
      SemanticResultSection.tsx         # 정확한 결과 / 연관 결과 섹션

entities/
  bookmark/
    model/
      useBookmarkSearch.ts              # 검색 상태 관리 (쿼리, 태그, 모드)
      filterByTag.ts                    # 태그 필터링 로직
      splitByThreshold.ts              # 시맨틱 결과 분리 로직

shared/
  api/
    searchBookmarks.ts                  # 키워드 검색 API 호출
    semanticSearch.ts                   # 벡터 검색 API 호출
```

### 미결 사항

- [ ] threshold 값 실데이터 기반 튜닝
- [ ] 태그 + 시맨틱 동시 사용 시 우선순위 정의
- [ ] 검색 결과 없을 때 빈 상태(empty state) UI
- [ ] 시맨틱 검색 로딩 상태 처리 (키워드보다 느림)

---

## 8. AI 개발 워크플로우

Claude Code + Notion MCP 기반 오케스트레이션:

```
Notion에 할일 작성
        ↓
Claude Code가 Notion MCP로 읽어옴
        ↓
CLAUDE.md 룰 기반으로 FSD 태스크 분해
        ↓
개발자 검수/승인 (Human in the loop)
        ↓
개발 → 코드 리뷰 자동화 → PR 자동 생성
```

---

## 9. 포트폴리오 어필 포인트

| 포인트            | 내용                               |
| ----------------- | ---------------------------------- |
| AI 기능 구현      | RAG, 임베딩, LLM API 직접 연동     |
| 풀스택            | Next.js + Spring Boot (예정)       |
| 아키텍처          | FSD + Headless + Repository 패턴   |
| AI 개발 도구 활용 | Claude Code + MCP + 오케스트레이션 |
| 모노레포          | pnpm + Turborepo                   |
| 확장성            | React Native 대응 구조             |

---

## 10. 향후 계획

- [ ] Spring Boot 백엔드 전환
- [ ] 대화형 북마크 (내 북마크에 질문하기)
- [ ] React Native 앱
- [ ] 팀 북마크 공유 기능

---

## 11. 지원 타켓

- LLM 기반 Agent UI 구현 경험 어필
- AI 개발 워크플로우 자동화 경험 어필

---

# 백로그 (나중에 할 것들)

> 지금 당장 안 해도 되지만 나중에 추가하면 좋은 것들.

## 1. Notion Webhook 자동화

**왜 나중으로 미뤘나**
지금은 체크박스 수동 클릭으로 충분. 파이프라인 검증이 먼저.

**하려는 것**
댓글 달면 체크박스가 자동으로 업데이트되게 자동화.

```
사람이 댓글 달기
        ↓
Notion webhook 이벤트 발생
        ↓
Claude가 그 페이지만 읽고 판단
        ↓
시나리오 검수 댓글  →  시나리오검수=true 자동
방향 A 선택 댓글   →  선택방향=A 자동
```

**구현 시 필요한 것**

- Notion webhook 설정
- 댓글 키워드 정의 (예: "확인완료", "LGTM", "방향A")
- webhook 수신 서버 (또는 Claude Code hook으로 처리)

**주의할 점**

- webhook은 변화된 페이지만 이벤트로 날아옴 (전체 체크 아님)
- 키워드 애매하면 오작동 가능 → 키워드 명확하게 정의할 것

---

## 2. 태스크 간 의존성 시각화

Notion에서 태스크 간 의존 관계를 시각적으로 보여주는 뷰 추가.
현재는 기획서 + 아키텍처로 AI가 자동 판단하지만, 사람이 보기 편하게 관계형 속성으로도 표시.

---

## 3. 실패 패턴 분석

에스컬레이션된 태스크들의 실패 패턴을 분석해서 CLAUDE.md Rules에 자동으로 추가.

```
반복 실패 패턴 감지
        ↓
"이런 경우에는 이렇게 하지 말 것" 자동 추가
        ↓
다음 태스크부터 같은 실수 방지
```
