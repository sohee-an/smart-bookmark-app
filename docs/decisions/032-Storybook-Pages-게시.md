# Storybook 게시 파이프라인 — 설정만 있고 안 보이던 것을 라이브로

> Storybook이 저장소엔 있는데 **아무 데도 게시되지 않고 CI에도 안 물려** 있던 상태를
> GitHub Pages 자동 배포로 닫은 기록. "설정했다"를 "클릭 가능한 근거"로 바꾸는 작업.

---

## 상황

Storybook은 이미 제대로 세팅돼 있었다 — 최신 스택(`@storybook/nextjs-vite` 10.2), `addon-a11y`, vitest 브라우저 테스트, 공용 UI·핵심 표시 컴포넌트 7개 스토리(`BookmarkCard`는 crawling/processing/completed/failed 상태까지 커버). 문제는 **가시성과 검증**이었다:

1. **어디에도 게시되지 않음** — `build-storybook`이 CI에 없고 호스팅 링크도 없어, 로컬에서만 볼 수 있었다. 이력서·면접에서 "Storybook 쓴다"고 해도 **보여줄 게 없었다.**
2. **CI가 스토리를 검증하지 않음** — CI는 `test:unit`(jsdom)만 돌린다. 스토리가 깨져도 아무도 못 잡는 silent rot 위험.
3. **`preview.ts`가 Pages Router로 오설정** — 이 앱은 App Router인데 CLI 템플릿 기본값(`appDirectory: false`)이 남아 있었다.

## 결정 — GitHub Pages + Actions로 게시

호스팅 후보 3개를 비교했다:

|                | Chromatic           | Vercel(별도 프로젝트) | **GitHub Pages + Actions** |
| -------------- | ------------------- | --------------------- | -------------------------- |
| 외부 계정·토큰 | 필요(project token) | 필요(프로젝트 연결)   | **불필요**(`GITHUB_TOKEN`) |
| 비주얼 회귀    | 강점                | 없음                  | 없음                       |
| 공개 링크      | O                   | O                     | O (`*.github.io`)          |
| 설정 비용      | 계정+토큰 시크릿    | 프로젝트 추가         | **워크플로우 1개**         |

포트폴리오 목적(=공개 링크 하나)에는 **외부 의존 없이 워크플로우만으로 끝나는 GitHub Pages가 최적**이라 판단. 비주얼 회귀(Chromatic)는 지금 단계에서 과함 — 필요해지면 그때 토큰만 추가하면 되도록 여지만 남긴다(dep는 이미 있음).

## 구현

**1. 배포 워크플로우** (`.github/workflows/storybook.yml`) — `main` push에 컴포넌트/스토리 변경이 포함되면 `build-storybook` → Pages 배포. **build 단계가 곧 "스토리 깨짐" 검증**을 겸한다(빌드 실패 시 배포 중단). Pages는 `build_type: workflow`로 활성화.

```yaml
on:
  push:
    branches: [main]
    paths: ["apps/web/src/**", "apps/web/.storybook/**", ...]
  workflow_dispatch:
permissions: { pages: write, id-token: write }
```

**2. App Router 정렬** — `preview.ts`의 `appDirectory: true`. 현재 스토리들은 전부 props로 데이터/핸들러를 받는 순수 프레젠테이션 컴포넌트라 라우팅 훅을 안 써서 무해했지만, 실제 라우터에 맞춰 두어야 `next/navigation` 쓰는 컴포넌트 스토리를 나중에 추가해도 안 깨진다.

**3. 게시 링크 노출** — README 최상단 + 품질(a11y) 섹션에 [라이브 링크](https://sohee-an.github.io/smart-bookmark-app/) 추가. "설정했다"가 아니라 클릭 가능한 근거로.

## 남긴 한계

- **PR 단계 게이트는 아님** — 스토리 빌드 검증이 `main` push(머지 후) 시점이라, 깨진 스토리는 머지 후에야 배포 실패로 드러난다. PR CI에 `build-storybook` job을 넣으면 머지 전 차단 가능하나, 매 PR 비용(+~1분) 대비 스토리 변경 빈도가 낮아 후속 과제로 둔다.
- **서브경로 호스팅** — `*.github.io/smart-bookmark-app/` 하위 경로. Storybook 10은 상대 경로 에셋이라 정상 동작하지만, 커스텀 도메인으로 옮기면 base 재확인 필요.

## 교훈

1. **"설정했다"와 "보인다/검증된다"는 다르다.** 도구를 세팅만 하고 파이프라인에 안 물리면 포트폴리오에선 없는 것과 같다 — [031](./031-dev-PR게이트-우회-차단.md)의 "테스트가 있다 ≠ 통과 못 하면 막힌다"와 같은 결.
2. **배포 산출물의 빌드가 곧 검증이다.** 별도 test job 없이도 `build-storybook`이 성공해야 배포되므로, 게시 파이프라인이 최소한의 회귀 방어를 겸한다.
3. **가장 단순한 무료 경로부터.** 외부 계정·토큰이 필요한 도구(Chromatic)는 가치가 분명할 때 도입하고, 우선은 저장소 자체 기능(Pages+Actions)으로 목적을 달성한다.
