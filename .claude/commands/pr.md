---
description: 현재 브랜치의 변경사항을 분석해 PR 템플릿에 맞춰 PR 생성
allowed-tools: Bash(git diff:*, git log:*, git status:*, git branch:*, gh pr:*, gh issue:*)
---

아래 단계를 순서대로 실행해서 이 프로젝트의 PR 템플릿에 맞는 PR을 생성해주세요.

## 1단계 — 브랜치 및 변경사항 파악

병렬로 실행:

- `git branch --show-current` — 현재 브랜치명 확인
- `git log main..HEAD --oneline` — main 대비 커밋 목록
- `git diff main...HEAD` — main 대비 전체 변경사항
- `git status` — 현재 워킹 트리 상태

## 2단계 — PR 제목 작성

커밋 메시지 컨벤션과 동일한 형식으로 작성:

```
<type>(<scope>): <subject>
```

- 반드시 한국어로 작성
- 동사로 시작: 추가, 수정, 제거, 개선, 분리, 구현, 적용
- 마침표 없음, 70자 이내

**scope 판단 기준 (변경된 파일 경로 기준):**

| 경로 패턴                           | scope        |
| ----------------------------------- | ------------ |
| `packages/ui/**`                    | `ui`         |
| `packages/types/**`                 | `types`      |
| `apps/web/src/pages/api/**`         | `api`        |
| `apps/web/src/pages/**`             | `pages`      |
| `apps/web/src/widgets/**`           | `widgets`    |
| `apps/web/src/features/auth/**`     | `auth`       |
| `apps/web/src/features/bookmark/**` | `bookmark`   |
| `apps/web/src/entities/bookmark/**` | `bookmark`   |
| `apps/web/src/shared/**`            | `shared`     |
| `apps/web/src/middleware.ts`        | `middleware` |
| `.claude/**`                        | `claude`     |
| `.github/**`                        | `github`     |

## 3단계 — PR 본문 작성

아래 템플릿을 그대로 사용하되, 각 섹션을 변경사항 기반으로 채워주세요.
UI 변경이 없으면 스크린샷 섹션은 삭제하세요.

```markdown
## 📝 개요 (Summary)

<한 줄 요약>

## 🚀 주요 변경 사항 (Key Changes)

- [ ] <변경사항 1>
- [ ] <변경사항 2>

## 🧠 기술적 의사결정 (Technical Decisions)

- <결정 사항>

## 📸 스크린샷 / GIF (Screenshots)

<!-- UI 변경이 없으면 이 섹션 삭제 -->

## 🔗 관련 이슈 (Related Issues)

- Fixes #

## ✅ 체크리스트 (Self-Checklist)

- [ ] 코드가 프로젝트의 FSD 아키텍처 및 스타일 가이드를 준수하는가?
- [ ] 불필요한 콘솔 로그나 주석을 제거했는가?
- [ ] `npm run lint` 및 `npm run format`을 실행하여 오류가 없는가?
- [ ] 새로운 기능에 대한 테스트 코드를 작성했는가? (권장)
```

## 4단계 — 관련 이슈 확인

`gh issue list --state open` 으로 열린 이슈 목록을 확인하고,
현재 변경사항과 연관된 이슈 번호가 있으면 `Fixes #번호` 형태로 연결하세요.
관련 이슈가 없으면 해당 줄을 삭제하세요.

## 5단계 — 사용자 확인 후 PR 생성

작성한 PR 제목과 본문을 먼저 보여주고, 사용자 승인을 받은 뒤 아래 명령으로 PR을 생성하세요:

```bash
gh pr create --title "<제목>" --body "$(cat <<'EOF'
<본문>
EOF
)" --base main
```

PR 생성 후 URL을 사용자에게 알려주세요.

## 주의사항

- 원격 브랜치에 push가 안 되어 있으면 push 먼저 할지 물어봐주세요
- `main` 브랜치에서 직접 실행하면 경고하고 중단하세요
- Breaking Change가 있으면 제목 type 뒤에 `!` 추가
  예시) `feat(auth)!: 토큰 구조 변경`

$ARGUMENTS
