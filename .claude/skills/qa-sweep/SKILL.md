---
description: QATester 점검 한 바퀴. 장부 상태 → 시나리오 제안(에이전트) → 사람 승인 → 테스트 작성(에이전트) → 재검증 → 실패 판정(에이전트) → 발견 기록. 단계마다 사람 관문이 있다.
allowed-tools: Agent, Bash, Read, Write, Edit
---

## 언제 쓰나

- 기능 하나를 만든 뒤 "이 기능에 QA 시나리오가 있나, 빈틈이 뭔가"를 볼 때: `/qa-sweep [기능명]`
- 장부 전체의 미검증을 줄이고 싶을 때: `/qa-sweep`
- 나이틀리 보고서에 실패가 떴을 때 판정만: `/qa-sweep judge <시나리오 id>`

## 원칙

- 세 에이전트(제안, 작성, 판정)는 서로의 결과를 보지 않는다. 메인 세션만 전부 본다
- 장부(`scenarios.json`)에 시나리오를 넣는 것, 이슈나 PR을 만드는 것은 **사람이 말할 때만**
- 작성 에이전트는 테스트 파일만 쓴다. 앱 코드를 고쳐서 테스트를 통과시키지 않는다
- 실패는 판정 에이전트가 가른 뒤에만 "버그"라고 부른다. 그 전까지는 "실패"다

## 순서

### 1. 상태 보기

```
node scripts/qa/qa.mjs status
node scripts/qa/qa.mjs gaps
node scripts/qa/qa.mjs finding list
```

대상 기능이 지정됐으면 그 기능의 시나리오와 gaps만 추린다.

### 2. 시나리오 제안 (에이전트, 백그라운드)

```
Agent:
  subagent_type: qa-scenario-writer
  run_in_background: true
  prompt: |
    대상: [기능명 또는 "장부 빈틈 전체"]
    qa.mjs status, gaps 결과와 PROJECT_PLAN, 코드를 보고 시나리오를 제안해
    qa-knowledge/proposals/ 아래에 파일로 남겨줘.
```

끝나면 제안 파일을 읽고 사용자에게 **표로** 보여 준다: id, 주장, priority, 제안 테스트. 그리고 묻는다.
"장부에 넣을 시나리오 id를 알려 주세요. 주장 문장을 고치고 싶으면 같이 말씀해 주세요."

**여기서 멈춘다.** 사용자가 고르기 전에는 다음 단계로 가지 않는다.

### 3. 승인된 시나리오를 장부에 넣기 (메인 세션)

사용자가 고른 항목을 `qa-knowledge/scenarios.json`에 옮긴다. `suggestedTest`, `evidence`, `assumption`, `priority`는 `notes`로 합친다. `verifiedBy`는 비워 둔다.

### 4. 테스트 작성 (에이전트, 시나리오 하나당 하나, 백그라운드)

```
Agent:
  subagent_type: qa-test-author
  run_in_background: true
  prompt: |
    시나리오 [id]의 테스트를 써줘. .claude/agents/qa-test-author.md 규칙대로.
```

여러 개면 동시에 띄워도 된다(서로 다른 파일을 쓴다). 끝나면 각 보고의 "실행 결과"만 모아 사용자에게 보여 준다.

### 5. 재검증

```
node scripts/qa/qa.mjs recheck [--e2e] [--live]
node scripts/qa/qa.mjs status
```

### 6. 실패 판정 (에이전트, 실패 하나당 하나)

```
Agent:
  subagent_type: qa-judge
  run_in_background: true
  prompt: |
    시나리오 [id]가 실패했다. .claude/agents/qa-judge.md 기준으로 판정해줘.
```

판정 결과를 사용자에게 그대로 보여 준다(판정, 확신, 근거, 제안).

### 7. 발견 기록과 다음 (메인 세션)

판정별로:

| 판정           | 하는 일                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| app-bug        | `qa.mjs finding add <id> "<내용>" --scenario <id>`로 기록. 고칠지는 사용자에게 묻는다. 작고 분명하면 "고쳐서 draft PR로 올릴까요?"라고 제안 |
| test-bug       | qa-test-author에게 수정 요청 (앱 코드 금지는 그대로)                                                                                        |
| claim-too-wide | 사용자에게 좁힌 주장 문장을 제안하고, 승인되면 scenarios.json 수정                                                                          |
| flaky-external | `--status observed`로 기록. 반복되면 사용자에게 알린다                                                                                      |
| env, unclear   | 사용자에게 그대로 전달                                                                                                                      |

끝에 `node scripts/qa/qa.mjs status`를 한 번 더 보여 주고, 바뀐 장부 파일(scenarios, facts, findings)을 커밋할지 묻는다.
