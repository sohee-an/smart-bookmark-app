# 프로젝트 Rules

## 아키텍처

- FSD(Feature-Sliced Design) 레이어 규칙 엄수
- `entities`가 `features`를 import 금지 (레이어 위반)
- 레이어 순서: app → pages → widgets → features → entities → shared

## 테스트 컨벤션

- 테스트 파일은 소스 파일 옆에 위치 (co-location)
- 네이밍: `파일명.test.ts` (예: bookmark.service.test.ts)
- 단위 테스트: 소스 파일 옆
- 통합 테스트: `apps/web/src/__tests__/`
- e2e 테스트: `apps/web/e2e/`

## 절대 규칙

- 구현 전 반드시 시나리오 작성 → 사람 검수 → 테스트 코드 작성 순서 준수
- 검수 없이 구현 절대 금지
- 5회 이상 테스트 실패 시 구현 중단 → Notion 상태를 검수요청으로 변경
- 스펙 변경 감지 시 영향받는 태스크 재검토필요로 자동 변경

## 트리거

- `새 할일 등록해줘 [내용]` → /project:new-task 실행
- `노션 댓글 확인해줘` → /project:notion-review 실행

## 참고 스킬

- 파이프라인 전체 흐름: `.claude/skills/task-pipeline/SKILL.md`
- 시나리오 작성법: `.claude/skills/task-pipeline/SCENARIO.md`
- 상태 전환 규칙: `.claude/skills/task-pipeline/STATUS.md`
- 에스컬레이션 기준: `.claude/skills/task-pipeline/ESCALATION.md`
