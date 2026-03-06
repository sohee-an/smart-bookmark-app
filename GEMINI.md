# 🤖 Smart Bookmark App - Project Mandates & Review Guidelines

이 파일은 프로젝트의 개발 표준, 아키텍처 원칙 및 코드 리뷰 지침을 정의합니다. Gemini CLI는 모든 작업 및 리뷰 시 이 지침을 최우선으로 준수해야 합니다.

---

## 🏗️ 1. 아키텍처 및 폴더 구조 (FSD + Pages Router)

우리 프로젝트는 **Feature-Sliced Design (FSD)**과 **Atomic Design** 패턴을 엄격히 준수합니다.

### 📂 FSD Layer 지침

- **src/shared**: 공통 UI(Atoms), 유틸리티, 전역 Hooks (예: `src/shared/ui/Button.tsx`).
- **src/entities**: 데이터 도메인 핵심 엔티티 및 상태 (예: `src/entities/bookmark`).
- **src/features**: 사용자 상호작용 및 비즈니스 로직 단위 (예: `src/features/add-bookmark`).
- **src/widgets**: 여러 기능을 조합한 독립적 UI 조각 (예: `src/widgets/BookmarkList`).
- **src/pages**: 라우팅 전용 레이어. **비즈니스 로직을 여기에 직접 작성하지 마십시오.**

### ⚛️ Atomic Design (UI Component)

- **Atoms**: 버튼, 입력창 등 최소 단위 (`src/shared/ui`).
- **Molecules**: Atoms가 조합된 기능적 컴포넌트 (`src/features` 내 위치 가능).
- **Organisms**: 도메인 데이터와 연결된 복합 구성 요소 (`src/entities` 또는 `src/features`).

---

## 💎 2. 명명 규칙 및 코드 품질 (Naming & Quality)

- **Variables**: `camelCase`. (Boolean: `is/has/should/can` 접두사 사용)
- **Constants**: `SCREAMING_SNAKE_CASE`. (예: `API_BASE_URL`)
- **Functions**: `camelCase` + **동사로 시작**. (예: `fetchBookmarks()`)
- **Components**: `PascalCase`. (예: `BookmarkCard.tsx`)
- **Types/Interfaces**: `PascalCase`. (`I` 접두사 사용 금지)
- **Early Return**: 중첩된 `if`문을 피하고 조건 미달 시 즉시 리턴하여 가독성을 높입니다.
- **Strict Typing**: `any` 사용을 절대 금지하며 인터페이스를 명확히 정의합니다.

---

## 🔒 3. 비즈니스 로직 및 보안 (Business Logic & Security)

- **Backend Agnostic (백엔드 독립성)**:
  - 프론트엔드(UI/Features)는 특정 백엔드 기술(Supabase, Prisma 등)에 직접 의존하지 않습니다.
  - 모든 데이터 요청은 `entities/[domain]/api` 레이어의 **추상화된 서비스(Interface/Repository)**를 통해서만 이루어집니다.
  - 백엔드 응답 데이터는 반드시 **내부 표준 모델(Entity)**로 변환(Mapping)하여 사용함으로써, 백엔드 API 명세가 바뀌어도 UI 코드는 영향을 받지 않게 합니다.
- **비회원 5개 제한 (Free Tier)**: 북마크 저장 시 반드시 비회원 여부와 현재 저장 개수를 체크하는 로직이 포함되어야 합니다.
- **데이터 이전 (Migration)**: 로그인 시 임시 데이터를 정식 계정으로 안전하게 이전하는 로직을 철저히 검증합니다.
- **보안 점검**: API Key(`OPENAI_API_KEY`) 등이 코드에 노출되지 않았는지, `.env`를 적절히 사용하는지 매 리뷰마다 확인합니다.

---

## 💬 4. 코드 리뷰 및 소통 방식 (Conventional Comments)

리뷰 시 다음 접두사를 사용하여 의도를 명확히 전달합니다.

- **issue:** (필수 수정) 버그, 논리 결함, 보안 이슈.
- **suggestion:** (권장) 성능 개선, 가독성 향상 제안.
- **nit:** (선택) 사소한 개선 (오타, 네이밍 등).
- **praise:** (칭찬) 좋은 설계나 코드에 대한 긍정적 피드백.

---

## 🚀 5. 커밋 및 워크플로우 (Commit Principles)

- **리뷰 우선**: 사용자가 "리뷰해줘" 또는 "커밋해줘"라고 하면 `git diff HEAD`를 분석하여 위 기준에 따라 피드백을 먼저 제공합니다.
- **커밋 메시지 제안**: 리뷰 통과 후 변경 사항의 '이유(Why)'와 '내용(What)'을 명확히 담은 메시지를 제안합니다.
- **Google & Palantir 철학**: 코드는 단순히 동작하는 것을 넘어, 누구나 읽기 쉽고 단순하게 유지되어야 합니다.

---

## 🛠️ 6. 환경별 도구 사용 지침 (Windows/PowerShell)

우리 프로젝트는 Windows 환경에서 개발되므로, Gemini CLI는 다음의 도구 사용 원칙을 준수해야 합니다.

### 🔍 파일 검색 및 탐색 (Searching)

- **Glob 활용**: 특정 경로를 직접 입력하기보다 `**/[파일명]` 형식을 우선 사용하십시오. (예: `**/bookmark/api/*.ts`) 이는 하위 프로젝트 폴더 구조(`smart-bookmark-app/`)에 구애받지 않고 파일을 찾는 데 효과적입니다.
- **CMD 우선**: `dir`이나 `rd` 같은 명령어를 사용할 때는 반드시 `cmd /c`를 접두어로 붙여 PowerShell 별칭과의 충돌을 방지하십시오.
  - ✅ `cmd /c dir /s /b` (성공)
  - ❌ `dir /s /b` (PowerShell Get-ChildItem 오류 발생 가능)

### 📂 경로 및 파일 관리 (Paths)

- **슬래시 방향**: 도구 호출 시에는 가급적 포워드 슬래시(`/`)를 사용하되, 쉘 명령어 전달 시에는 윈도우 표준인 백슬래시(`\`)를 혼용할 수 있습니다. 단, `write_file` 등 도구의 `file_path` 인자에는 절대 경로 또는 프로젝트 루트 기준의 정확한 경로를 사용하십시오.
- **자동 폴더 생성**: `write_file`은 존재하지 않는 부모 디렉토리를 자동으로 생성하므로, 파일 생성 전 별도의 `mkdir` 호출을 지양하여 작업을 단순화하십시오.
