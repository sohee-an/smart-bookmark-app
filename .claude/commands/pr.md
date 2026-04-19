---
description: 현재 브랜치 기준으로 PR을 자동 생성합니다
model: claude-haiku-4-5-20251001
allowed-tools: Bash(git diff:*, git log:*, git status:*, git branch:*, git push:*), mcp__github__create_pull_request, mcp__github__list_pull_requests
---

아래 단계를 순서대로 실행해서 PR을 생성해주세요.

## 1단계 — 현재 상태 파악

병렬로 실행:

- `git branch --show-current` — 현재 브랜치 이름
- `git log main..HEAD --oneline` — main 대비 커밋 목록
- `git diff main...HEAD --stat` — 변경된 파일 목록

그 다음 base 브랜치를 판단해서 템플릿 읽기:

- base가 `main`이면 → `cat .github/PULL_REQUEST_TEMPLATE/main.md`
- base가 `dev`이면 → `cat .github/PULL_REQUEST_TEMPLATE/dev.md`

## 2단계 — PR 제목 작성

Conventional Commits 형식:

```
feat(bookmark): 북마크 AI 분석 기능 추가
fix(auth): 로그아웃 후 토큰 미삭제 버그 수정
refactor(ui): Input 컴포넌트 headless 패턴으로 분리
```

## 3단계 — PR 본문 작성

`.github/PULL_REQUEST_TEMPLATE.md` 템플릿을 그대로 사용해서 채워줘.

작성 기준:

- **개요**: 커밋 메시지 기반으로 한 줄 요약
- **주요 변경 사항**: `git diff --stat` 기반으로 실제 변경 내용 작성
- **기술적 의사결정**: 왜 이 방식을 선택했는지 (알 수 있는 경우만)
- **스크린샷**: UI 변경 없으면 섹션 삭제
- **관련 이슈**: 알 수 없으면 비워두기
- **체크리스트**: 현재 상태 기준으로 체크 가능한 항목 체크

## 4단계 — PR 생성 전 확인

작성한 PR 제목과 본문을 먼저 보여주고 승인을 받은 뒤 PR을 생성해주세요.

## 5단계 — PR 생성

GitHub MCP로 PR 생성:

- base 브랜치: `main`
- head 브랜치: 현재 브랜치
- draft: false

PR 생성 후 URL을 알려주세요.

## 주의사항

- 현재 브랜치가 main이면 PR 생성하지 말고 브랜치를 먼저 만들라고 알려주기
- 커밋이 없으면 PR 생성하지 말고 먼저 커밋하라고 알려주기

$ARGUMENTS
