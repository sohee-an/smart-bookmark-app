# Crawler & AI Service 설계

> 북마크 저장 시 URL을 분석하는 서버 사이드 서비스 설계 기록

---

## 전체 흐름

```
사용자가 URL 저장
  ↓
save() → { aiStatus: 'crawling' } 즉시 저장 → 카드 즉시 표시
  ↓
/api/crawl       → CrawlerService.crawl()   크롤링 (최대 3회 재시도, SSRF 검증)
  ↓ (aiStatus: 'processing')
/api/ai-analyze  → AIService.analyze()       Gemini 요약 + 태그 (Zod 검증)
  ↓
/api/embed       → 임베딩 생성 (시맨틱 검색용)
  ↓
update() → { aiStatus: 'completed', title, summary, tags }
```

---

## 파일 위치

```
app/api/
  ├── crawl/route.ts        ← 크롤링 라우터 (요청/응답만)
  ├── ai-analyze/route.ts   ← AI 분석 라우터
  └── embed/route.ts        ← 임베딩 라우터
server/services/
  ├── crawler.service.ts    ← 크롤링 로직
  └── ai.service.ts         ← AI 호출 로직 (Gemini)
```

App Router에서는 라우트가 `route.ts` 파일 규칙이라, 서비스 로직을 `app/` 밖(`server/services/`)에 두면 라우트로 오인될 일이 없다. (pages 라우터 시절엔 `pages/api` 안의 모든 파일이 엔드포인트로 인식돼 `_` 접두어로 회피해야 했지만, App Router에선 불필요.)

---

## 단일 책임 원칙 적용

```
crawler.service.ts → 크롤링 결과만 반환 (성공/실패)
ai.service.ts      → AI 분석 결과만 반환
route.ts           → 결과로 뭘 할지 결정 (재시도, 실패 처리, 응답)
```

각 서비스는 자신의 역할만 해요. 판단은 라우트 핸들러(route.ts)가 해요.

---

## CrawlerService

### 핵심 설계

**재시도 패턴 (재귀 호출)**

```ts
async crawl(url: string, attempt: number = 1): Promise<CrawlResult> {
  try {
    // 크롤링 시도
  } catch {
    return this.handleRetry(url, attempt, "UNKNOWN_ERROR")
  }
}

private async handleRetry(url, attempt, errorCode) {
  if (attempt < this.MAX_RETRIES) {
    await sleep(1000)  // 1초 대기
    return this.crawl(url, attempt + 1)  // 재귀 호출
  }
  // 3회 모두 실패 → manual_required 반환
}
```

`crawl → handleRetry → crawl → handleRetry` 순서로 재귀 호출돼요.

**Exponential Backoff**

```ts
await new Promise((resolve) => setTimeout(resolve, 1000));
```

재시도 전에 잠깐 기다리는 것. 서버에 부담을 줄여요.
더 정교하게 하려면 시도마다 대기 시간을 늘려요.

```ts
await sleep(1000 * attempt); // 1초, 2초, 3초
```

**에러 코드 분리**

```ts
type CrawlerErrorCode = "FETCH_FAILED" | "TITLE_NOT_FOUND" | "UNKNOWN_ERROR";
```

```
FETCH_FAILED    → URL을 열 수 없음 (잘못된 URL, 404 등)
TITLE_NOT_FOUND → 페이지는 열렸는데 제목이 없음
UNKNOWN_ERROR   → 예상치 못한 에러
```

process-url.ts에서 에러 코드별로 다른 메시지를 보여줄 수 있어요.

**og 태그 우선순위**

```ts
const title =
  $('meta[property="og:title"]').attr("content") || // og 태그 먼저
  $("title").text() || // 없으면 title 태그
  ""; // 그것도 없으면 빈값
```

og 태그가 없는 사이트도 있기 때문에 폴백 체인을 만들어요.

### 결과 타입

```ts
interface CrawlResult {
  title: string;
  description: string;
  thumbnailUrl: string;
  success: boolean;
  status: "completed" | "manual_required";
  attempt: number; // 몇 번째 시도에 성공/실패했는지
  errorCode?: CrawlerErrorCode;
}
```

---

## AIService

### 핵심 설계

**모델 (Gemini)**

```ts
genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

요약·태깅은 `gemini-2.5-flash`, 시맨틱 검색 임베딩은 `gemini-embedding-001`(3072차원)로 분리.

**JSON 응답 파싱 + Zod 검증**

Gemini는 응답을 마크다운 코드블록(`json ... `)으로 감싸는 경우가 많아, 응답에서 JSON 객체를 추출한 뒤 **Zod 스키마로 검증**한다. 핵심 산출물인 `summary`가 비면 저장하지 않고 실패 처리하고, 보조 데이터인 `tags`는 빈 배열로 복구해 LLM 출력 오류가 사용자 데이터로 섞이지 않게 한다. 스키마 검증 실패는 재시도로 회복.

**프롬프트 설계**

```
역할 부여    → "당신은 전문적인 지식 큐레이터입니다"
입력 명시    → title, description 전달
출력 형식    → JSON 구조 명시
제약 조건    → 한국어, 3줄 이내, 태그 최대 8개 (중복 제거)
```

### 결과 타입

```ts
interface AIAnalysisResult {
  summary: string;
  tags: string[];
}
```

---

## UX 흐름

```
저장 즉시    → "저장됐어요. AI가 분석 중이에요..."
재시도 중    → "분석 중이에요... (2/3)"
성공         → 제목, 요약, 태그 카드에 표시
3회 모두 실패 → "자동 분석이 어려운 페이지예요.
               직접 제목과 내용을 입력해주세요."
               수동 입력 폼 노출
```

---

## aiStatus 흐름

```
처음 저장   → 'crawling'
AI 분석중   → 'processing'
성공        → 'completed'
크롤링 실패 → 'crawl_failed'
AI 실패     → 'failed'
```

---

## 나중에 Java Spring으로 교체할 때

```
route.ts           → Spring @RestController
crawler.service.ts → Spring @Service (Jsoup 라이브러리)
ai.service.ts      → Spring @Service (Gemini API 클라이언트)
```

로직 자체는 거의 동일하고 언어만 다르게 하는 식으로 구현을 하고 싶어서 이런식으로 설계했다.
