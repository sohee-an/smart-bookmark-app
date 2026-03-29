---
description: UI/UX 설계를 전문 비평가 관점으로 분석한다. 시각적 계층, 타이포그래피, 인터랙션, 접근성을 백그라운드 에이전트에서 검토한다.
allowed-tools: Agent
---

## 실행 방법

아래 형식으로 `Agent` 도구를 호출한다. 반드시 `run_in_background: true`로 실행한다.

- 사용자가 대상(파일, 기능, 화면)을 지정했으면 → 그 대상을 prompt에 포함
- 지정이 없으면 → 우선순위 순서대로 전체 UI 분석

```
Agent 호출:
  subagent_type: ux-critic
  run_in_background: true
  description: "UX 리뷰 실행"
  prompt: |
    [분석 대상 명시 또는 "전체 UI 우선순위 순서대로 분석"]
    .claude/agents/ux-critic.md 의 체크리스트 기준으로 분석해줘.
```

에이전트를 호출한 뒤 사용자에게 "백그라운드에서 UX 분석 중입니다. 완료되면 알려드릴게요." 라고 안내한다.

## 결과 저장

분석 완료 후 결과를 반드시 아래 경로에 저장한다:
`.claude/project/reviews/ux-review-YYYY-MM-DD.md`

저장 형식은 기존 파일(`.claude/project/reviews/ux-review-2026-03-29.md`)을 참고한다.
