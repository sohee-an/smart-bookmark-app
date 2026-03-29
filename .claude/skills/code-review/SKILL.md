---
description: 구조 기획 및 코드 설계를 공격적 비평가 시점으로 리뷰한다. 백그라운드 에이전트에서 실행된다.
allowed-tools: Agent
---

## 실행 방법

아래 형식으로 `Agent` 도구를 호출한다. 반드시 `run_in_background: true`로 실행한다.

- 사용자가 리뷰 대상(파일, 디렉토리)을 지정했으면 → 그 대상을 prompt에 포함
- 지정이 없으면 → "git diff 기준 변경된 파일 전체"로 prompt 구성

```
Agent 호출:
  subagent_type: code-review
  run_in_background: true
  description: "코드 리뷰 실행"
  prompt: |
    [리뷰 대상 명시]
    .claude/agents/code-review.md 의 기준으로 리뷰해줘.
```

에이전트를 호출한 뒤 사용자에게 "백그라운드에서 리뷰 중입니다. 완료되면 알려드릴게요." 라고 안내한다.

## 결과 저장

리뷰 완료 후 결과를 반드시 아래 경로에 저장한다:
`.claude/project/reviews/code-review-YYYY-MM-DD.md`

저장 형식은 기존 파일(`.claude/project/reviews/code-review-2026-03-29.md`)을 참고한다.
