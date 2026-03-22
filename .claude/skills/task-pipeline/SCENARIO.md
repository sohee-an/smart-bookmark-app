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

각 태스크에 대해 순서대로 실행:

### Step 1. 시나리오 작성

- `.claude/skills/task-pipeline/SCENARIO.md` 읽기
- 완료 기준 → 사용자 관점 시나리오 작성
- Notion 댓글에 시나리오 작성 후 사람 검수 대기
- **검수 확인 전 다음 단계 진행 금지**

### Step 2. 테스트 코드 작성

- 검수된 시나리오 → 유닛 테스트 코드 작성
- 구현 방향 A / B 제시 (둘 다 테스트는 통과하지만 방식이 다름)
- Notion 댓글에 방향 제시 후 사람 선택 대기
- **방향 선택 전 구현 금지**

### Step 3. Red 확인

- 테스트 실행 → 전부 실패 확인
- 통과하는 테스트가 있으면 시나리오 재검토
- Notion 댓글에 Red 확인 결과 기록
- 사람 검수 대기

### Step 4. 구현

- 선택된 방향으로 구현
- Notion 상태 → 개발중

### Step 5. Green 확인

- 테스트 실행
- 통과 시 → Notion 상태 완료
- 실패 시 → `.claude/skills/task-pipeline/ESCALATION.md` 참고
