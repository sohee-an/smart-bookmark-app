# 021 — 검색 UX 패턴 결정: 포커스 이동 제거, 드롭다운, 디바운스

## 문제들

### 문제 1: 포커스만으로 페이지가 이동됨

```tsx
// 기존 코드
const handleSearchFocus = () => {
  if (pathname !== "/bookmarks") {
    router.push(`/bookmarks...`); // 클릭 한 번에 페이지 이동
  }
};
```

사용자가 검색창을 클릭했다는 것은 **"검색하겠다"는 의지**이지 **"지금 페이지를 떠나겠다"는 의지가 아니다.**

발생하는 문제:

- 실수로 클릭했을 때 원치 않는 페이지 이동
- 모바일에서 스크롤 도중 터치가 인식되어 이동
- 뒤로가기 스택에 불필요한 항목이 쌓임
- 컬렉션 등 다른 페이지에서 검색창을 눌렀을 때 컨텍스트 단절

### 문제 2: 모바일 헤더가 너무 많은 공간을 차지함

검색창이 헤더 하단에 항상 노출 → 헤더가 120px+ 점유 → 콘텐츠 면적 축소.

### 문제 3: /bookmarks에서 엔터를 눌러야만 검색됨

타이핑할 때마다 즉각 반영되지 않고 엔터 키를 눌러야 URL이 업데이트됨.

---

## 레퍼런스 분석과 선택

다양한 제품을 분석하여 이 앱에 적합한 패턴을 선택했다.

| 제품            | 검색 패턴                             | 특징                            |
| --------------- | ------------------------------------- | ------------------------------- |
| **Raindrop.io** | 현재 페이지에서 인라인 필터링         | 페이지 이동 없음, 컨텍스트 유지 |
| **Linear**      | Command+K 커맨드 팔레트               | 수십 가지 커맨드를 한 곳에서    |
| **Notion**      | 포커스 → 드롭다운 → 결과 선택 시 이동 | 최근 항목 우선 제안             |
| **Superhuman**  | 키보드 퍼스트, 스플릿 패널            | 검색이 앱의 핵심 동선           |

### Command+K를 선택하지 않은 이유

Linear의 커맨드 팔레트는 이슈 생성, 팀 전환, 필터 설정 등 **수십 가지 "명령"** 이 필요하기 때문에 합리적이다.

이 앱에서 사용자가 하려는 행동은 대부분 **"북마크 찾기" 하나다.**
커맨드 팔레트를 만들면 과잉 UI가 된다.

### 최종 선택: Raindrop + Notion 혼합

```
포커스 시    → 드롭다운 열기 (최근 검색어 + 태그 제안)
입력 중      → 빠른 결과 미리보기 (최대 4개)
엔터 or 클릭 → /bookmarks?q= 로 이동
/bookmarks   → 드롭다운 없이 debounce 인라인 필터링
```

---

## 구현 패턴 1: 검색 드롭다운

### 드롭다운 외부 클릭 닫기

드롭다운을 닫는 이벤트를 `click`이 아닌 **`mousedown`** 으로 처리한다.

```tsx
useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (!searchContainerRef.current?.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);
```

**왜 `click`이 아닌 `mousedown`인가?**

이벤트 발생 순서: `mousedown` → `mouseup` → `click` → `focus` / `blur`

드롭다운 안의 버튼을 클릭할 때:

1. `mousedown` 발생 (검색 컨테이너 안 → 드롭다운 유지)
2. `blur` 발생 (input에서 포커스 이탈)
3. `mouseup`, `click` 발생 (버튼 동작 실행)

만약 `blur` 이벤트에서 드롭다운을 닫으면, `click`이 실행되기 전에 버튼이 DOM에서 사라져 **클릭이 무시된다.**
`mousedown`을 기준으로 컨테이너 안/밖을 판단하면 이 문제가 없다.

### `contains()` 메서드

```tsx
ref.current?.contains(e.target as Node);
```

DOM 트리에서 `ref.current`가 `e.target`을 포함하는지 확인한다.
드롭다운이 `searchContainerRef` 안에 있으면 `true`를 반환하여 닫히지 않는다.

---

## 구현 패턴 2: Debounce로 URL 업데이트

### 왜 Debounce가 필요한가?

타이핑할 때마다 `router.replace`를 호출하면 키 입력 1번에 URL이 바뀌고 React가 리렌더링된다.
"react" 5글자를 타이핑하면 5번 URL 변경 + 5번 렌더링이 발생한다.

Debounce는 **마지막 입력 후 일정 시간(300ms) 동안 추가 입력이 없을 때만** 실행한다.

```
타입: r → (300ms 타이머 시작)
타입: e → (이전 타이머 취소, 새 300ms 시작)
타입: a → (이전 타이머 취소, 새 300ms 시작)
...
타입: t → (이전 타이머 취소, 새 300ms 시작)
300ms 경과 → URL 업데이트 (1번만)
```

### useRef로 타이머 관리

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

const handleSearchChange = (value: string) => {
  setSearchQuery(value); // 입력은 즉시 반영

  if (pathname === "/bookmarks") {
    clearTimeout(debounceRef.current); // 이전 타이머 취소
    debounceRef.current = setTimeout(() => {
      router.replace(`/bookmarks?q=${value}`);
    }, 300);
  }
};
```

**왜 `useState`가 아닌 `useRef`인가?**

타이머 ID를 저장할 때 `useState`를 쓰면 값이 바뀔 때마다 리렌더링이 발생한다.
타이머 ID는 렌더링 결과에 영향을 주지 않는 **부수적인 값**이다.
`useRef`는 값이 바뀌어도 리렌더링을 트리거하지 않는다.

```
useRef 사용 시:  clearTimeout → 리렌더 없음 → setTimeout → 리렌더 없음 ✅
useState 사용 시: clearTimeout → 리렌더 → setTimeout → 리렌더 (타이머마다 2번 리렌더) ❌
```

### URL ↔ 상태 동기화와 무한 루프 방지

**잠재적 루프:**

```
1. 사용자 타입 "react" → setSearchQuery("react")
2. debounce → router.replace(q=react)
3. URL 변경 → useEffect 실행 → setSearchQuery("react")
4. 값이 같으므로... → 루프?
```

React 18에서 `useState` setter에 **이전과 같은 값**을 넣으면 리렌더링이 발생하지 않는다 (bailout).
3번에서 "react" → "react"로 같은 값이므로 루프가 끊긴다. ✅

하지만 **외부에서 URL이 바뀌는 경우** (태그 클릭 등)에는 정상적으로 searchQuery가 업데이트된다.

### router.push vs router.replace

| 메서드           | 브라우저 히스토리 | 뒤로가기 동작       |
| ---------------- | ----------------- | ------------------- |
| `router.push`    | 새 항목 추가      | 이전 페이지로 이동  |
| `router.replace` | 현재 항목 교체    | 그 전 페이지로 이동 |

검색어 변경은 **같은 페이지 안에서의 상태 변화**다.
`push`를 쓰면 "react" → "reac" → "rea" → "re" → "r" 검색마다 히스토리가 쌓인다.
뒤로가기를 누를 때 이 스택을 모두 거쳐야 하므로 UX가 나빠진다.

- `/bookmarks` 안에서 검색어 변경 → `router.replace`
- 다른 페이지에서 `/bookmarks`로 처음 이동 → `router.push`

---

## 구현 패턴 3: 모바일 전체화면 오버레이

### body 스크롤 잠금

오버레이가 열릴 때 배경 페이지가 스크롤되지 않도록 막는다:

```tsx
useEffect(() => {
  if (!isOpen) {
    setQuery("");
    return;
  }
  document.body.style.overflow = "hidden"; // 스크롤 잠금
  return () => {
    document.body.style.overflow = ""; // 원복
  };
}, [isOpen]);
```

**cleanup 함수가 중요한 이유:**
오버레이가 닫힐 때 `overflow: hidden`이 남아 있으면 페이지 전체가 스크롤 불가가 된다.
useEffect의 return 함수(cleanup)는 컴포넌트 언마운트 또는 의존성 변경 전에 실행된다.

### 자동 포커스 (setTimeout 사용 이유)

```tsx
const timer = setTimeout(() => inputRef.current?.focus(), 50);
```

오버레이가 열리는 CSS 애니메이션이 진행되는 동안 DOM 노드가 아직 화면에 완전히 렌더링되지 않을 수 있다.
`setTimeout`으로 짧게 딜레이를 주면 렌더링이 완료된 후 포커스가 맞춰진다.
cleanup에서 `clearTimeout(timer)`를 호출해 오버레이가 즉시 닫힐 경우 불필요한 포커스 시도를 방지한다.

---

## 최근 검색어 — localStorage 패턴

### useState 초기화에서 localStorage 읽기

```tsx
const [searches, setSearches] = useState<string[]>(() => load());
```

`useState`에 함수를 전달하면 **컴포넌트 최초 렌더링 시 1번만 실행**된다.
이를 **lazy initializer** 라고 한다.

`useState(load())` (함수 호출 형태)와의 차이:

```
useState(load())      → 렌더링마다 load() 실행 (낭비)
useState(() => load()) → 최초 렌더링에서만 load() 실행 (효율적)
```

localStorage 접근은 동기적이지만 비용이 있다. lazy initializer로 최적화한다.

### SSR 안전 처리

```tsx
function load(): string[] {
  if (typeof window === "undefined") return []; // 서버에서는 localStorage 없음
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return []; // JSON 파싱 실패 시 빈 배열
  }
}
```

Next.js는 서버에서도 컴포넌트를 렌더링한다.
서버 환경에는 `window`와 `localStorage`가 없으므로, 접근 전에 반드시 확인해야 한다.

---

## 패턴 요약

| 패턴                                      | 사용 위치                | 핵심 이유                                           |
| ----------------------------------------- | ------------------------ | --------------------------------------------------- |
| `mousedown`으로 외부 클릭 감지            | SearchDropdown           | blur보다 먼저 발생하여 드롭다운 안 클릭을 정상 처리 |
| `useRef`로 debounce 타이머 관리           | Header 검색 입력         | 타이머 변경이 리렌더링 유발하지 않음                |
| `router.replace` (검색어 변경)            | /bookmarks 내부          | 히스토리 스택 오염 방지                             |
| `router.push` (첫 진입)                   | 다른 페이지 → /bookmarks | 뒤로가기로 원래 페이지 복귀 가능                    |
| `document.body.style.overflow = "hidden"` | 모바일 오버레이          | 배경 스크롤 방지                                    |
| lazy initializer `() => load()`           | useRecentSearches        | localStorage를 최초 1회만 읽음                      |
| `typeof window === "undefined"` 체크      | localStorage 접근 전     | SSR 환경 안전 처리                                  |
