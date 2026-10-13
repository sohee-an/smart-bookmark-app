---
description: 기본 보안 리뷰(방어자 관점, OWASP 기준). security-reviewer 에이전트를 백그라운드로 실행한다.
allowed-tools: Agent, Write
---

## 실행 방법

아래 형식으로 `Agent` 도구를 호출한다. 반드시 `run_in_background: true`로 실행한다.

- 사용자가 분석 대상(파일, 기능)을 지정했으면 → 그 대상을 prompt에 포함
- 지정이 없으면 → `.github/security-sensitive-paths.json` 전체를 대상으로 점검

```
Agent 호출:
  subagent_type: security-reviewer
  run_in_background: true
  description: "기본 보안 리뷰"
  prompt: |
    [분석 대상 명시 또는 "보안 민감 경로 전체 점검"]
    .claude/agents/security-reviewer.md 기준으로 분석하고, 리포트 전체를 응답으로 돌려줘.
```

호출 뒤 사용자에게 "백그라운드에서 기본 보안 리뷰 중입니다. 완료되면 알려드릴게요." 라고 안내한다.

## 결과 저장

에이전트는 파일을 쓰지 않는다. 돌려받은 리포트를 **수정하거나 요약하지 않고** 아래 경로에 저장한다.
같은 날 파일이 이미 있으면 `-2`, `-3`을 붙인다.

`.claude/project/reviews/security-review-YYYY-MM-DD.md`

파일 맨 위에 대상, 실행 시각, 에이전트 이름을 적는다.

저장한 뒤 사용자에게는 **심각도별 건수와 파일 경로만** 알린다. 리포트 내용을 근거로 수정 작업을 시작하지 않는다.
무엇을 반영할지는 사람이 지정한다(CLAUDE.md "리뷰 결과 보관소" 규칙).
