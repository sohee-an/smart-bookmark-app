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
