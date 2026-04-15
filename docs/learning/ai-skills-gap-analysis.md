# AI 기술 역량 분석 — Smart Bookmark 포트폴리오 기준

> 작성일: 2026-04-04
> 분석 대상: Smart Bookmark 프로젝트 전체 코드베이스

---

## 1. 현재 구현된 AI 기법

### 1-1. Gemini API 기반 텍스트 생성

- **모델**: `gemini-2.5-flash`
- **용도**: URL에서 추출한 본문을 받아 제목, 3줄 요약, 태그 자동 생성
- **프롬프트 방식**: 단일 System 지시문 + JSON 응답 강제
- **JSON 추출**: 정규식 `/\{[\s\S]*\}/`으로 마크다운 코드블록 제거 후 파싱

### 1-2. 임베딩 + 시맨틱 서치

- **모델**: `gemini-embedding-001` (3072차원)
- **저장소**: Supabase pgvector
- **검색 알고리즘**: 코사인 유사도 (`<=>` 연산자)
- **임계값 분리**: `>= 0.80` 정확 결과 / `< 0.80` 연관 결과
- **TaskType 분리**: `RETRIEVAL_DOCUMENT` (저장) / `RETRIEVAL_QUERY` (검색)

### 1-3. 웹 크롤링 파이프라인

- **라이브러리**: Cheerio
- **메타데이터 추출**: OG 태그 우선, fallback 순서 처리
- **본문 청킹**: 3등분 분할 후 AI에 전달
- **재시도 로직**: 최대 3회, 1초 대기

### 1-4. 비동기 AI 파이프라인

- **클라이언트**: 크롤링 → AI 분석 → 임베딩 3단계 순차 처리
- **익스텐션**: `waitUntil`로 응답 즉시 반환 + 백그라운드 파이프라인 실행
- **상태 관리**: `aiStatus` enum으로 처리 단계 시각화
- **자동 갱신**: TanStack Query `refetchInterval`로 처리 중 3초 폴링

### 1-5. Realtime 구독

- Supabase Postgres Changes로 다른 기기/익스텐션 변경사항 실시간 반영

### 1-6. 보안 처리

- SSRF 방어 (크롤링 전 URL 검증)
- Bearer 토큰 기반 익스텐션 인증
- RLS(Row Level Security)로 사용자 데이터 격리

---

## 2. 현재 AI 트렌드 대비 부족한 부분

### 부족 항목 요약

| 항목                       | 현재 수준                | 트렌드 수준                                | 격차 |
| -------------------------- | ------------------------ | ------------------------------------------ | ---- |
| 프롬프트 엔지니어링        | 단일 프롬프트, JSON 강제 | Few-shot, Chain-of-Thought, 역할 분리      | ★★★  |
| 스트리밍 응답              | 없음 (완전 응답 수집)    | SSE/ReadableStream 스트리밍                | ★★★  |
| RAG 아키텍처               | 단순 벡터 검색만         | 검색 → 컨텍스트 주입 → LLM 답변 전체 구현  | ★★★  |
| AI 에이전트/오케스트레이션 | 없음                     | Tool Calling, Multi-step Agent             | ★★★★ |
| LLM 평가/모니터링          | 없음                     | 응답 품질 측정, 할루시네이션 감지          | ★★★  |
| 멀티모달                   | 없음                     | 이미지 → 텍스트 분석 (썸네일 기반 태깅 등) | ★★   |
| Function Calling           | 없음                     | 구조화된 도구 호출                         | ★★★  |
| 파인튜닝/Few-shot          | 없음                     | 도메인 특화 응답 품질 향상                 | ★★★★ |
| 비용/토큰 관리             | 없음                     | 입력 트리밍, 캐싱, 모델 티어 전환          | ★★   |
| 컨텍스트 압축              | 없음                     | 긴 문서 요약 후 재입력                     | ★★   |

---

## 3. AI 역량 향상 로드맵

> 난이도: ⭐ 입문 / ⭐⭐ 초급 / ⭐⭐⭐ 중급 / ⭐⭐⭐⭐ 고급 / ⭐⭐⭐⭐⭐ 전문가

---

### Level 1 — 현재 코드 품질 개선

#### 1. 프롬프트 엔지니어링 심화

**난이도: ⭐⭐**

현재 코드는 단일 지시문으로 JSON을 강제하는 수준이다. 실제 서비스에서는 응답 품질이 들쑥날쑥해질 수 있다.

**배울 것:**

- **Few-shot prompting**: 예시를 프롬프트에 포함시켜 형식 안정화
  ```
  예시 입력: "React 최적화 방법..."
  예시 출력: { "title": "React 렌더링 최적화 가이드", "tags": ["React", "성능"] }
  ```
- **Chain-of-Thought (CoT)**: "먼저 주제를 파악하고, 그 다음 요약하라"처럼 추론 단계 유도
- **System / User / Assistant 역할 분리**: 역할 프롬프트로 응답 일관성 향상
- **Output format 고정**: JSON Schema나 Zod 스키마를 프롬프트에 명시

**적용 포인트**: `apps/web/src/app/api/ai-analyze/route.ts`의 프롬프트 개선

---

#### 2. LLM 스트리밍 응답 처리

**난이도: ⭐⭐**

현재 Gemini API를 `generateContent()`로 호출해 완전 응답을 기다린다. 긴 요약 생성 시 사용자가 빈 화면을 수 초간 봐야 한다.

**배울 것:**

- `streamGenerateContent()` 사용법
- Next.js `Response` + `ReadableStream` 조합
- 클라이언트에서 `EventSource` 또는 `fetch` + `getReader()`로 스트리밍 수신
- 스트리밍 도중 에러 처리 패턴

**주의**: 구조화 JSON 응답(태그, 요약 동시 반환)은 스트리밍과 궁합이 나쁘다. 요약 스트리밍과 태그/제목 별도 요청으로 분리하는 설계 고민이 필요하다.

---

#### 3. 토큰 비용 최적화

**난이도: ⭐⭐**

현재 본문 2000자를 그대로 입력한다. 실제로 필요한 정보는 앞부분 500자 이내인 경우가 많다.

**배울 것:**

- 토큰 카운팅 API 활용 (`countTokens`)
- 입력 우선순위 설계: OG 태그 → 제목 → 첫 단락 → 본문 순으로 중요도 부여
- 모델 티어 전환: 요약/태그는 `flash`, 복잡한 질문은 `pro`로 분기
- Supabase의 `prompt_caching` 또는 Gemini의 캐싱 기능

---

### Level 2 — RAG 완성

#### 4. RAG (Retrieval-Augmented Generation) 완성

**난이도: ⭐⭐⭐**

현재 시맨틱 서치는 벡터 검색까지만 구현되어 있다. "진짜 RAG"는 검색 결과를 컨텍스트로 LLM에 다시 넣어 답변을 생성하는 것까지다.

**현재 구현:**

```
쿼리 → 임베딩 → 유사 북마크 목록 반환
```

**완전한 RAG:**

```
쿼리 → 임베딩 → 유사 북마크 검색 → 컨텍스트 조합 → LLM에 전달 → 자연어 답변 생성
```

**배울 것:**

- **청크 전략**: 문서를 어떻게 잘라서 임베딩할 것인가 (현재는 전체 요약만 임베딩)
  - 고정 크기 청킹 vs 문단 기반 vs 슬라이딩 윈도우
- **Reranker**: 벡터 검색 결과를 다시 LLM이 정렬 (BM25 + 벡터 하이브리드)
- **컨텍스트 윈도우 관리**: 검색된 문서를 얼마나 넣을 것인가
- **답변 품질 평가**: 검색된 컨텍스트와 답변의 연관성 측정

**이 프로젝트 적용 아이디어**: "내 북마크에서 Redux와 Zustand 차이를 설명해줘" 같은 대화형 질의응답

---

#### 5. 하이브리드 검색

**난이도: ⭐⭐⭐**

현재 시맨틱 검색과 키워드 검색이 완전히 분리되어 있다. 실제 서비스에서는 두 방식을 결합하면 검색 품질이 높아진다.

**배울 것:**

- **BM25**: 전통적 키워드 랭킹 알고리즘 (Supabase `pg_trgm` 또는 `tsvector`)
- **RRF (Reciprocal Rank Fusion)**: 두 검색 결과를 점수 기반으로 병합하는 알고리즘
- Supabase에서 `tsvector` + `vector` 동시 쿼리 구성

---

### Level 3 — AI 에이전트

#### 6. Function Calling / Tool Use

**난이도: ⭐⭐⭐**

LLM이 스스로 어떤 도구를 쓸지 결정하는 기능이다. 현재 코드는 파이프라인이 하드코딩되어 있다.

**배울 것:**

- Gemini `tools` 파라미터로 함수 스키마 정의
- LLM이 반환한 `function_call` 응답 파싱 및 실행
- 실행 결과를 다시 LLM에 전달하는 루프 구현
- 안전한 도구 실행: 파라미터 검증, 권한 확인

**예시 적용**: LLM이 "북마크 저장", "태그 검색", "요약 생성" 도구를 스스로 선택해 실행

---

#### 7. Multi-step Agent

**난이도: ⭐⭐⭐⭐**

여러 단계의 추론과 도구 호출을 연결하는 에이전트다. 이 프로젝트의 Claude Code + Notion MCP 워크플로우가 이 개념의 응용이다.

**배울 것:**

- **ReAct 패턴**: Reasoning → Action → Observation 반복 루프
- **Plan-and-Execute**: 먼저 계획 수립, 단계별 실행
- 상태 관리: 에이전트 실행 컨텍스트 유지
- 루프 탈출 조건: 무한 루프 방지 (max_steps, 성공 조건 감지)
- 에이전트 메모리: 단기(대화), 장기(외부 DB) 분리

**프레임워크 학습 순서**: LangChain.js → Vercel AI SDK agents → 직접 구현

---

#### 8. 멀티에이전트 오케스트레이션

**난이도: ⭐⭐⭐⭐⭐**

여러 에이전트가 협력하는 시스템이다. 이 프로젝트의 CLAUDE.md 개발 워크플로우 자체가 이 개념이다.

**배울 것:**

- **Orchestrator-Worker 패턴**: 매니저 에이전트가 하위 에이전트에게 작업 위임
- **병렬 에이전트**: 독립 작업을 동시에 실행
- 에이전트 간 통신: 메시지 큐, 공유 상태 스토어
- 실패 격리: 하위 에이전트 실패가 전체 시스템에 전파되지 않도록
- Human-in-the-loop: 사람이 개입해야 할 시점 감지

---

### Level 4 — 평가 및 모니터링

#### 9. LLM 출력 평가 (Evals)

**난이도: ⭐⭐⭐**

AI 응답이 좋은지 나쁜지 측정하는 방법이다. 현재는 사람이 눈으로 확인하는 것 외에 자동화된 평가가 없다.

**배울 것:**

- **자동 평가 지표**: BLEU, ROUGE (요약 품질), cosine similarity (의미 유사도)
- **LLM-as-a-Judge**: GPT/Claude로 다른 LLM의 출력을 평가
- **Hallucination 감지**: 원본 텍스트에 없는 내용이 요약에 포함됐는지 확인
- **A/B 테스트**: 프롬프트 버전별 품질 비교

**도구**: LangSmith, PromptFoo, Braintrust

---

#### 10. AI 모니터링 및 비용 추적

**난이도: ⭐⭐**

프로덕션에서 AI API 비용이 얼마나 쓰이는지, 어떤 요청이 느린지 추적하는 것이다.

**배울 것:**

- 토큰 사용량 로깅 (`usageMetadata.promptTokenCount`, `candidatesTokenCount`)
- 요청별 레이턴시 측정
- 비용 알림 설정 (월별 한도 초과 시 알림)
- LLM 호출 추적 (어떤 사용자가 어떤 요청을 했는지)

**도구**: LangFuse, Helicone, 자체 구현 미들웨어

---

### Level 5 — 고급 AI 기법

#### 11. 멀티모달 처리

**난이도: ⭐⭐⭐**

이미지를 텍스트로 분석하는 기능이다. 북마크의 썸네일을 분석해 태그를 추가하거나 내용을 보완할 수 있다.

**배울 것:**

- Gemini Vision API: 이미지 URL → 텍스트 분석
- 이미지 전처리: 크기 조정, 포맷 변환
- 텍스트 + 이미지 컨텍스트 결합 프롬프트
- 이미지 내 텍스트 추출(OCR) 활용

**적용 아이디어**: 썸네일 없는 URL에서 스크린샷을 찍어 시각적으로 태그 추출

---

#### 12. 파인튜닝 / 도메인 특화

**난이도: ⭐⭐⭐⭐**

일반 LLM을 특정 도메인(예: 기술 아티클 태깅)에 맞게 조정하는 것이다.

**배울 것:**

- **Few-shot in context**: 파인튜닝 없이 예시로 품질 향상 (지금 당장 적용 가능)
- **PEFT / LoRA**: 적은 데이터로 모델 미세 조정
- **Supervised Fine-tuning**: 레이블된 데이터셋 구성 방법
- 평가 데이터셋 구성: 실제 북마크 100개에 수동 태그 부착 후 비교

**현실적 접근**: 파인튜닝보다 Few-shot + 도메인 특화 프롬프트가 비용 대비 효율이 좋다.

---

#### 13. 벡터 검색 고도화

**난이도: ⭐⭐⭐**

현재 구현은 기본적인 코사인 유사도 검색이다. 실제 서비스에서 데이터가 많아지면 성능과 품질 모두 개선이 필요하다.

**배울 것:**

- **청킹 전략 비교**: 문서 전체 임베딩 vs 문단별 임베딩 (현재는 전체 요약)
- **HNSW vs IVFFlat 인덱스**: 데이터 규모별 최적 인덱스 선택 (현재 코드에 주석 처리됨)
- **Matryoshka Embeddings**: 차원 축소로 저장 비용 절감
- **임베딩 업데이트 전략**: 북마크 편집 시 임베딩 재생성 여부 판단

---

## 4. 우선순위 추천 로드맵

```
지금 바로 →  프롬프트 엔지니어링 (Few-shot, CoT)
             토큰 비용 최적화
             LLM 스트리밍 응답

1-2개월 →   RAG 완성 (검색 → 컨텍스트 주입 → 답변)
             Function Calling 구현
             LLM 출력 평가 도입

3-6개월 →   Multi-step Agent 구현
             하이브리드 검색 (BM25 + 벡터)
             멀티모달 처리

장기 →      멀티에이전트 오케스트레이션
             파인튜닝 실험
```

---

## 5. 포트폴리오 관점 어필 포인트

현재 구현으로도 어필 가능한 것:

- 임베딩 + 벡터 DB + 시맨틱 검색 End-to-End 구현
- 비동기 AI 파이프라인 (waitUntil 패턴)
- 상태 기반 AI 처리 시각화
- Repository 패턴으로 AI 결과 저장 추상화

추가하면 차별화되는 것:

- **RAG 대화형 질의응답** → "내 북마크에서 Redux 관련 내용 알려줘"
- **LLM Evals 구축** → 프롬프트 개선 전후 품질 수치로 증명
- **Function Calling 기반 에이전트** → 사용자 의도에 따라 도구를 스스로 선택

---

---

## 6. 레퍼런스

### 프롬프트 엔지니어링

| 자료                      | 형태      | 링크                                                       | 핵심 내용                                   |
| ------------------------- | --------- | ---------------------------------------------------------- | ------------------------------------------- |
| Prompt Engineering Guide  | 문서      | https://www.promptingguide.ai/kr                           | Few-shot, CoT, ReAct 등 전 기법 한국어 정리 |
| Anthropic Prompt Library  | 공식      | https://docs.anthropic.com/en/prompt-library               | 실전 프롬프트 예시 모음                     |
| OpenAI Prompt Engineering | 공식      | https://platform.openai.com/docs/guides/prompt-engineering | GPT 기준이지만 기법은 공통 적용 가능        |
| Learn Prompting           | 무료 강의 | https://learnprompting.org                                 | 기초부터 고급까지 단계별                    |

### RAG & 임베딩

| 자료                               | 형태   | 링크                                                         | 핵심 내용                                 |
| ---------------------------------- | ------ | ------------------------------------------------------------ | ----------------------------------------- |
| LlamaIndex 공식 docs               | 문서   | https://docs.llamaindex.ai                                   | RAG 파이프라인 설계 패턴의 표준 레퍼런스  |
| Pinecone — What is RAG             | 아티클 | https://www.pinecone.io/learn/retrieval-augmented-generation | RAG 개념부터 구현까지 실용적 설명         |
| Supabase pgvector 가이드           | 공식   | https://supabase.com/docs/guides/ai/vector-columns           | 현재 프로젝트 스택과 동일, 바로 적용 가능 |
| Chunking Strategies (Greg Kamradt) | 유튜브 | https://www.youtube.com/watch?v=8OJC21T2SL4                  | 청킹 전략별 성능 비교 실험 영상           |

### 에이전트 & Function Calling

| 자료                      | 형태           | 링크                                                         | 핵심 내용                              |
| ------------------------- | -------------- | ------------------------------------------------------------ | -------------------------------------- |
| Building effective agents | Anthropic 공식 | https://www.anthropic.com/research/building-effective-agents | 에이전트 설계 철학 원문. 필독          |
| Gemini Function Calling   | 공식           | https://ai.google.dev/gemini-api/docs/function-calling       | 현재 프로젝트 스택(Gemini) 기준 적용법 |
| LangGraph 공식            | 문서           | https://langchain-ai.github.io/langgraphjs                   | 상태 기계 기반 에이전트 설계           |
| AutoGen (Microsoft)       | GitHub         | https://github.com/microsoft/autogen                         | 멀티에이전트 오케스트레이션 프레임워크 |

### LLM 평가 (Evals)

| 자료                   | 형태     | 링크                                                       | 핵심 내용                           |
| ---------------------- | -------- | ---------------------------------------------------------- | ----------------------------------- |
| PromptFoo              | 오픈소스 | https://www.promptfoo.dev                                  | 프롬프트 A/B 테스트, 자동 평가 도구 |
| LangSmith              | 도구     | https://www.langchain.com/langsmith                        | LLM 호출 추적 + 평가                |
| Braintrust             | 도구     | https://www.braintrustdata.com                             | Evals 전용 플랫폼                   |
| Anthropic Evals 가이드 | 공식     | https://docs.anthropic.com/en/docs/build-with-claude/evals | Claude 기준 평가 설계 방법          |

### 벡터 검색 고도화

| 자료                               | 형태     | 링크                                             | 핵심 내용                        |
| ---------------------------------- | -------- | ------------------------------------------------ | -------------------------------- |
| pgvector 공식                      | GitHub   | https://github.com/pgvector/pgvector             | HNSW vs IVFFlat 인덱스 선택 기준 |
| Weaviate — Vector Search Explained | 아티클   | https://weaviate.io/blog/vector-search-explained | 벡터 검색 원리 시각적 설명       |
| Hybrid Search (BM25 + 벡터)        | Weaviate | https://weaviate.io/blog/hybrid-search-explained | BM25와 벡터 결합 방법            |

---

_이 문서는 2026-04-04 기준 코드베이스 분석 결과입니다._
