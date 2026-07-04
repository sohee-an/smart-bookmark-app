# CSS/스타일링 환경 리뷰 — 2026-06-07

> 범위: `apps/web` + `packages/ui` (크롬 익스텐션 제외)
> 결론: **기반(Tailwind v4 + 디자인 토큰 + headless 패턴)은 탄탄하나, 컴포넌트 레벨 일관성이 약함. 종합 5.6/10**

---

## 1. 잘 되어 있는 것

| 항목                  | 내용                                                                                                                                                   | 위치                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Tailwind v4 CSS-first | `@import "tailwindcss"` + `@theme {}` 블록, 최신 방식                                                                                                  | `apps/web/src/styles/globals.css`, `apps/web/postcss.config.mjs` |
| 브랜드/상태 색상 토큰 | `--color-brand-primary(-hover/-active)`, `--color-brand-accent`, `--color-status-error/success/warning`, `--color-surface-*` 정의, 60+곳에서 실제 사용 | `globals.css:3-51`                                               |
| Headless 분리         | `packages/ui` 프리미티브는 스타일 0%, 스타일은 `apps/web/src/shared/ui`에서 주입 — RN 확장 설계 의도대로 동작                                          | `packages/ui/src/{input,tag,avatar,icons}`                       |
| 클래스 정렬           | `prettier-plugin-tailwindcss` v0.7.2 설치·적용                                                                                                         | `.prettierrc`, `package.json`                                    |
| 최근 모바일 대응      | `text-base md:text-sm` (iOS Safari 16px 줌 방지)                                                                                                       | `apps/web/src/shared/ui/input/Input.tsx:15-19`                   |
| 단일 스타일링 방식    | CSS Modules / styled-components 혼용 없음, 순수 Tailwind + CSS 변수                                                                                    | 전역                                                             |

---

## 2. 취약점 (우선순위 순)

### 2-1. 🔴 동일 UI 요소의 스타일 산재 — 가장 큰 문제

**모달 backdrop 투명도 불일치**

| 파일                                                               | 클래스                            |
| ------------------------------------------------------------------ | --------------------------------- |
| `apps/web/src/entities/bookmark/ui/BookmarkDetailPanel.tsx:120`    | `bg-zinc-950/40 backdrop-blur-sm` |
| `apps/web/src/features/bookmark/ui/AddBookmarkOverlay.tsx:123`     | `bg-zinc-950/60 backdrop-blur-sm` |
| `apps/web/src/features/collection/ui/CreateCollectionModal.tsx:25` | `bg-zinc-950/60 backdrop-blur-sm` |
| `apps/web/src/features/collection/ui/InviteMemberModal.tsx`        | `bg-zinc-950/60 backdrop-blur-sm` |

**Primary 버튼 — 3개 파일에 복붙 + 다크모드 미묘한 차이**

| 파일                           | 클래스                                           | 다크모드                   |
| ------------------------------ | ------------------------------------------------ | -------------------------- |
| `AddBookmarkOverlay.tsx:180`   | `rounded-2xl bg-zinc-900 py-3 text-sm font-bold` | `dark:bg-brand-primary/90` |
| `CreateCollectionModal.tsx:84` | 동일                                             | `dark:bg-brand-primary`    |
| `BookmarkDetailPanel.tsx:260`  | 동일                                             | `dark:bg-brand-primary`    |

- Border 두께 `border-2` vs `border` 혼재, padding `py-3` vs `py-2.5` 혼재

**입력창 — 공용 컴포넌트가 있는데 직접 구현**

- 공용 `Input.tsx:72`: `border-2 bg-zinc-50 ... focus:ring-4`
- `CreateCollectionModal.tsx:56`: `border border-zinc-200 bg-zinc-50 ... focus:border-zinc-400` (직접 구현, 포커스 방식도 ring vs border로 다름)

**카드 border-radius 불일치**

- `BookmarkCard.tsx:41`: `rounded-[2.5rem]` (arbitrary)
- `CollectionCard.tsx`: `rounded-3xl` (토큰)

### 2-2. 🟠 zinc(회색) 계열이 토큰 밖

브랜드/상태 색상은 토큰인데, 실제 UI의 80% 이상을 차지하는 zinc 계열(`bg-zinc-100`, `border-zinc-200`, `text-zinc-600` 등)은 전부 하드코딩. 그레이 톤 변경 시 전 파일 수정 필요. 텍스트 색상도 토큰 없이 `text-zinc-900 dark:text-zinc-100` 직접 사용.

### 2-3. 🟠 arbitrary value ~40건 (전체 스타일의 ~38%)

| 파일                                           | 건수 | 대표 사례                                        |
| ---------------------------------------------- | ---- | ------------------------------------------------ |
| `entities/bookmark/ui/BookmarkCard.tsx`        | 7    | `rounded-[2.5rem]`, `shadow-[0_0_8px_rgba(...)]` |
| `widgets/bookmark/RecentBookmarkSlider.tsx`    | 4    | `w-[85vw]`, `lg:w-[calc(33.333%-14px)]`          |
| `entities/bookmark/ui/BookmarkDetailPanel.tsx` | 3    | `rounded-[2.5rem]`, `bg-red-950/30`              |
| `features/bookmark/ui/MobileSearchOverlay.tsx` | 2    | `text-[11px]`                                    |
| 기타 13개 파일                                 | 21   | 다양                                             |

특히 `rounded-[2.5rem]`처럼 반복되는 값은 토큰화 대상.

### 2-4. 🟠 클래스 병합 유틸 부재

`cn()` / `clsx` / `tailwind-merge` 미사용. 템플릿 문자열 + `${className}` 뒤에 붙이는 방식(`Input.tsx:72-80`)이라 외부에서 클래스 덮어쓰기 시 충돌 위험 (Tailwind는 뒤 클래스가 이기지 않음 — CSS 정의 순서 기준).

### 2-5. 🟡 기타

- **폰트 스택 미정의**: `@font-face`/폰트 토큰 없음, 브라우저 기본값 의존
- **애니메이션 3가지 패턴 혼재**: globals.css `@keyframes shake` / Tailwind `animate-pulse` / shadcn식 `animate-in zoom-in-95 fade-in` (`AddBookmarkOverlay.tsx:128`)
- **다크모드 이중 정의**: `@media (prefers-color-scheme: dark)` (globals.css:64-68) + `.dark body` (globals.css:75-78) 하이브리드 — 충돌 가능성
- **반응형 커버리지 편차**: `BookmarkList.tsx`(grid 4단계), `RecentBookmarkSlider.tsx`(폭 기반)는 잘 되어 있으나 레이아웃 파일 중 ~60%는 반응형 미적용. grid 방식 vs 폭 계산 방식 혼재

---

## 3. 종합 점수

| 항목                                  | 점수       |
| ------------------------------------- | ---------- |
| Tailwind 버전/설정                    | 8/10       |
| 글로벌 토큰 체계                      | 6/10       |
| 토큰 준수율 (62% 토큰 / 38% 하드코딩) | 6/10       |
| 반응형 구현                           | 6/10       |
| UI 계층 구조 (headless)               | 8/10       |
| 컴포넌트 일관성                       | 4/10       |
| 클래스 병합 도구                      | 2/10       |
| 애니메이션 체계                       | 5/10       |
| **종합**                              | **5.6/10** |

---

## 4. 권장 작업 순서

1. **Button 공용 컴포넌트 추출** — 3곳 동일 스타일 복붙 해소, variant(primary/secondary/danger) 방식. 효과 즉각적
2. **모달 backdrop/컨테이너 스타일 통일** — overlay 시스템(`shared/lib/overlay/`)이 이미 있으므로 스타일 레이어만 추가
3. **`tailwind-merge` + `cn()` 도입** — `shared/lib`에 유틸 추가 후 `Input.tsx`, `Tag.tsx`부터 적용
4. **zinc 계열 surface/text 토큰화** — `@theme`의 `--color-surface-*` 확장
5. (후순위) `rounded-[2.5rem]` 등 반복 arbitrary 값 토큰화, 폰트 스택 정의, 애니메이션 패턴 통일
