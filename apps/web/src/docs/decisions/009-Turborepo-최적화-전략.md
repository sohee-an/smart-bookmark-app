# Turborepo 최적화 전략 (Performance & Caching)

## 1. 개요

현재 모노레포 구조에서 Turborepo를 단순히 실행 도구로만 쓰는 것이 아니라, **빌드 캐싱(Caching)**과 **파이프라인(Pipeline) 최적화**를 통해 개발 속도를 극대화하기 위한 전략입니다.

---

## 2. 핵심 최적화 포인트

### 2-1. 테스트 및 스토리북 캐싱 활성화

기존 설정에는 `test`와 `build-storybook`에 대한 정의가 누락되어 있었습니다. 이를 추가하여 **코드가 변하지 않았다면 이전에 성공한 결과를 즉시 재사용**하게 합니다.

```json
// turbo.json
"test": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", "vitest.config.ts", "vitest.setup.ts"],
  "outputs": ["coverage/**"]
},
"build-storybook": {
  "dependsOn": ["^build"],
  "outputs": ["storybook-static/**"]
}
```

- **이득**: CI 환경이나 로컬에서 반복적인 테스트 실행 시간을 90% 이상 단축할 수 있습니다.

### 2-2. 환경 변수 입력 정의 (`inputs`)

`.env` 파일이 변경되었을 때 빌드 결과물도 새로 생성되어야 합니다. 이를 명시하지 않으면 환경 변수를 바꿨는데도 이전 빌드 결과(캐시)가 사용되는 버그가 발생할 수 있습니다.

- **설정**: `"inputs": ["$TURBO_DEFAULT$", ".env*"]`
- **의미**: 기본 소스 코드(`$TURBO_DEFAULT$`) 외에 `.env`로 시작하는 모든 파일의 변화를 감지합니다.

### 2-3. 타입 체크 자동화 및 정합성

`check-types`라는 모호한 이름 대신 프로젝트 표준인 `type-check`로 스크립트 이름을 통일하고, 전역적으로 관리합니다.

- **전략**: `apps/web`에 `tsc --noEmit` 스크립트를 추가하여 Turbo가 모든 패키지의 타입을 병렬로 검사하게 합니다.

---

## 3. 작업 간 의존성 (Pipeline)

Turborepo의 가장 강력한 기능인 `dependsOn`을 통해 작업 순서를 제어합니다.

| 태스크       | 의존성 (`dependsOn`) | 설명                                               |
| ------------ | -------------------- | -------------------------------------------------- |
| `build`      | `^build`             | 의존하는 패키지(UI, Utils 등)가 먼저 빌드되어야 함 |
| `test`       | `^build`             | 빌드가 성공한 상태에서 테스트를 돌려 안정성 확보   |
| `lint`       | `^lint`              | 하위 패키지 린트가 먼저 통과되어야 함              |
| `type-check` | `^type-check`        | 공통 타입 패키지의 오류가 없어야 앱 타입 체크 가능 |

---

## 4. 적용 후 기대 효과

1. **Cold Build (최초 실행)**: 의존성 순서에 따라 병렬로 실행되어 가장 빠른 속도로 완료.
2. **Warm Build (재실행)**: 변경된 패키지만 빌드/테스트하고 나머지는 `FULL TURBO` (캐시 적중).
3. **CI 가속화**: GitHub Actions 등에서 캐시를 공유하여 전체 파이프라인 시간을 획기적으로 단축.

---

## 5. 향후 과제

- **Prisma Caching**: 데이터베이스 스키마 변경 시에만 Prisma Client를 재생성하도록 `inputs` 최적화.
- **Remote Caching**: 팀원 간 빌드 캐시를 공유하는 Vercel Remote Cache 도입 검토.
