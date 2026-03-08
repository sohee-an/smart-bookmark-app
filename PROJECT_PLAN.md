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

| 기능                   | 설명                        | 상태      |
| ---------------------- | --------------------------- | --------- |
| URL 입력 → 자동 크롤링 | 메타데이터, 본문 추출       | 🔨 개발중 |
| AI 자동 요약           | OpenAI API 활용             | 🔨 개발중 |
| AI 자동 태깅           | 카테고리 자동 분류          | 🔨 개발중 |
| 시맨틱 서치            | 임베딩 + RAG 기반 의미 검색 | 🔨 개발중 |
| 비회원 저장            | localStorage (5개 제한)     | 🔨 개발중 |
| 회원 저장              | Supabase                    | 🔨 개발중 |
| 북마클릿 + PWA         | 브라우저에서 바로 저장      | ⏳ 예정   |

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

- **요약/태깅**: OpenAI API
- **시맨틱 서치**: OpenAI Embeddings + RAG

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

```
URL 입력
    ↓
크롤링 (본문 추출)
    ↓
AI 파이프라인 (비동기)
    ├── 요약 생성
    ├── 태그 추출
    └── 임베딩 생성
    ↓
저장
    ├── 비회원 → localStorage
    └── 회원 → Supabase
    ↓
시맨틱 서치
    └── 임베딩 유사도 기반 검색
```

---

## 7. AI 개발 워크플로우

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

## 8. 포트폴리오 어필 포인트

| 포인트            | 내용                               |
| ----------------- | ---------------------------------- |
| AI 기능 구현      | RAG, 임베딩, LLM API 직접 연동     |
| 풀스택            | Next.js + Spring Boot (예정)       |
| 아키텍처          | FSD + Headless + Repository 패턴   |
| AI 개발 도구 활용 | Claude Code + MCP + 오케스트레이션 |
| 모노레포          | pnpm + Turborepo                   |
| 확장성            | React Native 대응 구조             |

---

## 9. 향후 계획

- [ ] Spring Boot 백엔드 전환
- [ ] 대화형 북마크 (내 북마크에 질문하기)
- [ ] React Native 앱
- [ ] 팀 북마크 공유 기능

---

## 10. 지원 타켓

- LLM 기반 Agent UI 구현 경험 어필
- AI 개발 워크플로우 자동화 경험 어필
