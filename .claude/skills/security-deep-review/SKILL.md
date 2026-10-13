---
description: 심층 보안 리뷰. 기본 리뷰(방어자, Sonnet)와 공격자 관점 리뷰(Opus)를 서로 모르게 동시에 실행한다. 인증, RLS, 토큰, 외부 URL fetch처럼 위험한 변경이나 배포 전에 쓴다.
allowed-tools: Agent, Write
---

## 언제 쓰나

비용이 기본 리뷰의 몇 배라 매번 쓰지 않는다.

- 인증/인가, 미들웨어, RLS 마이그레이션, 익스텐션 토큰, 크롤러(외부 URL fetch)를 바꿨을 때
- main 배포 전 점검

## 실행 방법

**한 메시지에서 Agent 도구를 두 번 호출해** 동시에 띄운다. 두 에이전트에게 같은 대상만 주고,
서로의 존재나 결과는 알려주지 않는다. 둘 다 `run_in_background: true`.

```
Agent 호출 1:
  subagent_type: security-reviewer
  run_in_background: true
  description: "기본 보안 리뷰"
  prompt: |
    [분석 대상]
    .claude/agents/security-reviewer.md 기준으로 분석하고, 리포트 전체를 응답으로 돌려줘.

Agent 호출 2:
  subagent_type: security-adversary
  run_in_background: true
  description: "공격자 관점 보안 리뷰"
  prompt: |
    [분석 대상]
    .claude/agents/security-adversary.md 방법으로 분석하고, 리포트 전체를 응답으로 돌려줘.
```

호출 뒤 사용자에게 "기본 리뷰와 공격자 관점 리뷰를 따로 돌리고 있습니다. 둘 다 끝나면 알려드릴게요." 라고 안내한다.

## 결과 저장

각각 끝나는 대로, 돌려받은 리포트를 **수정하거나 요약하지 않고** 저장한다.
같은 날 파일이 이미 있으면 `-2`, `-3`을 붙인다. 파일 맨 위에 대상, 실행 시각, 에이전트 이름을 적는다.

| 에이전트           | 파일                                                    |
| ------------------ | ------------------------------------------------------- |
| security-reviewer  | `.claude/project/reviews/security-review-YYYY-MM-DD.md` |
| security-adversary | `.claude/project/reviews/security-deep-YYYY-MM-DD.md`   |

먼저 끝난 쪽 결과를 나중에 끝난 쪽에 전달하지 않는다.
둘 다 저장되면 심각도별 건수와 파일 경로만 알리고, "종합하려면 `보안 리뷰 종합해줘`"라고 안내한다.
종합은 사람이 요청할 때만 한다.
