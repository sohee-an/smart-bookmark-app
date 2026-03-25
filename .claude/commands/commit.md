---
description: 변경사항 보고 커밋 메시지 자동 작성 후 커밋
allowed-tools: Bash(git diff:*, git add:*, git commit:*, git status:*, git log:*, git branch:*, git checkout:*)
---

아래 단계를 순서대로 실행해서 이 프로젝트에 맞는 커밋 메시지를 작성하고 커밋해주세요.

## 1단계 — 변경사항 파악

병렬로 실행:

- `git status` — 변경 파일 목록
- `git diff` — unstaged 변경사항
- `git diff --staged` — staged 변경사항
- `git log --oneline -5` — 최근 커밋 스타일 참고

staged된 파일이 없으면 변경된 파일 목록을 보여주고 어떤 파일을 stage할지 먼저 물어봐주세요.

## 2단계 — 코드 리뷰 (시니어 프론트엔드 관점)

`git diff` 로 확인한 변경 코드만 대상으로 리뷰한다. 전체 파일 분석 금지.

아래 항목을 체크해서 결과를 표로 출력:

| 항목                | 체크 포인트                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| **보안**            | XSS, SSRF, SQL Injection, 민감 데이터 노출, 인증 누락                  |
| **성능**            | 불필요한 리렌더링, useEffect 의존성, 무한루프 가능성, 비동기 처리 누락 |
| **단일 책임 (SRP)** | 함수/컴포넌트가 두 가지 이상의 역할을 하는지                           |
| **DRY**             | 중복 코드, 같은 로직이 2곳 이상에 있는지                               |
| **재사용성**        | 하드코딩된 값, 공통 로직으로 추출 가능한지                             |
| **타입 안전성**     | `any` 사용, 타입 가드 누락, 옵셔널 체이닝 누락                         |
| **에러 처리**       | try/catch 누락, 예외 케이스 미처리                                     |
| **가독성**          | 변수명/함수명 모호함, 매직 넘버, 긴 함수                               |

### 출력 형식

각 지적 사항을 아래 형식으로 출력:

```
🔴 [must-fix]  설명 — 어떻게 고쳐야 하는지
🟡 [suggest]   설명 — 권장 방향
🟢 [good]      잘 된 부분 (1~2개만)
```

- `🔴 must-fix`: 버그/보안/타입 오류 — 커밋 전에 반드시 수정
- `🟡 suggest`: 품질/가독성/구조 개선 — 선택적으로 수정
- `🟢 good`: 잘 작성된 부분 — 유지할 것

### 리뷰 후 처리

- `🔴` 항목이 있으면: 수정할지 물어보고, 수정 후 다음 단계로
- `🔴` 항목이 없으면: 바로 다음 단계로

---

## 3단계 — 브랜치 적합성 확인

`git branch --show-current` 로 현재 브랜치명을 확인하고, 변경 내용과 맞는지 판단한다.

### 판단 기준

| 브랜치 패턴       | 매칭 변경 유형  |
| ----------------- | --------------- |
| `feat/xxx`        | 새 기능 추가    |
| `fix/xxx`         | 버그 수정       |
| `refactor/xxx`    | 리팩토링        |
| `docs/xxx`        | 문서 작업       |
| `chore/xxx`       | 설정, 패키지 등 |
| `main`, `develop` | 모든 변경 허용  |

### 출력 형식

브랜치명과 변경 내용이 **일치하면:**

```
✅ 현재 브랜치 `feat/ssrf-defense` — 변경 내용과 일치합니다.
```

브랜치명과 변경 내용이 **불일치하면:**

```
⚠️ 현재 브랜치 `main` — 이 변경사항은 별도 브랜치가 적합할 수 있습니다.

A) 새 브랜치 생성 후 커밋 (권장): `feat/ssrf-defense`
B) 현재 브랜치에 그냥 커밋

어떻게 하시겠어요?
```

사용자가 **A 선택** 시: `git checkout -b <추천 브랜치명>` 실행 후 다음 단계
사용자가 **B 선택** 시: 바로 다음 단계

---

## 5단계 — scope 판단

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

## 6단계 — type 판단

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

## 7단계 — 커밋 메시지 작성

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

## 8단계 — 확인 후 커밋

작성한 커밋 메시지를 먼저 보여주고, 사용자 승인을 받은 뒤 커밋을 실행해주세요.

## 주의사항

- 여러 scope가 섞인 경우 커밋을 분리할지 물어봐줘
- Breaking Change가 있으면 type 뒤에 ! 추가
  예시) feat(auth)!: 토큰 구조 변경

$ARGUMENTS
