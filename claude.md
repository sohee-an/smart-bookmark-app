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
│           ├── components/
│           ├── entities/
│           ├── features/
│           ├── pages/
│           ├── shared/
│           ├── styles/
│           └── widgets/
└── packages/
    ├── eslint-config/ # 공통 ESLint 설정
    ├── types/         # 공통 타입
    ├── typescript-config/ # 공통 TS 설정
    └── ui/            # 공통 UI 컴포넌트
```

## 아키텍처

- 전체: Turborepo 모노레포 (apps/, packages/ 레벨)
- apps/web 내부: FSD (Feature-Sliced Design) 구조
- FSD 레이어 순서: pages → widgets → features → entities → shared
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
- INDEX에서 찾지 못한 경우 → Glob/Grep 절대 금지, 사용자에게 이렇게 말한다:
  > "PROJECT_INDEX.md에 해당 키워드가 없어서 충분한 자료를 찾지 못했습니다."
- 사용자가 "전체코드 봐줘" 라고 하면 → 그때만 Glob/Grep으로 탐색하고, 찾은 파일을 PROJECT_INDEX.md에 즉시 추가
- 아키텍처, 기술 스택, 프로젝트 구조는 이 파일 기준으로 판단할 것
- 개별 파일은 해당 파일의 구체적인 코드가 필요할 때만 핀포인트로 읽을 것

## Notion 워크플로우 트리거

### Notion 구조 & 페이지 ID

경로: 스켸줄 > 프로젝트 > 북마크 > 할일 매니저

- 할일 매니저 page_id: `31cd9ab9-9d63-809e-80c6-c0d503c72341`

**현재 진행중: 🔖 북마크 저장하기**

- 큰 할일 page_id: `31dd9ab9-9d63-8169-9fc9-d4f938970f77`
- 세부 태스크 DB data_source_id: `74885a2f-4cde-4f00-acb8-b80d4bb502ef`
- Task 1 (카드 즉시 표시): `31dd9ab9-9d63-8180-89fb-dde90ddf2f2a`
- Task 2 (title/summary/tags 자동 채워짐): `31dd9ab9-9d63-8158-8048-ce58e725ab2d`
- Task 3 (에러 시 모달 내 메시지): `31dd9ab9-9d63-8147-8d02-d8ad6ff8a604`
- Task 4 (URL 크롤링): `31dd9ab9-9d63-8103-b287-ea3d2b323408`
- Task 5 (AI 결과 수신): `31dd9ab9-9d63-81f1-956b-d4dab5dd3698`

### "노션 댓글 확인해줘"

다음 두 가지를 순서대로 실행:

1. **댓글 확인 & 답글**
   - 현재 진행중인 모든 태스크 페이지 댓글 읽기 (notion-get-comments)
   - 새 댓글(내가 아직 답하지 않은 것)에 맥락 파악 후 Notion에 답글 달기 (notion-create-comment)

2. **검수 체크 감지 → 개발 시작**
   - 세부 태스크 DB에서 검수=true AND 상태=방향성 인 태스크 조회
   - 발견 시: 상태를 `개발중`으로 업데이트 후 아래 개발 프로세스 실행

### "새 할일 등록해줘 [내용]"

1. 할일 매니저 하위에 큰 할일 페이지 생성 (notion-create-pages, parent: 할일 매니저 page_id)
2. 그 안에 세부 태스크 DB 생성 (태스크명/상태/검수 컬럼)
3. 태스크 분해 후 각 태스크 페이지에 코드 방향 상세 작성

## 개발 프로세스 (검수 체크 감지 후 순서)

```
1. 상태 → 개발중
   Notion 태스크 페이지의 코드 방향 숙지

2. 테스트 먼저 작성
   태스크의 완료 기준을 테스트 코드로 변환
   파일 위치: 소스 파일 옆 co-location (bookmark.service.test.ts)

3. 구현
   테스트가 통과할 코드 작성

4. 상태 → 테스트중
   테스트 실행: pnpm test (현재 태스크 + 관련 파일 회귀 테스트)

5. 결과 분기
   ✅ 전부 통과 → 상태: 완료, Notion 댓글에 완료 요약 작성
   ❌ 실패 → AI 자가 수정 후 재실행 (최대 5회)
   ❌ 5회 초과 → 상태: 검수요청, Notion 댓글에 실패 로그 + 시도 요약 기록
```

## 세부 태스크 상태값

| 상태         | 의미                                | 담당                 |
| ------------ | ----------------------------------- | -------------------- |
| `방향성`     | 태스크 분해 완료, 검수 대기         | 사람 검수 대기       |
| `개발중`     | AI 구현 진행 중                     | AI                   |
| `테스트중`   | 테스트 실행 중                      | AI                   |
| `완료`       | 테스트 전부 통과                    | AI 자동              |
| `재검토필요` | 기획 변경 영향 감지, 사람 판단 대기 | AI 자동 감지         |
| `재개발`     | 재검토 후 수정 확정, AI 재실행 대기 | 사람 판단 후         |
| `검수요청`   | 5회 이상 실패, 사람 확인 필요       | AI 자동 에스컬레이션 |

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
- 레이어 순서: app → pages → widgets → features → entities → shared

## 테스트 컨벤션

- 테스트 파일은 소스 파일 옆에 위치 (co-location)
- 네이밍: `파일명.test.ts` (예: bookmark.service.test.ts)
- 단위 테스트: 소스 파일 옆
- 통합 테스트: `apps/web/src/__tests__/`
- e2e 테스트: `apps/web/e2e/`

## 절대 규칙

- 구현 전 반드시 시나리오 작성 → 사람 검수 → 테스트 코드 작성 순서 준수
- 검수 없이 구현 절대 금지
- 5회 이상 테스트 실패 시 구현 중단 → Notion 상태를 검수요청으로 변경
- 스펙 변경 감지 시 영향받는 태스크 재검토필요로 자동 변경

## 트리거

- `새 할일 등록해줘 [내용]` → /project:new-task 실행
- `노션 댓글 확인해줘` → /project:review 실행

## 참고 스킬

- 파이프라인 전체 흐름: `.claude/skills/task-pipeline/SKILL.md`
- 시나리오 작성법: `.claude/skills/task-pipeline/SCENARIO.md`
- 상태 전환 규칙: `.claude/skills/task-pipeline/STATUS.md`
- 에스컬레이션 기준: `.claude/skills/task-pipeline/ESCALATION.md`
