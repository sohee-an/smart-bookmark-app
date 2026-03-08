@PROJECT_PLAN.md

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

- Next.js Page Router 사용 (App Router 아님)
- getServerSideProps, getStaticProps 방식 사용

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
- 아키텍처, 기술 스택, 프로젝트 구조는 이 파일 기준으로 판단할 것
- 개별 파일은 해당 파일의 구체적인 코드가 필요할 때만 핀포인트로 읽을 것
- Glob으로 전체 파일 탐색하지 말 것

## Notion 워크플로우 트리거

### Notion 구조 & 페이지 ID

경로: 스켸줄 > 프로젝트 > 북마크 > 할일 매니저

- 할일 매니저 page_id: `31cd9ab9-9d63-809e-80c6-c0d503c72341`

**현재 진행중: 🔖 [북마크 추가] 저장 → AI 분석 파이프라인 완성**

- 큰 할일 page_id: `31cd9ab9-9d63-8141-a465-ec8ca453536d`
- 세부 태스크 DB data_source_id: `39d5abbf-83ed-4fd2-99b3-0b70faf15831`
- Task 1 (카드 즉시 표시): `31cd9ab9-9d63-81cd-b55a-edf073efd640`
- Task 2 (title/summary/tags 자동 채워짐): `31cd9ab9-9d63-8173-a1bf-c76ec1be4fa9`
- Task 3 (에러 시 모달 내 메시지): `31cd9ab9-9d63-81d6-8fb2-d2826b493007`

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
1. 개발
   태스크 페이지의 코드 방향대로 코드 작성

2. 에러 수집 및 자동 수정
   cd apps/web && pnpm build 실행
   → TypeScript 에러, 린트 에러 수집
   → 에러 자동 수정 후 재빌드로 확인
   → 에러 없을 때까지 반복

3. 검수대기 전환
   상태: 개발중 → 검수대기 로 변경
   Notion 태스크 페이지에 댓글로 "개발 완료, 확인 부탁드립니다" + 변경 내용 요약 작성

4. 사용자 최종 검수
   사용자가 브라우저에서 직접 확인 후 상태를 완료로 변경
```

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
