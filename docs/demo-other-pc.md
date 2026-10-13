# 다른 컴퓨터에서 발표할 때 체크리스트

발표용 컴퓨터에서 `demo/harness-talk` 브랜치로 시연하기 위한 준비 목록이다. 발표 전날 한 번, 당일 시작 전에 "당일" 항목을 한 번 더 본다.
대본은 [demo-script.md](demo-script.md), 화면별 상세는 [demo-checklist.md](demo-checklist.md).

## 1. 설치 (전날)

- [ ] Node.js 24 이상: `node -v`
- [ ] pnpm 10.30.2: `corepack enable` 후 `pnpm -v` (package.json의 `packageManager`를 따른다)
- [ ] Git, GitHub CLI(`gh`) 설치하고 `gh auth login` (PR, Actions 화면을 터미널에서 보여줄 때)
- [ ] Claude Code 설치하고 로그인: `claude` 실행 후 `/login`
- [ ] 에디터(VS Code 등)

## 2. 레포 받기 (전날)

- [ ] `git clone https://github.com/sohee-an/smart-bookmark-app.git` (이미 있으면 `git fetch origin`)
- [ ] `git switch demo/harness-talk`
- [ ] `git log --oneline -3`에 `docs(demo): 다른 컴퓨터 체크리스트` 커밋이 보이는지 확인
- [ ] `pnpm install`
  - secretlint가 설치되고 husky가 pre-commit, pre-push 훅을 등록한다
  - 확인: `ls .husky/_/pre-push`
- [ ] Playwright 브라우저: `pnpm --filter @smart-bookmark/web exec playwright install chromium`

## 3. 레포에 없는 것 직접 옮기기 (전날)

git에 올라가지 않는 파일이라 이 컴퓨터에서 직접 가져가야 한다.

| 무엇                                  | 원래 위치               | 왜 필요한가                                                                                     |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/web/.env.local`                 | 지금 컴퓨터의 같은 경로 | dev 서버와 E2E가 뜨려면 필요하다. USB나 비밀번호 관리자로 옮기고, 메신저나 메일로 보내지 않는다 |
| `security-nudge-pr-comment.png`       | 바탕화면                | 3번 섹션에서 보여주는 PR 알림 코멘트 캡처                                                       |
| `security-nudge-pr-page.png`          | 바탕화면                | 같은 PR 전체 화면 (예비)                                                                        |
| `.claude/project/reviews/*.md` (선택) | 지금 컴퓨터의 같은 경로 | 리뷰 파일을 질문에서 보여줄 때만. gitignore 대상이라 clone으로는 안 온다                        |

- [ ] 위 파일 옮김
- [ ] `.env.local`을 옮긴 뒤 발표 중에는 그 파일 탭을 열지 않는다

## 4. 동작 확인 (전날, 리허설)

- [ ] 포맷 데모 파일 만들기: `cp docs/demo/formatDemo.ts.txt apps/web/src/shared/lib/formatDemo.ts`
  - `git status`에서 이 파일이 untracked로 보이면 정상 (일부러 커밋하지 않는 파일)
- [ ] 레포 루트에서 `claude` 실행. `/agents`에 security-reviewer, security-adversary, fsd-checker 등이 보이는지
- [ ] 포맷 훅: Claude에게 `formatDemo.ts의 formatDemoTags에서 구분자를 ", "에서 " "로 바꿔줘` → 약 8초 뒤 파일 전체가 정리되는지. 끝나면 위 `cp` 명령으로 원복
- [ ] lint:fsd: `pnpm --filter @smart-bookmark/web lint:fsd` → error 1건 (countByQuery.ts)
- [ ] fsd-checker: Claude에게 `FSD 레이어 위반 찾아줘` → 에이전트가 불리는지
- [ ] E2E: `pnpm --filter @smart-bookmark/web exec playwright test e2e/pipeline-failure.spec.ts -g "크롤링 실패 → 에러 카드" --project=chromium` → `1 passed`
- [ ] pre-push 경고 보기 (선택): main과 비교하면 워크플로우 변경 경고와 의존성 경고가 나온다(dev가 아직 main에 반영되기 전일 때). 실제 push는 하지 않는다

  ```bash
  echo "refs/heads/x $(git rev-parse HEAD) refs/heads/x $(git rev-parse origin/main)" | node scripts/security/pre-push.mjs
  ```

- [ ] 브라우저에서 GitHub 로그인. 아래를 탭으로 열어 둔다
  - PR #122 (보안 알림 테스트, 닫힘): https://github.com/sohee-an/smart-bookmark-app/pull/122
  - PR #123 (보안 검사 체계, 머지됨): https://github.com/sohee-an/smart-bookmark-app/pull/123
  - Actions 탭, Security 탭 (CodeQL, Dependabot)
- [ ] 노션 로그인. 대본 2번 섹션의 완료 사례, 멈춘 사례 페이지를 탭으로 열어 둔다

## 5. 당일 시작 전 (10분)

- [ ] `git switch demo/harness-talk && git pull` 후 `git status`가 깨끗한지 (formatDemo.ts만 untracked)
- [ ] 포맷 데모 파일 리셋: `cp docs/demo/formatDemo.ts.txt apps/web/src/shared/lib/formatDemo.ts`
- [ ] 별도 터미널에서 `pnpm --filter @smart-bookmark/web dev`를 미리 띄워 둔다 (E2E 첫 실행 대기 줄임)
- [ ] Claude Code는 레포 루트에서 새로 시작
- [ ] 와이파이, 화면 공유 해상도, 터미널 글자 크기
- [ ] 알림 끄기 (메신저, 메일, GitHub 모바일 알림 포함)
- [ ] `.env.local`, `.claude/settings.local.json` 탭이 열려 있지 않은지

## 6. 하지 말 것

- `demo/harness-talk`를 dev나 main으로 PR, 머지하지 않는다. FSD 위반 샘플(`countByQuery.ts`)이 들어 있다
- `formatDemo.ts`를 커밋하지 않는다
- 발표 중 `git push --no-verify`를 쓰지 않는다 (시크릿 검사 우회)

## 7. 발표 뒤

- [ ] 발표 컴퓨터의 `.env.local` 지우기
- [ ] 필요하면 대본의 내용 중 남길 부분만 `docs/`로 정리해 dev에 PR
