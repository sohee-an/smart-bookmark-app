# Crawler & AI Service 설계

> 북마크 저장 시 URL을 분석하는 서버 사이드 서비스 설계 기록

---

## 전체 흐름

```
사용자가 URL 저장
  ↓
LocalRepository.save() → { aiStatus: 'processing' } 즉시 저장
  ↓
/api/process-url 호출
  ↓
CrawlerService.crawl()  → 크롤링 (최대 3회 재시도)
AIService.analyze()     → AI 요약 + 태그 생성
  ↓
LocalRepository.update() → { aiStatus: 'completed', title, summary, tags }
```

---

## 파일 위치

```
pages/api/
  ├── process-url.ts        ← 라우터 (요청/응답만)
  └── _lib/
      ├── crawler.service.ts  ← 크롤링 로직
      └── ai.service.ts       ← AI 호출 로직
```

`_lib` 앞에 `_` 를 붙이는 이유: Next.js가 pages/api 안 파일을 API 엔드포인트로 인식하는데, `_`로 시작하는 폴더는 라우트로 인식하지 않음.

---

## 단일 책임 원칙 적용

```
crawler.service.ts → 크롤링 결과만 반환 (성공/실패)
ai.service.ts      → AI 분석 결과만 반환
process-url.ts     → 결과로 뭘 할지 결정 (재시도, 실패 처리, 응답)
```

각 서비스는 자신의 역할만 해요. 판단은 process-url.ts가 해요.

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

**모델을 환경변수로 관리**

```ts
model: process.env.OPENAI_MODEL ?? "gpt-4o-mini";
```

코드 수정 없이 모델 교체 가능해요.

```
개발/포트폴리오 → gpt-4o-mini (저렴)
실제 서비스     → gpt-4o (정확)
```

**response_format: json_object**

```ts
response_format: {
  type: "json_object";
}
```

AI가 반드시 JSON으로 응답하게 강제해요. JSON.parse 실패 위험이 줄어요.

**프롬프트 설계**

```
역할 부여    → "당신은 전문적인 지식 큐레이터입니다"
입력 명시    → title, description 전달
출력 형식    → JSON 구조 명시
제약 조건    → 한국어, 3줄 이내, 태그 최대 5개
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
처음 저장   → 'pending'
AI 분석중   → 'processing'
성공        → 'completed'
실패        → 'failed'
수동 입력   → 'manual'
```

---

## 나중에 Java Spring으로 교체할 때

```
process-url.ts     → Spring @RestController
crawler.service.ts → Spring @Service (Jsoup 라이브러리)
ai.service.ts      → Spring @Service (OpenAI Java SDK)
```

로직 자체는 거의 동일하고 언어만 다르게 하는 식으로 구현을 하고 싶어서 이런식으로 설계했다.
