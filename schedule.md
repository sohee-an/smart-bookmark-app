# 📅 AI Smart Bookmark - Development Schedule (Backend Agnostic)

이 스케줄은 **백엔드 독립성(Backend Agnostic)**과 **Pages Router + FSD** 아키텍처를 기반으로 작성되었습니다. 나중에 커스텀 백엔드로의 교체가 용이하도록 설계합니다.

---

## 🏗️ Phase 1: 기초 인프라 및 추상화 레이어 (Agnostic Infrastructure)

- [ ] **의존성 정리**: Prisma 제거 및 Supabase Client, OpenAI, `zustand` 등 필수 라이브러리 유지.
- [ ] **FSD 폴더 구조 세팅**: `src/features`, `src/entities`, `src/shared` 계층별 폴더 생성.
- [ ] **추상화 레이어 설계**: `entities/bookmark/api` 내에 북마크 데이터 통신 인터페이스(`Repository`) 정의.
- [ ] **Supabase 구현체 구축**: 현재 백엔드로 사용할 Supabase Client 로직을 위 인터페이스에 맞춰 구현.
- [ ] **게스트 트래킹**: 비회원 5개 제한을 위한 로컬 스토리지 + 익명 세션 관리 기능 구현.

## 🚀 Phase 2: 핵심 수집 및 무료 체험 (Collector & Free Tier)

- [ ] **URL 크롤러 유틸리티**: URL 메타데이터(제목, 이미지, 본문) 추출 기능 구현.
- [ ] **데이터 매퍼(Mapper)**: 백엔드 응답을 앱 표준 모델로 변환하여 UI 코드의 독립성 확보.
- [ ] **북마크 저장 Flow**: `체크(5개 미만) -> 저장 -> AI 분석 예약` 흐름 완성.
- [ ] **무료 체험 UI**: 비회원 전용 저장 횟수 인디케이터 및 로그인 유도 모달.

## 🤖 Phase 3: AI 지능형 가공 (AI Processor)

- [ ] **OpenAI API 연동**: 본문 요약, 자동 태깅, 저장 의도 분석 엔진 구축.
- [ ] **비회원 AI 체험**: 로그인 여부와 관계없이 AI 요약 기능을 제공하여 가입 유도.
- [ ] **데이터 파이프라인**: 저장 시 자동으로 비동기 AI 분석이 일어나는 API 흐름 설계.

## 🎨 Phase 4: UI/UX 및 카드 뷰 (UI Development)

- [ ] **Atomic Design**: Button, Input, Badge, Skeleton UI 제작.
- [ ] **비주얼 카드 뷰**: AI 요약문과 썸네일이 포함된 `BookmarkCard` 제작.
- [ ] **대시보드 페이지**: 로그인 여부에 따른 리스트 렌더링 및 필터링 UI.

## 🔍 Phase 5: 인증 및 데이터 이전 (Auth & Migration)

- [ ] **Supabase Auth**: 소셜 로그인 및 이메일 가입 구현.
- [ ] **게스트 데이터 이전**: 로그인 성공 시, 익명 ID로 저장된 북마크들을 사용자 계정으로 안전하게 이전.
- [ ] **상세 페이지**: 요약 전문 확인 및 태그 수정, 메모 편집 기능.

## 🏁 Phase 6: 고도화 및 배포 (Final Polish)

- [ ] **검색 및 필터**: 제목, 내용, 태그 기반의 실시간 필터링.
- [ ] **Vercel 배포**: 환경 변수 설정 및 최종 배포 검증.
- [ ] **README 업데이트**: 최종 기능 명세서 완성.

---

### 💡 핵심 설계 포인트

1. **Repository Pattern**: 프론트엔드 코드는 `api.save()`만 호출하며, 내부가 Supabase인지 커스텀 서버인지는 관심이 없습니다.
2. **Data Mapper**: 백엔드에서 `created_at`으로 오든 `createdAt`으로 오든, 앱 내에서는 항상 정해진 하나의 필드명만 사용합니다.
