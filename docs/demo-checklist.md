# 하네스 시연 체크리스트 (2026-10-16 금)

> `demo/harness-talk` 브랜치 전용 문서. main/dev에 머지하지 않는다.
> 기준 커밋: `origin/main` 4865a36 (= dev와 내용 동일). 점검일 2026-10-13.
> 화면별 대본은 [demo-script.md](demo-script.md). 대본에서는 ⑤(FSD)를 ③(포맷 훅) 바로 뒤로 옮겼다.

## 0. 발표 직전 체크 (5분)

**화면 노출**

- [ ] 에디터 파일 트리에서 gitignore된 개인 폴더가 보이지 않게 정리 (발표 전 트리를 한 번 훑어볼 것)
- [ ] `.claude/settings.local.json`은 열지 않는다 (로컬 전용 설정)
- [ ] `apps/web/.env.local` 탭이 열려 있지 않은지 확인
- [ ] 노션은 **세부 태스크 페이지 링크로 바로 연다**. 사이드바와 검색에 개인 페이지가 보이므로 사이드바를 접는다
- [ ] 터미널 히스토리, 브라우저 탭과 북마크바 정리. 알림 끄기(카톡, Discord)

**환경**

- [ ] `git switch demo/harness-talk && git status`: `apps/web/src/shared/lib/formatDemo.ts`가 untracked로 보이면 정상
- [ ] 포맷 데모 파일 리셋: `cp docs/demo/formatDemo.ts.txt apps/web/src/shared/lib/formatDemo.ts`
- [ ] 별도 터미널에서 `pnpm --filter @smart-bookmark/web dev`를 미리 띄워 둔다. E2E가 기존 서버를 재사용해서 첫 실행 컴파일 대기(약 10초)가 없어진다
- [ ] Claude Code는 **이 레포 루트에서** 실행한다. 프로젝트 settings.json 훅과 에이전트가 이 경로 기준으로 로드된다
- [ ] 와이파이 확인. 노션 페이지와 Claude 호출에 필요하다. E2E는 API를 mock해서 외부 네트워크가 필요 없다

## 1. 시연 순서

### ① `.claude/` 구조 (1~2분)

| 항목    | 내용                                                                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 띄울 것 | 에디터 트리에서 `.claude/` 펼치기 (agents 6 / commands 7 / skills / hooks), `claude.md`                                                                                            |
| 말할 것 | 하네스 = 규칙(claude.md) + 자동 검사(hooks, CI) + 사람 승인 관문(노션 체크박스). 서브에이전트는 부품 하나                                                                          |
| 실패 시 | 터미널에서 `ls -R .claude`                                                                                                                                                         |
| 주의    | `settings.json`과 `settings.local.json`은 gitignore 대상이라 팀에 공유되지 않는다. 그래서 훅 **로직**은 커밋되는 `format.mjs`에 두었다(파일 상단 주석) → 이 구조 자체가 이야기거리 |

### ② 노션 파이프라인: "만들어본 것" (2~3분, 라이브 실행 안 함)

| 항목      | 내용                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 띄울 것   | (1) `.claude/skills/task-pipeline/SKILL.md`의 "단계별 진행 조건" 블록 → (2) 노션 세부 태스크 DB 뷰 → (3) 완료 사례 페이지 → (4) 멈춘 사례 페이지                                                                                                                                           |
| 완료 사례 | 「잘못된 URL 입력 시 모달 내 에러 메시지 표시 확인」 `시나리오검수 ✅ 개발구현방향 ✅ 상태=완료`. 시나리오(Given/When/Then 4케이스) → 관련 코드 수집 → 구현 계획 → 방향 피드백("RHF 오버엔지니어링") 흐름이 한 페이지에 다 있다. https://app.notion.com/p/31dd9ab99d6381478d02d8ad6ff8a604 |
| 멈춘 사례 | 「URL 크롤링 후 메타데이터/본문이 추출되는 것 확인」 `시나리오검수 ✅ 개발구현방향 ⬜ 상태=테스트 시나리오`. 피드백을 반영한 이력이 있고, 내가 쓰다 만 피드백 문장에서 멈춰 있다. **"여기서 접었다"를 보여주는 실물.** https://app.notion.com/p/31dd9ab99d638103b287ea3d2b323408           |
| 말할 것   | 체크박스 = 사람 승인 관문. 접은 이유: 1인 개발에서 스펙이 바뀔 때마다 시나리오와 유닛 테스트를 같이 고치는 비용. 그리고 흐름 정의 문서가 4개로 갈라졌다(아래 3번) → 유지비가 실제로 드러난 증거                                                                                            |
| 실패 시   | 노션 접속이 안 되면 SKILL.md와 STATUS.md만으로 설명. 페이지 스크린샷을 미리 찍어 두면 안전                                                                                                                                                                                                 |

### ③ 결정론 경계 (3분)

| 항목      | 내용                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 띄울 것   | `.claude/hooks/format.mjs` 상단 주석("결정론 경계: …") → `.github/workflows/claude-review.yml` 상단 주석(온디맨드: `ai-review` 라벨 / `@claude`)                                                                    |
| 입력      | `apps/web/src/shared/lib/formatDemo.ts`를 연 상태에서 Claude에게: `formatDemo.ts의 formatDemoTags에서 구분자를 ", "에서 " "로 바꿔줘`                                                                               |
| 예상 결과 | Claude는 한 줄만 고치는데, 저장 직후 훅이 prettier와 eslint --fix를 돌려 **파일 전체**가 정리된다(세미콜론, 큰따옴표, 2칸 들여쓰기, `if` 블록 줄바꿈). 훅 실행에 **약 8초** 걸리니 diff가 바로 안 바뀌어도 기다린다 |
| 실패 시   | 수동 실행: `printf '{"tool_input":{"file_path":"%s"}}' "$(pwd -W)/apps/web/src/shared/lib/formatDemo.ts" \| node .claude/hooks/format.mjs` (Git Bash). 끝나면 리셋 명령으로 원복                                    |
| 검증 상태 | ✅ 위 수동 실행으로 스크립트 동작 확인(2026-10-13). ⚠️ **Claude 세션 안에서 훅이 자동으로 트리거되는지는 미확인.** 점검 세션이 다른 디렉터리에서 열려 있었다. 리허설 때 반드시 한 번 해볼 것                        |

### ④ E2E (2~3분)

| 항목      | 내용                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 띄울 것   | `apps/web/e2e/pipeline-failure.spec.ts` 9~37줄(`page.route`로 `/api/crawl` 실패 mock → **사용자에게 보이는 문구와 재시도 버튼만** 검증), `qa-header.spec.ts` |
| 명령 1    | `pnpm --filter @smart-bookmark/web exec playwright test e2e/pipeline-failure.spec.ts -g "크롤링 실패 → 에러 카드" --project=chromium`                        |
| 명령 2    | `pnpm --filter @smart-bookmark/web exec playwright test e2e/pipeline-failure.spec.ts -g "재시도 → 성공" --project=chromium`                                  |
| 예상 결과 | `1 passed`. 측정값: 서버 콜드 스타트 포함 약 32초, 두 번째는 약 11초. dev 서버를 미리 띄우면 더 짧다                                                         |
| 보여주기  | 브라우저가 뜨는 걸 보여주려면 끝에 `--headed`를 붙인다(⚠️ 미검증). 결과 리포트는 `pnpm --filter @smart-bookmark/web exec playwright show-report`             |
| 말할 것   | 내부(스토어, 서비스)를 리팩터링해도 이 테스트는 안 깨진다 → 그래서 살아남았다. 프론트는 Testing Trophy(통합 중심), 백엔드는 유닛 + 가벼운 통합               |
| 실패 시   | 포트 3000 충돌: 띄워 둔 dev 서버를 끄거나 그대로 재사용. 최후의 수단으로 2026-10-13 전체 실행 결과(22 passed / 2 skipped) 캡처를 보여준다                    |

### ⑤ 서브에이전트: fsd-checker vs lint:fsd (3분)

| 항목      | 내용                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 심은 위반 | `apps/web/src/entities/bookmark/lib/countByQuery.ts:4`: entities → `@/features/bookmark/model/filterBookmarks` import. 다른 곳에서 import하지 않아 앱 동작과 무관                                                                                                                           |
| 명령 A    | `pnpm --filter @smart-bookmark/web lint:fsd` → **error 1건**(countByQuery.ts 4:1, "FSD 위반: entities는 features/widgets/app을 import할 수 없습니다"). 이게 CI 게이트(ci.yml "FSD 레이어 경계 검사")                                                                                        |
| 입력 B    | Claude에게 `FSD 레이어 위반 찾아줘` (fsd-checker 자동 호출 description 문구) 또는 `fsd-checker 에이전트로 FSD 검토해줘`                                                                                                                                                                     |
| 예상 결과 | 심은 위반 + **기존 코드의 슬라이스 간 참조 5건**: `entities/collection/api/collection.repository.ts:7`, `supabase-collection.repository.ts:13,14`(→ entities/bookmark), `features/chat/ui/ChatContent.tsx:12`(→ features/bookmark), `widgets/home/ui/HomeContent.tsx:6`(→ widgets/bookmark) |
| 말할 것   | lint는 **방향 규칙만**, 결정론적으로, 매번 같게 → CI에서 강제. 슬라이스 간 참조처럼 "이걸 막아야 하나?" 판단이 필요한 건 에이전트가 이유와 수정안까지 낸다. 단 사람이 부를 때만 돈다. 같은 위반을 두 도구가 잡는 모습 + 에이전트만 잡는 5건 = 결정론 경계를 그대로 보여줌                   |
| 예상 질문 | "기존 5건은 왜 안 고쳤나?" → 판단 대상이라 게이트에 넣지 않았다(`packages/eslint-config/fsd.js` 상단 주석에 의도로 명시). 솔직하게 "알고 있고 우선순위 밖"이라고 답한다                                                                                                                     |
| 검증 상태 | ✅ lint:fsd 1건 확인. ✅ fsd-checker 정의를 그대로 써서 sonnet 서브에이전트로 실행했고 위 6건을 grep으로 대조. ⚠️ 레포 세션에서 `.claude/agents/fsd-checker.md`가 자동 위임되는지는 리허설 필요. 에이전트 출력은 실행마다 달라질 수 있다(비결정)                                            |
| 실패 시   | 에이전트가 안 뜨면 명령 A 결과 + 이 표의 6건 목록으로 설명                                                                                                                                                                                                                                  |

### ⑥ 마무리 (1분)

- 살아남은 것: 규칙 파일, 포맷 훅, 온디맨드 리뷰 에이전트, E2E. 공통점은 **유지비가 거의 0**
- 접은 것: 노션 파이프라인과 시나리오 기반 유닛 테스트. 1인 개발에서 스펙 변경 비용이 컸다
- "팀에서는 다를 것"은 **검증 안 된 가설**이라고 말한다. 단정하지 않는다

## 2. 점검에서 발견한 문제 (A단계)

| #   | 문제                                                                                                                                                                                                                                                                                                                                    | 조치                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | 파이프라인 흐름 정의가 4개로 갈라짐: SKILL.md/STATUS.md(체크박스 2개), SCENARIO.md(댓글 + A/B + Red/Green, 자기 자신을 다시 읽으라는 순환 참조), notion-review.md(`검수=true` 트리거), claude.md(세부 DB를 `태스크명/상태/검수` 3컬럼으로 생성). **실제 노션 DB 스키마는 SKILL.md/STATUS.md와 일치** → 3월에 실제로 돈 건 SKILL.md 방식 | 수정 안 함. 발표에서 "유지비" 근거로 사용                  |
| 2   | `commands/new-task.md`가 등록 절차가 아니라 프로젝트 규칙을 복사한 파일(frontmatter 없음)                                                                                                                                                                                                                                               | 수정 안 함                                                 |
| 3   | 트리거 불일치: claude.md는 `노션 댓글 확인해줘` → `/project:review`(**없음**), new-task.md는 → `/project:notion-review`. `/project:code-review`·`security-review`·`qa-review`는 commands에 없고 skills/agents에만 있음. `/project:` 접두사는 예전 표기로 보임                                                                           | 수정 안 함                                                 |
| 4   | 프로젝트 MCP `notion-mcp`가 `Needs authentication` 상태. claude.ai Notion 커넥터로는 조회 가능                                                                                                                                                                                                                                          | 라이브를 하지 않으므로 그대로 둠. 필요하면 `/mcp`로 재인증 |
| 5   | `~/.claude.json`에 레포가 `C:/…`와 `c:/…` 두 키로 등록돼 있고, 소문자 키에는 MCP 설정이 없음                                                                                                                                                                                                                                            | 기록만                                                     |
| 6   | `.claude/project/reviews/` 없음(gitignore 대상). claude.md의 "리뷰 결과 보관소"가 비어 있음                                                                                                                                                                                                                                             | 기록만                                                     |
| 7   | `skills/skill.md`가 디렉터리 밖에 있어 스킬로 로드되지 않음                                                                                                                                                                                                                                                                             | 기록만                                                     |
| 8   | 로컬 `next build`가 `/api/extension/organize` 페이지 데이터 수집 단계에서 실패(Resend API 키 없음). 컴파일과 TypeScript는 통과. 심은 파일과 무관한 로컬 환경 문제                                                                                                                                                                       | 기록만. 시연에서 빌드는 안 돌린다                          |

### 알고 있는 불일치: 낡은 경로 참조 (고치지 않음)

- `agents/fsd-checker.md`: 분석 대상 `apps/web/src/pages/**` (App Router라 존재하지 않음. 나머지 레이어는 유효)
- `agents/qa-reviewer.md`, `agents/ux-critic.md`, `skills/qa-review/SKILL.md`: `apps/web/src/components/layout/Header.tsx`
- `skills/qa-review/SKILL.md`: `apps/web/src/app/_home-content.tsx` 등 app 하위 파일
- `agents/ui-agent.md`: `packages/ui/src/components/…`
- `commands/commit.md`: `packages/types/`, `apps/web/src/pages/`
- `commands/test.md`: `apps/web/src/features/bookmark/bookmarkService.ts`

질문이 나오면: "FSD로 옮긴 뒤 에이전트 문서는 따라가지 못했다. 규칙 파일도 코드처럼 썩는다."

## 3. 데모용 장치 위치

| 파일                                                 | 상태                      | 용도                                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/entities/bookmark/lib/countByQuery.ts` | 커밋됨                    | FSD 위반(4줄). typecheck 통과, lint:fsd error 1                                                                                                                       |
| `docs/demo/formatDemo.ts.txt`                        | 커밋됨                    | 엉망 포맷 원본. `.txt`라서 lint-staged와 포맷 훅이 건드리지 않음                                                                                                      |
| `apps/web/src/shared/lib/formatDemo.ts`              | **untracked(커밋 안 함)** | 시연용 작업본. 커밋하면 pre-commit의 lint-staged(prettier)가 정리해 버리므로 원본만 커밋하고 리셋 명령으로 복사한다. import가 없어 shared 레이어 규칙에도 걸리지 않음 |

리셋: `cp docs/demo/formatDemo.ts.txt apps/web/src/shared/lib/formatDemo.ts`

## 4. 예비: 라이브 노션용 작은 기능 후보 (현재 계획에서는 안 씀)

1. **스킴 없는 URL 자동 보정**: `example.com` 입력 시 `https://example.com`으로 저장. 지금은 "올바른 URL 형식이 아닙니다" 에러가 난다. `validateUrl` 앞단의 정규화 함수 하나와 시나리오 3줄
   (앞뒤 공백 무시는 후보에서 뺐다. `new URL()`이 이미 공백을 제거해 사실상 동작하고 있을 가능성이 높다)
2. **검색 결과 개수 표시**: 검색어가 있을 때 "N개" 텍스트. `filterBookmarks` 결과 길이만 쓰면 된다
3. **태그 칩 `#` 접두사**: 표시만 바꾸는 변경. 단 기존 Tag 테스트와 스냅샷 영향 여부는 미확인

## 5. 2026-10-13 실행 결과 기록

- `pnpm install --frozen-lockfile` OK
- `pnpm --filter @smart-bookmark/web test`: 29 files / **226 passed**
- `lint:fsd`(위반 심기 전): 0건 / 심은 후: error 1건(의도)
- `typecheck`(심은 후): 통과
- E2E chromium 전체: **22 passed, 2 skipped**(qa-header의 로그인 필요 2건, 테스트 계정 미설정)
- 단독 실행: 크롤링 실패 1 passed(32s), 재시도→성공 1 passed(11s)
