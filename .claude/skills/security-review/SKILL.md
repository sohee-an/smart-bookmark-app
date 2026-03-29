---
description: 보안 취약점을 공격자 시점으로 분석한다. 백그라운드 에이전트에서 실행된다.
allowed-tools: Agent
---

## 실행 방법

아래 형식으로 `Agent` 도구를 호출한다. 반드시 `run_in_background: true`로 실행한다.

- 사용자가 분석 대상(파일, 기능)을 지정했으면 → 그 대상을 prompt에 포함
- 지정이 없으면 → 전체 보안 체크리스트 기준으로 분석

```
Agent 호출:
  subagent_type: security-reviewer
  run_in_background: true
  description: "보안 취약점 분석"
  prompt: |
    [분석 대상 명시 또는 "전체 프로젝트 보안 점검"]
    .claude/agents/security-reviewer.md 의 체크리스트 기준으로 분석해줘.
```

에이전트를 호출한 뒤 사용자에게 "백그라운드에서 보안 분석 중입니다. 완료되면 알려드릴게요." 라고 안내한다.
