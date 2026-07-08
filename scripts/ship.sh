#!/usr/bin/env bash
#
# ship — 로컬 변경을 feature 브랜치 → PR → CI 통과 → squash 머지 → base 동기화까지 한 번에.
#
# dev는 직접 push가 막혀 있으므로(브랜치 보호 enforce_admins) 진입은 PR로만 가능하다.
# 이 스크립트는 그 왕복(브랜치 생성 · push · PR · CI 대기 · 머지 · 동기화)을 자동화한다.
#
#   사용법:  git ship "커밋 메시지"           # base=dev 로 PR
#            git ship "커밋 메시지" main       # base=main 로 PR
#            SHIP_NO_MERGE=1 git ship "메시지"  # PR만 만들고 머지는 수동
#
set -euo pipefail

MSG="${1:-}"
BASE="${2:-dev}"

if [ -z "$MSG" ]; then
  echo "사용법: git ship \"커밋 메시지\" [base=dev]" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [ -z "$(git status --porcelain)" ]; then
  echo "커밋할 변경사항이 없습니다." >&2
  exit 1
fi

CUR="$(git branch --show-current)"

# base 브랜치(dev/main) 위에서 시작했으면 변경을 새 feature 브랜치로 옮긴다.
# (git switch -c 는 커밋 안 된 변경을 새 브랜치로 그대로 데려간다)
if [ "$CUR" = "dev" ] || [ "$CUR" = "main" ]; then
  SLUG="$(printf '%s' "$MSG" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9가-힣]+/-/g; s/^-+//; s/-+$//' \
    | cut -c1-40)"
  [ -z "$SLUG" ] && SLUG="change"
  BRANCH="ship/${SLUG}-$(date +%m%d-%H%M)"
  git switch -c "$BRANCH"
else
  BRANCH="$CUR"
  echo "기존 브랜치 '$BRANCH'에서 진행합니다."
fi

git add -A
git commit -m "$MSG"
git push -u origin "$BRANCH"

# 이미 열린 PR이 있으면 재사용, 없으면 생성
PR="$(gh pr list --head "$BRANCH" --base "$BASE" --json number --jq '.[0].number // empty')"
if [ -z "$PR" ]; then
  gh pr create --base "$BASE" --head "$BRANCH" --title "$MSG" \
    --body "\`git ship\` 자동 생성 PR — CI 통과 후 squash 머지." >/dev/null
  PR="$(gh pr view "$BRANCH" --json number --jq .number)"
fi
echo "PR #$PR ($BRANCH → $BASE) — CI 대기 중..."

if [ "${SHIP_NO_MERGE:-}" = "1" ]; then
  echo "SHIP_NO_MERGE=1 → PR만 생성. 머지는 수동으로: gh pr merge $PR --squash --delete-branch"
  exit 0
fi

# required check 통과 대기 (하나라도 실패하면 비-0 종료)
if gh pr checks "$PR" --watch --interval 15; then
  gh pr merge "$PR" --squash --delete-branch
  git switch "$BASE"
  git pull --ff-only origin "$BASE"
  echo "✅ PR #$PR 머지 + $BASE 동기화 완료"
else
  echo "❌ CI 실패 — PR #$PR 을 확인하세요. 머지하지 않았습니다." >&2
  exit 1
fi
