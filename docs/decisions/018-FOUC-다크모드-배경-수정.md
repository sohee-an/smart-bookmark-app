# FOUC 및 다크/라이트 모드 배경색 수정

## 문제 현상

랜딩 페이지에서 로그인/회원가입 페이지로 이동할 때 **흰색 화면이 순간 깜빡임**.
단, 처음 한 번만 발생하고 이후 같은 경로를 이동하면 발생하지 않음.

---

## 원인 분석

### 1. 처음에만 깜빡이는 이유 (FOUC)

**FOUC(Flash Of Unstyled Content)** — CSS가 로드되기 전 브라우저 기본 흰 배경이 노출되는 현상.

```
첫 방문 (하드 네비게이션)
    브라우저가 HTML 수신
        ↓
    CSS 파일을 별도로 다운로드 (시간 지연)
        ↓
    CSS 적용 전 순간적으로 브라우저 기본 흰 배경 노출 ← 여기서 깜빡임
        ↓
    CSS 적용 완료 → 정상 배경 표시

이후 이동 (Next.js 클라이언트 사이드 네비게이션)
    CSS는 이미 메모리에 로드된 상태
        ↓
    React가 컴포넌트만 교체 → CSS 재다운로드 없음 → 깜빡임 없음
```

### 2. 잘못된 임시 수정 (`bg-zinc-950` 하드코딩)

처음에 `layout.tsx`의 `<body>`에 `bg-zinc-950`을 추가했으나 이는 틀린 접근.

```tsx
// 잘못된 수정 — 라이트 모드 사용자도 항상 검은 배경이 됨
<body className="... bg-zinc-950">
```

**문제점:**

- Tailwind 클래스는 CSS 파일에 포함되어 있어, CSS 로드 전에는 적용 안 됨 → FOUC 해결 안 됨
- 라이트 모드 사용자에게도 `#09090b` (거의 검은색) 배경이 항상 적용됨
- `globals.css`에 이미 올바른 다크/라이트 분기 스타일이 있음에도 무시하게 됨

### 3. 기존 globals.css 구조

`globals.css`에는 이미 올바른 배경색 설정이 있었음:

```css
@layer base {
  body {
    background-color: var(--color-surface-base); /* #fafafa 라이트 */
    color: #18181b;
  }

  .dark body {
    background-color: var(--color-surface-base-dark); /* #09090b 다크 */
    color: #fafafa;
  }
}
```

하지만 이 스타일은 **CSS 파일 로드 후에만 적용** → 첫 로드 시 FOUC 발생.

---

## 해결 방법

**`<html>` 요소에 배경색을 CSS로 설정.**

브라우저는 HTML 파싱 → `<html>` 렌더 → `<body>` 렌더 순서로 진행.
`<html>`에 배경색이 있으면 CSS 로드 전에도 빈 캔버스가 흰색이 아닌 올바른 배경색으로 채워짐.

### 변경 1: `apps/web/src/styles/globals.css`

```css
@layer base {
  /* html에 배경을 설정하면 CSS 로드 전에도 FOUC 없이 배경색이 바로 칠해짐 */
  html {
    background-color: var(--color-surface-base); /* #fafafa 라이트 기본 */
  }

  @media (prefers-color-scheme: dark) {
    html {
      background-color: var(--color-surface-base-dark); /* #09090b 다크 */
    }
  }

  body {
    background-color: var(--color-surface-base);
    color: #18181b;
  }

  .dark body {
    background-color: var(--color-surface-base-dark);
    color: #fafafa;
  }
}
```

### 변경 2: `apps/web/src/app/layout.tsx`

```tsx
// 변경 전
<html lang="ko">
  <body className="... bg-zinc-950">

// 변경 후
<html lang="ko" style={{ colorScheme: "dark light" }}>
  <body className="...">
```

- `bg-zinc-950` 제거 — 하드코딩된 다크 배경 제거
- `colorScheme: "dark light"` 추가 — 브라우저에 다크/라이트 모두 지원한다고 알림 (스크롤바, 폼 요소 등 브라우저 기본 UI도 모드에 맞게 렌더됨)

---

## 다크/라이트 모드 동작 방식

이 프로젝트는 **시스템 설정 기반 다크모드**를 사용:

| 사용자 OS 설정 | 적용 배경색 | Tailwind `dark:` 클래스                    |
| -------------- | ----------- | ------------------------------------------ |
| 라이트 모드    | `#fafafa`   | 미적용                                     |
| 다크 모드      | `#09090b`   | 적용 (`@media prefers-color-scheme: dark`) |

별도의 다크모드 토글 버튼은 없으며, OS/브라우저 설정을 따름.

---

## 관련 파일

| 파일                              | 역할                                         |
| --------------------------------- | -------------------------------------------- |
| `apps/web/src/app/layout.tsx`     | `<html>` colorScheme 설정, `<body>` bg 제거  |
| `apps/web/src/styles/globals.css` | `html`/`body` 배경색 정의 (디자인 토큰 기반) |
