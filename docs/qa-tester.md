# QATester: 근거가 있는 QA 지식 장부

제품이 "이 조건에서 이렇게 동작한다"는 사실을, 실제 테스트 실행 결과와 근거를 붙여 쌓는다.
코드가 바뀌면 그 코드에 걸린 사실만 "재검증 필요"가 되고, 그것만 다시 돌린다.

## 개념

| 개념                       | 뜻                                                                                  | 누가 만드나                                             |
| -------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 시나리오                   | 사용자 동작 단위의 주장. 예: "비회원은 20개까지 저장하고 21번째에 한도 안내가 뜬다" | 사람 (나중엔 에이전트가 초안)                           |
| 검증 테스트 (`verifiedBy`) | 그 주장을 확인하는 테스트                                                           | 사람                                                    |
| 연결 (links)               | 시나리오가 의존하는 코드 파일                                                       | **기계** (import 그래프 + E2E 라우트 → App Router 파일) |
| 사실 (facts)               | 실행 결과 + 근거: 커밋, 시각, 연결된 파일의 내용 해시                               | **기계** (`recheck`). 지우지 않고 쌓기만 한다           |
| 신선도                     | 마지막 통과 때의 파일 해시와 지금 해시를 비교                                       | **기계**                                                |

상태는 네 가지다: 통과(fresh), 재검증 필요(stale), 실패(failing), 미검증(unverified).
`maxAgeDays`가 있는 시나리오(AI 응답처럼 외부에 달린 것)는 코드가 그대로여도 기간이 지나면 재검증 필요가 된다.

## 사용

```bash
node scripts/qa/qa.mjs status                    # 전체 상태
node scripts/qa/qa.mjs show bookmark.guest-limit # 연결된 코드, mock된 경계, 마지막 근거
node scripts/qa/qa.mjs recheck                   # 재검증 필요한 것만 다시 돌리고 사실을 쌓는다
node scripts/qa/qa.mjs recheck --e2e             # Playwright까지 (브라우저, 개발 서버 필요)
node scripts/qa/qa.mjs recheck --all             # 전부 다시
node scripts/qa/qa.mjs recheck --live            # 실제 AI 점검처럼 외부 서비스를 부르는 검사까지 (로컬 Supabase 필요)
```

## 실제 AI 점검 (`--live`)

`scripts/qa/live-check.mjs`가 진짜 크롤링과 Gemini로 고정 URL 3개를 저장해 제목, 요약, 태그(1~8개)가 채워지는지 본다.
요약 문장은 매번 달라서 비교하지 않는다. 테스트 계정은 그 자리에서 만들고 끝나면 지운다.

- 데이터는 **로컬 Supabase**(Docker)에만 들어간다. 실제 DB는 건드리지 않는다. 먼저 `npx supabase start`
- 앱 서버는 3200 포트에 로컬 Supabase 주소로 따로 뜬다. Gemini 키는 `.env.local`에서 읽는다
- 시나리오 `bookmark.pipeline.real-ai`, `extension.save.api`가 이 스크립트로 검증되고, `maxAgeDays: 1`이라 하루 지나면 재검증 필요가 된다
- 비용: 실행 1회에 크롤링 3회, Gemini 요약 3회, 임베딩 3회

## 파일

| 파일                                      | 역할                                                       | 다른 프로젝트로 옮길 때 |
| ----------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| `scripts/qa/lib.mjs`, `scripts/qa/qa.mjs` | 엔진, CLI                                                  | 그대로 복사             |
| `qa-knowledge/config.json`                | 앱 위치, tsconfig, 테스트 명령                             | 새로 쓴다               |
| `qa-knowledge/scenarios.json`             | 시나리오                                                   | 새로 쓴다               |
| `qa-knowledge/facts.jsonl`                | 실행 근거 (커밋한다)                                       | 비워서 시작             |
| `scripts/qa/live-check.mjs`               | 실제 AI 점검 (runner `script`의 예)                        | 앱에 맞게 새로 쓴다     |
| `supabase/config.toml`                    | 로컬 Supabase 설정 (QA용으로 Studio 등 끔, 이메일 인증 끔) | 새로 쓴다               |

엔진은 Node만 있으면 되고 외부 패키지를 쓰지 않는다. 현재 지원: TypeScript/JavaScript import, tsconfig paths, Vitest, Playwright, Next.js App Router 라우트, 그리고 JSON 결과를 내는 임의 스크립트(runner `script`).

## 2단계: 에이전트 (사람 관문 있음)

`/qa-sweep [기능]`으로 한 바퀴 돈다. 세 에이전트는 서로의 결과를 보지 않는다.

| 에이전트             | 하는 일                                                                            | 쓸 수 있는 파일                                   | 모델   |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| `qa-scenario-writer` | 기획서, 코드, `gaps`를 보고 시나리오 후보 제안                                     | `qa-knowledge/proposals/`에 새 파일 하나          | Sonnet |
| `qa-test-author`     | 승인된 시나리오를 테스트로 작성하고 실행                                           | 테스트 파일, 픽스처, 해당 시나리오의 `verifiedBy` | Sonnet |
| `qa-judge`           | 실패를 app-bug / test-bug / claim-too-wide / flaky-external / env / unclear로 판정 | 없음 (읽기 전용)                                  | Opus   |

사람 관문: 제안을 장부에 넣는 것, 이슈나 PR을 만드는 것. 작성 에이전트는 앱 코드를 고치지 않는다.

## 3단계: 나이틀리

`node scripts/qa/nightly.mjs`가 재검증 필요한 것만 돌리고 `qa-knowledge/reports/YYYY-MM-DD.md`를 남긴다.
외부에 달린 검사(`maxAgeDays`)가 실패하면 한 번 더 돌리고, 직전 보고서에서도 실패였으면 "연속 실패"로 올린다. 종료 코드는 연속 실패가 있을 때만 1이다.

GitHub Actions(`qa-nightly.yml`)는 매일 03:00 KST에 dev 기준으로 돌고, 보고서와 근거를 아티팩트로 올리고 이슈 하나(`qa-nightly` 라벨)를 갱신한다.
실제 AI 점검은 `GEMINI_API_KEY` 시크릿이 있을 때만 돈다. CI에서는 근거를 저장소에 커밋하지 않는다(브랜치 보호). 로컬에서 돌린 근거는 사람이 커밋한다.

## 발견 장부

점검 중 눈에 띈 문제는 `node scripts/qa/qa.mjs finding add <id> "<내용>"`으로 `qa-knowledge/findings.jsonl`에 적는다.
상태는 open / fixed / wontfix / observed. 같은 id로 다시 add하면 상태가 바뀐다(이전 기록은 남는다).

## 한계 (알고 쓸 것)

- **mock된 경계는 검증되지 않는다.** 테스트가 `vi.mock`이나 `page.route`로 바꾼 모듈과 API는 연결에서 빠지고 `show`에 따로 표시된다. 그 코드가 바뀌어도 이 시나리오는 재검증 필요가 되지 않는다
- **문자열로 부르는 의존성은 못 본다.** `fetch("/api/crawl")`처럼 import가 아닌 호출은 연결되지 않는다. 지금 E2E는 API를 mock하고 있어서 실제 손실은 없지만, 실제 API를 부르는 테스트가 생기면 시나리오에 라우트를 따로 적어야 한다
- **연결은 넓게 잡힌다.** 화면 하나를 타면 레이아웃과 헤더까지 딸려 온다. 그래서 헤더를 고치면 E2E 시나리오 대부분이 재검증 필요가 된다. 놓치는 것보다 낫지만 E2E 비용은 늘어난다
- **일부만 돈 실행은 "통과 (일부 테스트 건너뜀)"으로 남는다.** 그 시나리오의 E2E 부분은 아직 확인되지 않은 상태다
