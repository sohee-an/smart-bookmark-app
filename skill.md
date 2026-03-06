# 📖 스마트 북마크 통합 코드 리뷰 가이드라인

본 가이드라인은 Google, Palantir의 리뷰 원칙, Conventional Comments의 소통 방식, Pagepro의 React 베스트 프랙티스, 그리고 본 프로젝트의 고유 아키텍처를 하나로 통합한 시니어 엔지니어링 기준입니다.

---

## 🏗️ 1. 프로젝트 아키텍처 표준 (FSD + Pages Router)

우리 프로젝트는 **Feature-Sliced Design (FSD)** 과 **Atomic Design** 패턴을 엄격히 준수합니다.

### 📂 Layer 지침

- **shared**: 공통 UI(Atoms), 유틸리티, 전역 Hooks (예: `src/shared/ui/Button.tsx`)
- **entities**: 데이터 도메인 핵심 엔티티 (예: `src/entities/bookmark`)
- **features**: 사용자 상호작용 및 비즈니스 로직 단위 (예: `src/features/add-bookmark`)
- **widgets**: 여러 기능을 조합한 큰 UI 조각 (예: `src/widgets/BookmarkList`)
- **pages**: 라우팅 전용 레이어. 비즈니스 로직을 여기에 작성하면 안 됩니다.

### ⚛️ Atomic Design

- **Atoms**: 버튼, 입력창 등 더 쪼갤 수 없는 최소 단위
- **Molecules**: Atoms가 조합된 기능적 컴포넌트 (SearchBar 등)
- **Organisms**: 도메인 데이터와 연결된 독립적 구성 요소 (BookmarkCard 등)

---

## 📬 2. PR 제출 전 체크 (Submission Rules)

리뷰어의 시간을 존중하기 위해 제출 전 아래를 반드시 확인합니다.

- **Lint 먼저 실행**: ESLint, Prettier 오류를 제출 전 직접 해결합니다.
- **셀프 리뷰**: 플랫폼에서 직접 diff를 확인하고 `console.log`, 주석 잔재, 포맷 이슈를 정리합니다.
- **PR 설명 포함**: 어떤 문제를 왜 해결했는지 간략히 작성합니다. (한두 줄이라도)
- **UI 변경 시 스크린샷 첨부**: 리뷰어가 직접 실행하지 않아도 변경 사항을 파악할 수 있게 합니다.
- **PR 크기 제한**: 변경이 크다면 서브 브랜치로 나눠 작은 단위로 제출합니다.

---

## 💎 3. 명명 규칙 (Naming Conventions)

- **Variables**: `camelCase`
  - Boolean은 `is`, `has`, `should`, `can` 접두사 사용 (예: `isLoggedIn`, `hasToken`)
  - `visible` → `isVisible` 처럼 HTML 속성과 혼동되지 않게 합니다.
- **Constants**: 전역 불변값은 `SCREAMING_SNAKE_CASE` (예: `MAX_RETRY_COUNT`)
- **Functions**: `camelCase` + 동사 시작 (예: `fetchData()`, `calculateTotal()`)
  - 반환 목적이 명확하면 이름에 드러냅니다. `parseData` → `parseToAPIFormat`
- **React Components**: `PascalCase` (예: `BookmarkCard.tsx`)
- **Types & Interfaces**: `PascalCase`. `I` 접두사(`IBookmark`) 사용 금지.
- **Event Handlers**: 구현부는 `handle`, Prop 전달 시 `on` (예: `<Button onClick={handleClick} />`)

---

## 💻 4. 코드 품질 지침 (Code Quality)

### 기본 원칙

- **Early Return (Guard Clause)**: 중첩 `if`문 대신 조건 불일치 시 즉시 리턴합니다.
- **No Magic Numbers/Strings**: 의미 불명의 값은 상수로 추출합니다.
- **Single Responsibility (SRP)**: 하나의 함수/컴포넌트는 한 가지 일만 합니다.
- **Destructuring**: Props, 객체는 구조 분해 할당으로 가독성을 높입니다.
- **Avoid `any`**: TypeScript `any` 사용 절대 금지. 인터페이스를 명확히 정의합니다.
- **No Code Repetition (DRY)**: 동일하거나 유사한 로직이 여러 곳에 있다면 추출합니다.

### 의존성 & 임포트

- **새 npm 패키지 추가 시 반드시 리뷰**: 정말 필요한지 검토합니다.
- **기능 중복 라이브러리 금지**: 예) `date-fns` + `moment` 동시 사용 불가.
- **Tree Shaking 고려**: 라이브러리 전체를 임포트하지 않습니다.

```ts
// ❌ 번들 전체 포함
import _ from "lodash";

// ✅ 필요한 것만
import uniq from "lodash/uniq";
```

### 로직 & 안정성

- **하드코딩 금지**: 경로, 이름, 값은 상수나 설정 파일로 관리합니다.
- **하위 호환성 유지**: 기존 optional props를 required로 바꾸거나 함수 시그니처를 변경할 때 기존 호출부에 영향이 없는지 확인합니다.
- **폼 유효성 검사**: 모든 폼 필드에 적절한 validation이 있는지 확인합니다.
- **에러 핸들링**: API 응답 실패, try/catch의 catch 블록이 적절히 처리되는지 확인합니다.
- **비동기 최적화**: async 함수가 순차 실행이 꼭 필요한지, 병렬(`Promise.all`)로 처리 가능한지 검토합니다.

```ts
// ❌ 불필요한 순차 실행
const user = await fetchUser();
const posts = await fetchPosts();

// ✅ 병렬 처리
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
```

---

## 💬 5. Conventional Comments (소통 방식)

리뷰 댓글은 아래 접두사를 붙여 의도를 명확히 합니다.

- **issue:** (필수 수정) 코드 오류, 논리적 결함, 보안 문제
- **suggestion:** (권장) 성능 개선, 가독성 향상 제안
- **nit:** (선택) 사소한 개선 사항 (오타, 네이밍 스타일 등)
- **praise:** (칭찬) 잘 작성된 코드나 설계에 대한 긍정적 피드백

### 리뷰 소통 원칙

- **왜 바꿔야 하는지 설명합니다**: "A를 B로 바꾸세요"가 아니라 이유를 함께 적습니다.
- **잘된 부분은 칭찬합니다**: 팀 분위기와 동기 부여에 직접 영향을 줍니다.
- **스타일 이슈는 반복하지 않습니다**: 같은 스타일 문제가 여러 곳에 있다면, 한 번만 언급하고 전체 해결을 요청합니다.
- **코드를 이해 못 했다면 질문합니다**: 비판이 아닌 호기심으로 접근하는 것이 좋은 리뷰의 핵심입니다.

---

## 🌐 6. 글로벌 기업 리뷰 철학 (Google & Palantir)

- **코드 품질이 우선 (Google)**: 전체적인 코드베이스 품질이 꾸준히 나아지는 수준이라면 승인합니다.
- **단순함이 최고 (Palantir)**: 읽는 사람이 바로 이해할 수 있을 만큼 명확하고 단순해야 합니다.

---

## 🔒 7. 우리 프로젝트 고유 비즈니스 로직 (Guest Tracker)

- **비회원 5개 제한**: 북마크 저장 시 반드시 비회원 여부와 현재 저장 개수를 체크하는 로직이 포함되어야 합니다.
- **데이터 이전**: 로그인 시 로컬 데이터를 정식 계정으로 안전하게 이전하는 로직을 검증합니다.

---

## ✅ 빠른 리뷰 체크리스트

### PR 제출 전

- [ ] Lint 오류 없음
- [ ] `console.log` 제거
- [ ] PR 설명 작성
- [ ] UI 변경 시 스크린샷 첨부

### 아키텍처

- [ ] FSD 레이어 규칙 준수 (pages에 비즈니스 로직 없음)
- [ ] Atomic Design 분류 적절함

### 코드 품질

- [ ] `any` 타입 없음
- [ ] 하드코딩된 값 없음
- [ ] 중복 로직 없음 (DRY)
- [ ] 컴포넌트 단일 책임 원칙 준수
- [ ] Early Return 적용

### 의존성

- [ ] 새 패키지 추가 이유 명확함
- [ ] 기능 중복 라이브러리 없음
- [ ] 전체 라이브러리 임포트 없음

### 안정성

- [ ] 에러 핸들링 적절함
- [ ] 폼 유효성 검사 있음
- [ ] 비동기 병렬 처리 검토됨
- [ ] 하위 호환성 깨지지 않음

### 비즈니스 로직

- [ ] 비회원 5개 제한 로직 포함 (해당 시)
- [ ] 로그인 시 데이터 이전 로직 검증 (해당 시)

1. alan2207/bulletproof-react — ★34k
   github.com/alan2207/bulletproof-react
   React 아키텍처 레퍼런스로 커뮤니티에서 가장 많이 인정받는 리포지토리예요. 지금 Anso가 공부하는 것들과 거의 정확히 겹쳐요.

Feature 기반 폴더 구조 (FSD랑 사실상 동일한 개념)
컴포넌트 분리 기준, 네이밍, Custom Hook 설계
단방향 의존성 규칙 (shared → features → app)
ESLint로 레이어 간 import 방향 강제하는 방법까지 설명

지금 만드는 가이드라인의 실제 코드 버전이라고 보면 돼요.
