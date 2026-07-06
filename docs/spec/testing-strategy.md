# 테스트 전략 (Testing Strategy)

SmartMark는 핵심 도메인 로직과 AI 파이프라인의 실패 흐름을 빠르게 회귀 검증하는 것을 우선한다.

---

## 테스트 피라미드

```
         ┌─────────┐
         │  E2E    │  8개 — 크리티컬 유저 플로우만
         │Playwright│  dev→main PR에서만 실행
         ├─────────┤
         │  통합   │  12개 — 모듈 간 연결 검증
         │ Vitest  │  파이프라인/CRUD 생명주기
         ├─────────┤
         │  단위   │  140개+ — 함수/훅/컴포넌트
         │ Vitest  │  매 PR마다 실행
         └─────────┘
```

**왜 이 비율인가:**

- 단위 테스트가 가장 많다 — 실행 빠르고 원인 특정이 쉽다
- 통합 테스트는 핵심 플로우만 — 모듈 간 연결이 깨지는 버그를 잡되, 유지보수 비용은 낮게
- E2E는 최소한 — 실행 느리고 깨지기 쉬워서 크리티컬 플로우(저장, 랜딩)에만 사용

---

## 현재 테스트 현황

### 단위 테스트 (140개+)

| 구분          | 범위                                                          | 상태 |
| ------------- | ------------------------------------------------------------- | ---- |
| URL 검증      | URL 형식, 허용 스킴, 예외 케이스                              | 완료 |
| SSRF 방어     | 사설망, 루프백, 링크 로컬, 비 HTTP 스킴 차단                  | 완료 |
| 북마크 도메인 | mapper, store, 필터링, 회원/비회원 저장 흐름                  | 완료 |
| AI 파이프라인 | 상태 전환, 실패 처리, 재시도 전환                             | 완료 |
| AI 응답 파싱  | JSON 추출, summary 필수 검증, tags 복구, Gemini retry/backoff | 완료 |
| UI 컴포넌트   | BookmarkCard, BookmarkList, FilterBar, TagFilter              | 완료 |

### 통합 테스트 (12개)

| 구분            | 범위                                                 | 상태 |
| --------------- | ---------------------------------------------------- | ---- |
| 파이프라인 통합 | crawling→processing→completed 전체 흐름, 실패→재시도 | 완료 |
| CRUD 생명주기   | 저장→조회→수정→삭제 전체 흐름, 순서/타임스탬프 유지  | 완료 |
| 상태 독립성     | aiStatus와 status가 서로 영향 없이 독립 관리         | 완료 |
| 동시 파이프라인 | 여러 북마크가 동시에 다른 상태에서 독립적 진행       | 완료 |

**단위와의 차이:** 단위는 Repository.update() 하나만 검증하지만, 통합은 save→update→findById→findAll이 연결되어 데이터가 정확히 흐르는지 검증한다.

### E2E 테스트 (8개)

| 구분        | 범위                                                     | 상태 |
| ----------- | -------------------------------------------------------- | ---- |
| 북마크 저장 | 모달 열기→URL 입력→저장→카드 표시, 잘못된 URL 에러       | 완료 |
| 랜딩 페이지 | 핵심 요소 표시, CTA→로그인 이동, 모바일 수평 스크롤 없음 | 완료 |
| 헤더 FOUC   | 느린 네트워크에서 깜빡임 없음, 게스트/회원 분기          | 완료 |
| 터치 타겟   | 모바일 검색 아이콘 44px 이상                             | 완료 |

---

## CI 파이프라인

```
feature → dev PR:
  ├── Lint & Typecheck
  ├── Unit & Integration Tests (Vitest)
  └── Build

dev → main PR:
  ├── Lint & Typecheck
  ├── Unit & Integration Tests (Vitest)
  ├── E2E Tests (Playwright chromium)  ← main 머지 전 최종 검증
  └── Build
```

**E2E를 dev→main에서만 실행하는 이유:**

- Playwright 브라우저 설치 + 실행에 시간이 걸려 매 PR CI가 느려짐
- feature→dev는 빠른 피드백이 중요하므로 단위/통합만 실행
- 프로덕션 배포 직전(dev→main)에 실제 브라우저 검증으로 최종 안전장치

---

## 핵심 검증 원칙

- 사용자 입력 URL은 저장 전에 형식 검증과 SSRF 방어를 통과해야 한다.
- LLM 응답은 신뢰하지 않고 Zod 스키마로 검증한다.
- `summary`는 핵심 산출물이므로 누락되거나 비어 있으면 실패 처리한다.
- `tags`는 보조 데이터이므로 잘못된 응답은 빈 배열로 복구한다.
- 크롤링 실패(`crawl_failed`)와 AI 분석 실패(`failed`)는 다른 상태로 다룬다.
- 실패 카드는 개별 북마크 단위 재시도를 지원하고, 무한 재시도를 막는다.

---

## 실행 명령어

```bash
# 단위 + 통합 테스트
pnpm --filter @smart-bookmark/web test:unit

# E2E 테스트 (로컬)
pnpm --filter @smart-bookmark/web test:e2e

# 타입 검사
pnpm --filter @smart-bookmark/web typecheck
```

---

## 테스트 파일 위치

```
apps/web/src/
├── entities/bookmark/api/
│   ├── local.repository.test.ts          ← 단위
│   └── supabase.repository.test.ts       ← 단위
├── features/bookmark/model/
│   ├── queries.test.tsx                  ← 단위
│   └── bookmark.service.test.ts          ← 단위
├── __tests__/
│   ├── bookmark-pipeline-integration.test.ts  ← 통합
│   ├── bookmark-crud-integration.test.ts      ← 통합
│   └── ...
└── e2e/                                       ← E2E (Playwright)

apps/web/e2e/
├── bookmark-save.spec.ts
├── landing.spec.ts
├── header.spec.ts
└── qa-header.spec.ts
```

- 단위 테스트: 소스 파일 옆 co-location
- 통합 테스트: `src/__tests__/`
- E2E 테스트: `e2e/`

---

## 보강 후보

| 후보                     | 이유                              | 우선순위 |
| ------------------------ | --------------------------------- | -------- |
| 시맨틱 검색 통합 테스트  | 임베딩→벡터 유사도 검색 흐름 검증 | 중간     |
| 컬렉션 CRUD 통합 테스트  | 생성→멤버 초대→역할 관리 흐름     | 중간     |
| 익스텐션 bulk import E2E | 대량 저장과 개별 실패 격리 검증   | 낮음     |

---

## 참고

- 테스트 도구: Vitest (단위/통합), Playwright (E2E), Testing Library (컴포넌트)
- 주요 회귀 방지 대상: URL 검증, SSRF, AI 응답 파싱, 북마크 상태 전환
