---
description: 변경사항 보고 커밋 메시지 자동 작성 후 커밋
allowed-tools: Bash(git diff:*, git add:*, git commit:*, git status:*, git log:*)
---

아래 단계를 순서대로 실행해서 이 프로젝트에 맞는 커밋 메시지를 작성하고 커밋해주세요.

## 1단계 — 변경사항 파악

병렬로 실행:

- `git status` — 변경 파일 목록
- `git diff` — unstaged 변경사항
- `git diff --staged` — staged 변경사항
- `git log --oneline -5` — 최근 커밋 스타일 참고

staged된 파일이 없으면 변경된 파일 목록을 보여주고 어떤 파일을 stage할지 먼저 물어봐주세요.

## 2단계 — scope 판단

변경된 파일 경로를 기준으로 scope를 판단합니다.

### 패키지 scope

| 경로 패턴                           | scope      |
| ----------------------------------- | ---------- |
| `packages/ui/**`                    | `ui`       |
| `packages/types/**`                 | `types`    |
| `packages/eslint-config/**`         | `eslint`   |
| `packages/typescript-config/**`     | `tsconfig` |
| `turbo.json`, `package.json` (루트) | `turbo`    |

### apps/web FSD 레이어 scope

| 경로 패턴                                | scope        |
| ---------------------------------------- | ------------ |
| `apps/web/src/pages/api/**`              | `api`        |
| `apps/web/src/pages/**`                  | `pages`      |
| `apps/web/src/widgets/**`                | `widgets`    |
| `apps/web/src/features/auth/**`          | `auth`       |
| `apps/web/src/features/bookmark/**`      | `bookmark`   |
| `apps/web/src/entities/bookmark/**`      | `bookmark`   |
| `apps/web/src/shared/lib/overlay/**`     | `overlay`    |
| `apps/web/src/shared/api/**`             | `shared`     |
| `apps/web/src/shared/lib/**`             | `shared`     |
| `apps/web/src/shared/ui/**`              | `shared`     |
| `apps/web/src/middleware.ts`             | `middleware` |
| `apps/web/src/docs/**`                   | `docs`       |
| `.husky/**`, `commitlint*`, `.eslintrc*` | `config`     |
| `.github/**`                             | `github`     |
| `.claude/**`                             | `claude`     |

### 도메인별 세분화 우선순위

- **bookmark 도메인**: entities/bookmark + features/bookmark가 같이 바뀌면 → `bookmark`
- **AI/크롤러**: `pages/api/services/ai.service.ts` → `ai`, `crawler.service.ts` → `crawler`
- **인증**: features/auth, middleware.ts → `auth`
- **여러 레이어 동시 변경**: 가장 핵심적인 레이어 scope 사용

## 3단계 — type 판단

| type       | 사용 기준                                             |
| ---------- | ----------------------------------------------------- |
| `feat`     | 새로운 기능, 새 컴포넌트, 새 API 엔드포인트 추가      |
| `fix`      | 버그 수정, 로직 오류 수정, 타입 오류 수정             |
| `refactor` | 동작 변화 없는 코드 구조 개선 (헤드리스 패턴 분리 등) |
| `style`    | CSS, Tailwind 클래스 변경, 스타일 토큰 수정           |
| `test`     | vitest 테스트 추가/수정                               |
| `docs`     | ADR 문서, README, 주석 추가/수정                      |
| `chore`    | 패키지 설치, 설정 파일, husky, commitlint 등          |
| `perf`     | 성능 개선 (병렬 처리, 메모이제이션 등)                |

## 4단계 — 커밋 메시지 작성

형식:

```
<type>(<scope>): <subject>

[optional body - 변경 이유나 맥락이 필요할 때만]
```

**subject 규칙 (이 프로젝트 기준):**

- 반드시 한국어로 작성
- 동사로 시작: 추가, 수정, 제거, 개선, 분리, 구현, 적용
- 마침표 없음, 50자 이내
- `feat:` 뒤에 공백 반드시 포함

**좋은 예시:**

```
feat(bookmark): 북마크 AI 분석 상태 polling 로직 추가
fix(auth): 로그아웃 후 게스트 ID 초기화 오류 수정
refactor(ui): Input 컴포넌트 헤드리스 패턴으로 분리
style(shared): 디자인 토큰 @theme 변수 정리
feat(overlay): overlay.open/close/unmount 이벤트 emitter 구현
chore(config): commitlint conventional 규칙 설정 추가
docs(docs): ADR 006 헤드리스 패턴 설계 결정 기록
feat(crawler): og 태그 우선순위 폴백 체인 구현
fix(bookmark): 비회원 5개 초과 저장 방지 로직 수정
refactor(bookmark): BookmarkService Factory 패턴으로 repository 선택 분리
```

**나쁜 예시:**

```
feat: update           ← 너무 모호
fix(auth): fixed bug.  ← 영어, 마침표
feat:북마크 추가        ← 공백 없음
```

## 5단계 — 확인 후 커밋

작성한 커밋 메시지를 먼저 보여주고, 사용자 승인을 받은 뒤 커밋을 실행해주세요.

## 주의사항

- 여러 scope가 섞인 경우 커밋을 분리할지 물어봐줘
- Breaking Change가 있으면 type 뒤에 ! 추가
  예시) feat(auth)!: 토큰 구조 변경

$ARGUMENTS
