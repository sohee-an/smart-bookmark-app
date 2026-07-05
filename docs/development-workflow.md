# 개발 워크플로우 (브랜치 · CI · 테스트)

> 코드가 어떤 단계를 거쳐 `main`까지 가는지, 각 단계에서 무엇이 자동 검증되는지 정리한다.
> 테스트 상세(체크리스트/로드맵)는 [docs/spec/testing-strategy.md](./spec/testing-strategy.md) 참고.

---

## 1. 브랜치 전략

```
feature/*  ──PR──▶  dev  ──PR──▶  main
   │                 │              │
 작업 브랜치      통합 브랜치      배포 브랜치
 (기능/수정)     (검증 누적)     (프로덕션)
```

- **feature/\*** — 기능·수정 단위 작업 브랜치. 여기서 직접 `dev`/`main`에 push 금지 (branch protection).
- **dev** — 통합 브랜치. feature가 PR을 거쳐 모임. 여기서 충분히 검증 후 `main`으로.
- **main** — 배포 브랜치. Vercel 프로덕션이 여기서 나감.

---

## 2. 단계별 자동 검증 (shift-left)

빠른 검증은 왼쪽(로컬), 무겁고 느린 검증은 오른쪽(배포/스케줄)으로 배치한다.

| 시점                | 트리거           | 검증                                            | 도구                           |
| ------------------- | ---------------- | ----------------------------------------------- | ------------------------------ |
| **커밋 직전**       | husky pre-commit | 포맷 + lint (staged 파일)                       | lint-staged (prettier, eslint) |
| **PR (→dev/main)**  | GitHub Actions   | lint · typecheck · **유닛/통합 테스트** · build | `ci.yml`                       |
| **머지 → dev/main** | Vercel           | 프리뷰/프로덕션 배포                            | Vercel                         |
| **(향후) 야간**     | cron             | 전체 E2E · 접근성 · 성능                        | Playwright 등                  |

---

## 3. CI 파이프라인 (`.github/workflows/ci.yml`)

`main`·`dev`로 향하는 **모든 PR에서, 커밋을 올릴 때마다** 3개 job이 병렬 실행된다.

| Job                          | 명령                                          | 목적                                   |
| ---------------------------- | --------------------------------------------- | -------------------------------------- |
| **Lint & Typecheck**         | `pnpm lint` · `pnpm typecheck`                | 스타일 · 타입 안전성                   |
| **Unit & Integration Tests** | `pnpm --filter @smart-bookmark/web test:unit` | 로직 검증 (jsdom, 브라우저 불필요)     |
| **Build**                    | `pnpm build`                                  | 빌드 깨짐 감지 (타입만으론 못 잡는 것) |

- 테스트/빌드 job은 **placeholder 환경변수**로 실행된다 — 네트워크 호출 없이 mock으로 검증하며, 실제 시크릿은 Vercel에서 주입되므로 CI엔 불필요.
- CI의 테스트는 `test:unit`(=`vitest.unit.config.ts`, jsdom 전용)로 **유닛/통합만** 돌린다. Storybook 브라우저 테스트는 Playwright 브라우저가 필요해 로컬/별도 단계에서 실행.

---

## 4. Branch Protection (머지 게이트)

`dev`·`main`에 다음 규칙이 걸려 있다:

- **required status checks**: `Lint & Typecheck` · `Unit & Integration Tests` · `Build` — **3개 다 통과해야 머지 가능**
- **strict**: base 브랜치와 최신 동기화된 상태여야 머지
- **enforce_admins: false** — 유지보수자는 필요 시 우회 가능 (솔로 개발 락아웃 방지)

→ "테스트가 있다"가 아니라 **"통과 못 하면 머지 자체가 막힌다"**가 자동화의 핵심.

---

## 5. 테스트 정책 — 개수가 아니라 "핵심 경로" 우선

테스트는 파일/개수 기준이 아니라 **핵심 경로(critical path) = 비즈니스 가치 × 리스크**의 교집합부터 채운다.

- **비즈니스 가치**(기획): 깨지면 돈/핵심 가치를 잃는가
- **리스크**(개발): 조용히·되돌릴 수 없게·자주 바뀌는 곳에서 깨지는가

**핵심 경로 예시 (이 프로젝트)**

| 경로                                    | 왜 핵심인가                                              | 테스트                     |
| --------------------------------------- | -------------------------------------------------------- | -------------------------- |
| 북마크 저장/수정 (낙관적 업데이트·롤백) | 화면상 저장된 듯 보여도 DB엔 안 될 수 있음 (조용히 깨짐) | `queries.test.tsx`         |
| 회원/비회원 데이터 격리                 | 타인 데이터 노출(IDOR), 되돌릴 수 없음                   | repository 테스트          |
| 게스트 5개 제한                         | 비즈니스 규칙                                            | `local.repository.test.ts` |

**테스트 계층**

| 계층                                  | 위치                   | CI                     |
| ------------------------------------- | ---------------------- | ---------------------- |
| 유닛/통합 (Vitest, jsdom)             | 소스 옆 `*.test.ts(x)` | ✅ PR마다              |
| 컴포넌트/스토리 (Storybook, 브라우저) | `*.stories.*`          | 로컬 (Playwright 필요) |
| E2E (Playwright)                      | `apps/web/e2e/`        | 향후 (현재 헤더/UI)    |

E2E가 실제 쓰기 플로우를 다루게 되면 **테스트 전용 DB로 격리**한다 (실 데이터 오염 방지). 별도 클라우드 프로젝트보다 로컬 Docker(`supabase start`) 우선 — 무료·격리·매 실행 리셋. 계약: `apps/web/.env.test.example`.

---

## 6. 커밋 · PR 컨벤션

- 커밋: `feat:` · `fix:` · `refactor:` · `test:` · `docs:` · `chore:` 접두사
- PR: base를 명확히 (`feature → dev`, `dev → main`), 본문에 개요/주요 변경/기술 의사결정 기술
- `main` PR 체크리스트: dev에서 충분히 검증 · CI 전부 통과 · 환경변수 · DB 마이그레이션 확인

---

## 7. 배포 (Vercel)

- **PR** → Vercel **프리뷰** 배포 (URL 자동 생성)
- **main 머지** → Vercel **프로덕션** 배포
- 환경변수는 Vercel 대시보드에서 관리 (`.env*`는 커밋 금지)
