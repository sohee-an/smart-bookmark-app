# 📖 스마트 북마크 통합 코드 리뷰 가이드라인

본 가이드라인은 Google, Palantir의 리뷰 원칙, Conventional Comments의 소통 방식, React 베스트 프랙티스, 그리고 본 프로젝트의 고유 아키텍처를 하나로 통합한 시니어 엔지니어링 기준입니다.

---

## 🏗️ 1. 프로젝트 아키텍처 표준 (FSD + Pages Router)

우리 프로젝트는 **Feature-Sliced Design (FSD)**과 **Atomic Design** 패턴을 엄격히 준수합니다.

### 📂 Layer 지침
- **shared**: 공통 UI(Atoms), 유틸리티, 전역 Hooks (예: `src/shared/ui/Button.tsx`).
- **entities**: 데이터 도메인 핵심 엔티티 (예: `src/entities/bookmark`).
- **features**: 사용자 상호작용 및 비즈니스 로직 단위 (예: `src/features/add-bookmark`).
- **widgets**: 여러 기능을 조합한 큰 UI 조각 (예: `src/widgets/BookmarkList`).
- **pages**: 라우팅 전용 레이어. 비즈니스 로직을 여기에 작성하면 안 됩니다.

### ⚛️ Atomic Design
- **Atoms**: 버튼, 입력창 등 더 쪼갤 수 없는 최소 단위.
- **Molecules**: Atoms가 조합된 기능적 컴포넌트 (SearchBar 등).
- **Organisms**: 도메인 데이터와 연결된 독립적 구성 요소 (BookmarkCard 등).

---

## 💎 2. 명명 규칙 (Naming Conventions)

가독성과 유지보수성을 위해 다음 규칙을 반드시 준수합니다.

- **Variables (변수)**: `camelCase`를 사용합니다.
  - **Boolean**: `is`, `has`, `should`, `can` 접두사를 사용합니다. (예: `isLoggedIn`, `hasToken`)
- **Constants (상수)**: 전역적이고 불변인 값은 `SCREAMING_SNAKE_CASE`를 사용합니다. (예: `MAX_RETRY_COUNT`, `API_URL`)
- **Functions (함수)**: `camelCase`를 사용하며, 항상 **동사로 시작**합니다. (예: `fetchData()`, `calculateTotal()`)
- **React Components**: `PascalCase`를 사용합니다. (예: `BookmarkCard.tsx`)
- **Types & Interfaces**: `PascalCase`를 사용합니다. `I` 접두사(예: `IBookmark`)는 사용하지 않습니다.
- **Event Handlers**: 구현부는 `handle`로 시작하고, Prop으로 전달할 때는 `on`으로 시작합니다.
  - 예: `<Button onClick={handleClick} />`

---

## 💻 3. 코드 품질 지침 (Code Quality)

- **Early Return (Guard Clause)**: 중첩된 `if`문을 피하기 위해 조건이 맞지 않으면 즉시 리턴합니다.
- **No Magic Numbers/Strings**: 의미를 알 수 없는 숫자나 문자열은 상수로 추출합니다.
- **Single Responsibility (SRP)**: 하나의 함수나 컴포넌트는 오직 한 가지 일만 수행해야 합니다.
- **Destructuring**: Props나 객체는 구조 분해 할당을 사용하여 가독성을 높입니다.
- **Avoid 'any'**: TypeScript의 `any` 사용을 절대 금지하며, 인터페이스를 명확히 정의합니다.

---

## 💬 4. Conventional Comments (소통 방식)

- **issue:** (필수 수정) 코드 오류, 논리적 결함, 보안 문제.
- **suggestion:** (권장) 성능 개선, 가독성 향상 등을 위한 제안.
- **nit:** (선택) 사소한 개선 사항 (오타, 네이밍 스타일 등).
- **praise:** (칭찬) 잘 작성된 코드나 설계에 대한 긍정적 피드백.

---

## 🌐 5. 글로벌 기업 리뷰 철학 (Google & Palantir)

- **코드 품질이 우선 (Google)**: 전체적인 코드베이스의 품질이 꾸준히 나아지는 수준이라면 승인합니다.
- **단순함이 최고 (Palantir)**: 코드는 읽는 사람이 바로 이해할 수 있을 만큼 명확하고 단순해야 합니다.

---

## 🔒 6. 우리 프로젝트 고유 비즈니스 로직 (Guest Tracker)

- **비회원 5개 제한**: 북마크 저장 시 반드시 비회원 여부와 현재 저장 개수를 체크하는 로직이 포함되어야 합니다.
- **데이터 이전**: 로그인 시 로컬 데이터를 정식 계정으로 안전하게 이전하는 로직을 검증합니다.
