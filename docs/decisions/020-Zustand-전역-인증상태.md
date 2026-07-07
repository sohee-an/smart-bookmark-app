# 020 — Zustand 전역 Auth 상태와 SPA 네비게이션 깜빡임 해결

## 문제: 페이지 이동마다 헤더가 깜빡힌다

Header 컴포넌트 안에서 직접 Supabase `getUser()`를 호출했을 때 발생한 현상:

```
메인(/) → 검색(/bookmarks) 이동
    ↓
Header 컴포넌트 새로 마운트
    ↓
loading = true → 컬렉션 링크, 유저 아바타 숨겨짐
    ↓ (getUser() 비동기, 수십~수백ms 소요)
loading = false → 다시 나타남 → 레이아웃 점프
```

이 현상을 **CLS(Cumulative Layout Shift)** 라고 한다.
사용자 눈에는 "UI가 깜빡인다", "요소가 갑자기 나타난다"처럼 보인다.

---

## 원인 분석: 왜 이동마다 깜빡이는가?

### Next.js App Router에서 컴포넌트 생명주기

App Router는 레이아웃(`layout.tsx`)은 재사용하지만,
**각 페이지 컴포넌트는 라우트 이동마다 새로 마운트된다.**

```
/ (page)         /bookmarks (page)
  └── Header       └── Header  ← 다른 인스턴스
```

이 프로젝트에서 `Header`는 `layout.tsx`가 아닌 각 페이지 컴포넌트 안에서 렌더링된다.
따라서 `/` → `/bookmarks` 이동 시 Header가 언마운트됐다가 새로 마운트된다.
새로 마운트된 Header는 자체 `loading` 상태를 다시 `true`로 시작한다.

### 왜 같은 컴포넌트인데 상태가 초기화되는가?

React의 컴포넌트 인스턴스는 DOM 위치와 연결된다.
같은 `Header` 함수 컴포넌트라도 **다른 위치에서 마운트되면 별개의 인스턴스**다.
각 인스턴스는 독립적인 state를 갖는다.

```
// 이전 코드 — 각 Header 인스턴스가 개별적으로 auth 체크
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true); // 항상 true로 시작

useEffect(() => {
  supabase.auth.getUser().then(...) // 매번 비동기 요청
}, []);
```

---

## 해결: Zustand 전역 스토어

### 핵심 원리

Zustand 스토어는 **컴포넌트 외부**에 존재한다.
React 컴포넌트 트리와 무관하게 메모리에 유지된다.

```
컴포넌트 트리    ↔    Zustand Store (메모리에 상주)
Header (/)          { user: User, initialized: true }
    ↓ 이동
Header (/bookmarks) ↔    같은 스토어 읽기 → user 즉시 사용 가능
```

이동 후 새로 마운트된 Header가 스토어를 읽으면 이미 채워진 값이 있다.
`loading` 상태가 필요 없고, 깜빡임이 발생하지 않는다.

### 구현 구조

```
AuthProvider (layout.tsx에서 단 1회 초기화)
    ↓ setUser(), setInitialized()
useAuthStore (Zustand 스토어)
    ↑ useAuthStore() 읽기
Header, 다른 컴포넌트들
```

**AuthProvider** — 앱 루트에 1번만 마운트, auth 초기화 담당:

```tsx
// layout.tsx 안에서 한 번만 실행됨
useEffect(() => {
  supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (!error) setUser(user);
    setInitialized(true);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, [setUser, setInitialized]);
```

**Header** — 스토어에서 읽기만 함:

```tsx
const { user, initialized } = useAuthStore();
// loading 상태 없음, 이미 초기화된 값을 즉시 사용
```

---

## 초기 페이지 로드 시 skeleton

Zustand는 SPA 내 이동 깜빡임을 막아주지만,
**최초 페이지 로드**에서는 여전히 `initialized = false`인 순간이 있다.
이 짧은 순간 동안 `user`가 null이기 때문에 레이아웃이 틀어질 수 있다.

이를 막기 위해 `initialized`가 false인 동안 **스켈레톤(skeleton)** 을 보여준다:

```tsx
{!initialized ? (
  // 아바타 자리에 회색 원 → 레이아웃 크기 유지
  <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-100" />
) : user || isGuest ? (
  <Avatar ... />
) : (
  <button>로그인</button>
)}
```

**핵심:** `display: none`으로 숨기면 레이아웃이 무너진다.
같은 크기의 placeholder를 놓는 것이 CLS를 완전히 막는 방법이다.

---

## onAuthStateChange를 함께 구독하는 이유

`getUser()`만 쓰면 로그인/로그아웃 이벤트를 실시간으로 반영할 수 없다.

| 메서드              | 시점                    | 용도                           |
| ------------------- | ----------------------- | ------------------------------ |
| `getUser()`         | 앱 초기 마운트 시 1회   | 현재 세션 확인                 |
| `onAuthStateChange` | 세션 변화마다 자동 실행 | 로그인/로그아웃/토큰 갱신 반영 |

```
사용자가 로그아웃 클릭
    ↓
supabase.auth.signOut() 호출
    ↓
onAuthStateChange 이벤트 발생 (session = null)
    ↓
setUser(null) → 모든 Header/컴포넌트가 즉시 반응
```

`cleanup`에서 `subscription.unsubscribe()`를 반드시 호출해야
컴포넌트 언마운트 후 구독이 메모리에 남지 않는다 (메모리 누수 방지).

---

## 패턴 요약

| 상황                                  | 안 좋은 방법               | 좋은 방법                     |
| ------------------------------------- | -------------------------- | ----------------------------- |
| 여러 컴포넌트가 같은 데이터를 쓸 때   | 각 컴포넌트가 개별로 fetch | 전역 스토어에서 1회 fetch     |
| 페이지 이동 후에도 유지해야 하는 상태 | 컴포넌트 로컬 state        | Zustand 스토어                |
| 초기화 중 레이아웃 보호               | `display: none`            | 같은 크기의 skeleton          |
| 외부 이벤트(로그인/아웃) 반응         | 수동 새로고침              | 구독 패턴 (onAuthStateChange) |
