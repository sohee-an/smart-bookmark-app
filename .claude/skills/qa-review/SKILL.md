---
description: 웹 제품 완성도를 QA 관점으로 분석한다. 깜빡임, 버벅임, UX 어색함, 엣지 케이스를 백그라운드 에이전트에서 검토한다.
allowed-tools: Agent
---

## 실행 방법

아래 형식으로 `Agent` 도구를 호출한다. 반드시 `run_in_background: true`로 실행한다.

- 사용자가 대상(파일, 기능, 화면)을 지정했으면 → 그 대상을 prompt에 포함
- 지정이 없으면 → 전체 UI 컴포넌트 기준으로 분석

```
Agent 호출:
  subagent_type: qa-reviewer
  run_in_background: true
  description: "QA 리뷰 실행"
  prompt: |
    [분석 대상 명시 또는 "전체 UI 컴포넌트 QA"]
    .claude/agents/qa-reviewer.md 의 체크리스트 기준으로 분석해줘.
```

에이전트를 호출한 뒤 사용자에게 "백그라운드에서 QA 분석 중입니다. 완료되면 알려드릴게요." 라고 안내한다.
