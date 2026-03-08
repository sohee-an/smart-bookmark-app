---
description: Notion에서 검수=true AND 상태=방향성 태스크를 감지하고 개발 프로세스를 시작한다
allowed-tools: Read, Bash, mcp__notion
---

## 실행 순서

1. `.claude/skills/task-pipeline/SKILL.md` 를 먼저 읽어라
2. Notion 세부 태스크 DB에서 아래 조건으로 필터링
   - 상태 = 방향성
   - 검수 = true
3. 해당 태스크가 없으면 "검수 대기 중인 태스크가 없습니다" 출력 후 종료
4. 태스크가 있으면 아래 개발 프로세스 실행

## 개발 프로세스

각 태스크에 대해 순서대로 실행.
**체크박스 확인 없이 다음 단계 진행 절대 금지.**

### Step 1. 시나리오 작성

- `.claude/skills/task-pipeline/SCENARIO.md` 읽기
- 완료 기준 → 사용자 관점 시나리오 작성
- Notion 댓글에 시나리오 작성 후 대기
- **진행 조건: `시나리오검수=true` 확인 후에만 Step 2로**

### Step 2. 테스트 코드 작성

- 검수된 시나리오 → 유닛 테스트 코드 작성
- 구현 방향 A / B 제시 (둘 다 테스트는 통과하지만 방식이 다름)
- Notion 댓글에 방향 제시 후 대기
- **진행 조건: `선택방향=A` 또는 `선택방향=B` 확인 후에만 Step 3으로**

### Step 3. Red 확인

- 테스트 실행 → 전부 실패 확인
- 통과하는 테스트가 있으면 시나리오 재검토 후 Step 1로
- Notion 댓글에 Red 확인 결과 기록 후 대기
- **진행 조건: `Red확인=true` 확인 후에만 Step 4로**

### Step 4. 구현

- 선택된 방향으로 구현
- Notion 상태 → `개발중`

### Step 5. Green 확인

- 테스트 실행
- 통과 시 → Notion 상태 `완료`
- 실패 시 → `.claude/skills/task-pipeline/ESCALATION.md` 참고
