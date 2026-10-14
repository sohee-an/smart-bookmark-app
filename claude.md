@PROJECT_PLAN.md
@PROJECT_INDEX.md

# Smart Bookmark

북마크 URL을 넣으면 AI가 자동으로 요약, 태그, 의미 검색을 해주는 앱.

## 프로젝트 구조

```
smart-bookmark/
├── apps/
│   └── web/          # Next.js 앱 (메인)
│       └── src/
│           ├── app/          # Next.js App Router (라우트, 레이아웃, API Route) = FSD app 레이어
│           ├── widgets/
│           ├── features/
│           ├── entities/
│           ├── shared/
│           ├── server/       # 서버 전용 서비스 (크롤러, AI). FSD 레이어 아님
│           ├── styles/
│           └── middleware.ts
└── packages/
    ├── eslint-config/ # 공통 ESLint 설정
    ├── typescript-config/ # 공통 TS 설정
    └── ui/            # 공통 UI 컴포넌트
```

## 아키텍처

- 전체: Turborepo 모노레포 (apps/, packages/ 레벨)
- apps/web 내부: FSD (Feature-Sliced Design) 구조
- FSD 레이어 순서: app → widgets → features → entities → shared (`packages/eslint-config/fsd.js`가 CI에서 강제)
- 상위 레이어가 하위 레이어를 import, 역방향 금지
- UI는 Headless 패턴 적용 (로직과 UI 분리)
- 추후 React Native 앱 출시를 고려한 확장 구조
  - 로직은 packages/에서 공유
  - UI만 플랫폼별로 교체 가능하도록 설계

## 프레임워크

- Next.js App Router 사용
- Server Components, Server Actions 방식 사용

## 데이터 저장

- **비회원**: localStorage
- **회원**: Supabase
- Repository 패턴으로 두 저장소 추상화

## 인증

- Supabase Auth 사용
- Next.js middleware.ts에서 인증 처리

## 실행 명령어

```bash
pnpm dev        # 개발 서버 (apps/web)
pnpm build      # 빌드
pnpm lint       # ESLint 검사
pnpm test       # 테스트 실행
```

## 코드 스타일

- TypeScript strict 모드
- 함수형 컴포넌트 + React hooks만 사용
- 변수 선언은 const, let만 사용 (var 금지)
- 컴포넌트 파일명은 PascalCase
- 유틸 함수 파일명은 camelCase
- 타입만 import할 때는 반드시 `import type` 사용 (예: `import type { ReactNode } from "react"`)
- `React.ReactNode` 같은 네임스페이스 접근 방식 금지, named import 사용

## 패키지 매니저

- pnpm + Turborepo 모노레포
- 새 패키지 설치 시 반드시 pnpm 사용

## 추후 계획 (건드리지 말 것)

- Spring Boot 백엔드 추가 예정
- 현재는 Supabase로 대체 중

## 건드리면 안 되는 것

- .env.local
- .env\*
- node_modules/

## 작업 규칙

- CLAUDE.md와 PROJECT_PLAN.md는 항상 자동으로 로드됨 — 이미 알고 있으면 다시 읽지 말 것

## 탐색 규칙

- 파일을 찾을 때는 반드시 PROJECT_INDEX.md를 먼저 본다
- 파일 경로의 기준은 PROJECT_INDEX.md 한 곳이다. 에이전트, 스킬, 명령 문서에는 경로 대신 이름을 쓴다
- 파일을 옮기거나 이름을 바꾸면 PROJECT_INDEX.md를 같이 고친다. 안 고치면 CI의 문서 경로 검사가 PR을 막는다
- INDEX에서 찾지 못한 경우 → Glob/Grep 절대 금지, 사용자에게 이렇게 말한다:
  > "PROJECT_INDEX.md에 해당 키워드가 없어서 충분한 자료를 찾지 못했습니다."
- 사용자가 "전체코드 봐줘" 라고 하면 → 그때만 Glob/Grep으로 탐색하고, 찾은 파일을 PROJECT_INDEX.md에 즉시 추가
- 아키텍처, 기술 스택, 프로젝트 구조는 이 파일 기준으로 판단할 것
- 개별 파일은 해당 파일의 구체적인 코드가 필요할 때만 핀포인트로 읽을 것

## Notion 워크플로우

"새 할일 등록해줘 [내용]"과 "노션 댓글 확인해줘"의 절차, 체크박스, 상태값, DB 스키마는 **task-pipeline 스킬 한 곳**에만 적는다. 여기와 명령 파일에는 절차를 적지 않는다 (예전에는 세 곳에 적혀 서로 어긋났다).

- 체크박스는 두 개: 시나리오검수(시나리오 승인), 개발구현방향(구현 계획 승인). 사람만 누른다
- 상태 흐름: 테스트 시나리오 → 방향성 → 개발중 → 테스트중 → 완료 (실패 5회면 검수요청)
- AI 댓글은 `[AI]`로 시작한다 (사람과 AI가 같은 Notion 계정이라 작성자로 구분이 안 된다)
- Notion page/DB ID는 로컬 설정에 둔다. 형식은 task-pipeline 스킬 폴더의 예시 파일

## 테스트 파일 컨벤션

소스 파일 옆 co-location 방식:

```
apps/web/src/features/bookmark/model/
├── bookmark.service.ts
├── bookmark.service.test.ts      ← 단위 테스트
└── useBookmarkStore.ts
    useBookmarkStore.test.ts      ← 단위 테스트

apps/web/src/__tests__/           ← 통합 테스트
apps/web/e2e/                     ← e2e 테스트
```

회귀 테스트 탐지: 관련 파일명 + `.test` 자동 탐지 → import 분석으로 연관 테스트도 실행

## 태스크 분해 기준

태스크는 **파일 단위가 아닌 "브라우저/앱에서 눈으로 확인할 수 있는 동작 단위"** 로 나눈다.

- ✅ 좋은 예: "URL 저장하면 카드가 즉시 뜨는 것 확인"
- ✅ 좋은 예: "잠시 후 카드에 title/summary/tags 자동으로 채워지는 것 확인"
- ❌ 나쁜 예: "bookmarkService.ts 수정" (파일 기준 — 실행해서 확인 불가)

나누는 조건:

- 각 태스크 완료 후 사용자가 직접 실행해서 결과를 눈으로 확인 가능한가
- 방향이 틀렸을 때 해당 태스크만 되돌릴 수 있는가

묶는 조건:

- 분리해도 중간 결과를 확인할 수 없으면 하나로 묶는다

# 프로젝트 Rules

## 아키텍처

- FSD(Feature-Sliced Design) 레이어 규칙 엄수
- `entities`가 `features`를 import 금지 (레이어 위반)
- 레이어 순서는 위 '아키텍처' 섹션 기준

## 테스트 컨벤션

- 테스트 파일은 소스 파일 옆에 위치 (co-location)
- 네이밍: `파일명.test.ts` (예: bookmark.service.test.ts)
- 단위 테스트: 소스 파일 옆
- 통합 테스트: `apps/web/src/__tests__/`
- e2e 테스트: `apps/web/e2e/`

**테스트 전략 상세 가이드**: [docs/spec/testing-strategy.md](docs/spec/testing-strategy.md)

- 파일별 테스트 체크리스트
- 단위/통합/E2E 테스트 로드맵
- 커버리지 목표 및 모킹 패턴

## 절대 규칙

- 구현 전 반드시 시나리오 작성 → 사람 검수 → 테스트 코드 작성 순서 준수
- 검수 없이 구현 절대 금지
- 5회 이상 테스트 실패 시 구현 중단 → Notion 상태를 검수요청으로 변경
- 스펙 변경 감지 시 영향받는 태스크 재검토필요로 자동 변경

## 버그 추적 규칙

상태 변경(읽음, 삭제, 업데이트 등) 관련 버그는 반드시 아래 전체 체인을 순서대로 확인한다:

```
UI 핸들러 → 서비스(BookmarkService) → Repository 구현체 → DB 쿼리/필드 매핑
```

- **optimistic update 착각 금지**: React Query의 optimistic update는 화면에서 즉시 동작하는 것처럼 보이지만, 실제 DB에는 저장 안 됐을 수 있다. 반드시 Repository 레이어의 실제 저장 로직까지 확인할 것
- **타입 정의 먼저 확인**: `UpdateBookmarkData` 등 업데이트 타입에서 필드 누락 여부를 가장 먼저 체크할 것
- **새로고침 기준**: 상태 유지 관련 기능은 "새로고침 후에도 유지되는가"를 동작 기준으로 삼을 것. 새로고침 후 원복되면 DB 저장이 안 된 것이다

## 트리거

- `새 할일 등록해줘 [내용]` → /project:new-task 실행
- `노션 댓글 확인해줘` → /project:notion-review 실행
- `리뷰해줘 [대상]` → /project:code-review 실행 (백그라운드)
- `보안 검토해줘 [대상]` → /project:security-review 실행 (백그라운드, 기본 리뷰)
- `심층 보안 검토해줘 [대상]` → /project:security-deep-review 실행 (기본 + 공격자 관점을 따로 동시에)
- `보안 리뷰 종합해줘` → /project:security-summary 실행 (개발 세션에서, 요청할 때만)
- `QA 해줘 [대상]` → /project:qa-review 실행 (백그라운드)

## 리뷰 결과 보관소

`.claude/project/reviews/` — 모든 리뷰 결과가 날짜별로 저장됨

| 파일 패턴                        | 내용                    |
| -------------------------------- | ----------------------- |
| `code-review-YYYY-MM-DD.md`      | 아키텍처/타입 설계 리뷰 |
| `security-review-YYYY-MM-DD.md`  | 보안 취약점 분석        |
| `security-deep-YYYY-MM-DD.md`    | 공격자 관점 보안 분석   |
| `security-summary-YYYY-MM-DD.md` | 보안 리뷰 종합          |
| `ux-review-YYYY-MM-DD.md`        | UX/인터랙션 리뷰        |
| `qa-review-YYYY-MM-DD.md`        | QA/완성도 리뷰          |

**에이전트 참조 규칙:**

- 리뷰 결과는 개발 세션(메인)만 읽는다. 리뷰 에이전트끼리는 서로의 결과를 보지 않는다. 에이전트가 공유하는 기준은 CLAUDE.md와 PROJECT_PLAN.md뿐이다
- 리뷰는 사람이 부를 때만 실행한다. 구현 전에 리뷰 파일을 자동으로 전부 읽지 않는다
- 사람이 반영할 항목을 지정하면 그 리뷰 파일만 읽는다. 리뷰 전체를 미리 알고 시작하면 작업 범위가 리뷰에 끌려가는 문제가 있었다
- Critical/High 항목은 새 태스크 등록 전 먼저 해소 여부 확인

**보안 검사 구조:**

| 언제              | 무엇이                                                                                      | 성격              |
| ----------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| push 전 (로컬)    | `.husky/pre-push`: 시크릿(막음), 보안 민감 파일 변경(경고), lockfile 변경 시 의존성(경고)   | 결정론            |
| PR, main/dev push | CodeQL, 의존성 audit, 보안 리뷰 알림 코멘트                                                 | 결정론, 막지 않음 |
| 매주 월요일       | CodeQL, 의존성 audit. critical/high가 있으면 이슈 하나를 만들거나 갱신하고, 해소되면 닫는다 | 결정론, 막지 않음 |
| 사람이 부를 때    | 기본 리뷰(security-reviewer + OWASP 스킬), 심층 리뷰(security-adversary)                    | 판단              |
| 사람이 부를 때    | 종합(security-summary): 여러 곳에서 찾음 / 한 곳만 / 엇갈림                                 | 판단              |

보안 민감 경로는 `.github/security-sensitive-paths.json` 하나로 관리한다.

## 참고 스킬

- Notion 파이프라인 (유일한 기준): `.claude/skills/task-pipeline/SKILL.md`
- 시나리오 작성법: `.claude/skills/task-pipeline/SCENARIO.md`
- 상태 전환 규칙: `.claude/skills/task-pipeline/STATUS.md`
- 에스컬레이션 기준: `.claude/skills/task-pipeline/ESCALATION.md`
- 코드/구조 리뷰 (공격적 비평가): `.claude/skills/code-review/SKILL.md`
