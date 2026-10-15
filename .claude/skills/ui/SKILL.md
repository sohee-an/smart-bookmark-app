---
description: UI 컴포넌트 생성/수정. ui-agent 에이전트를 백그라운드로 실행하고, 끝나면 타입 검사와 lint로 확인한다.
allowed-tools: Agent, AskUserQuestion, Bash
---

## 1. 위치 확인 (메인 세션에서)

ui-agent는 위치를 스스로 정하지 않는다. 백그라운드 에이전트는 사람에게 물어볼 수 없으므로, 부르기 전에 메인 세션에서 정한다.

- 요청에 위치가 있으면 그대로 쓴다
  - "packages/ui" → Headless Primitive만
  - "web/shared/ui" → 스타일 컴포넌트만
  - "둘 다" → Primitive + 스타일 컴포넌트
- 없으면 `AskUserQuestion`으로 위 세 가지 중 하나를 묻는다. 임의로 고르지 않는다

## 2. 에이전트 실행

반드시 `run_in_background: true`로 실행한다.

```
Agent 호출:
  subagent_type: ui-agent
  run_in_background: true
  description: "UI 컴포넌트: <컴포넌트 이름>"
  prompt: |
    <컴포넌트와 요구사항>
    위치: <1단계에서 정한 위치>
    끝나면 만든/수정한 파일, props, 사용 예시를 짧게 보고해줘.
```

호출 뒤 사용자에게 "백그라운드에서 ui-agent가 <컴포넌트>를 만들고 있습니다. 완료되면 알려드릴게요." 라고 안내한다.

## 3. 확인 (에이전트가 끝난 뒤)

ui-agent는 Bash가 없어서 검사를 돌리지 못한다. 메인 세션에서 바뀐 위치만 돌린다.

- packages/ui → `pnpm --filter @smart-bookmark/ui lint`, `packages/ui`에서 `pnpm exec tsc --noEmit -p .`
- web/shared/ui → `pnpm --filter @smart-bookmark/web lint`

exit code를 그대로 본다 (파이프 뒤 `tail`의 exit code로 판단하지 않는다). 실패하면 출력과 함께 알리고, 고칠지는 사람이 정한다.

## 4. 보고

에이전트 보고에서 파일, props, 사용 예시와 검사 결과를 짧게 전한다. 에이전트가 CLAUDE.md 규칙과 다르게 한 부분(파일 이름 규칙 등)을 말했으면 같이 알린다. 커밋은 사람이 말할 때만 한다.
