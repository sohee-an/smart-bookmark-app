# Next.js useSearchParams 빌드 에러 — Suspense 분리 패턴

## 에러 상황

`pnpm build` 실행 시 다음 에러 발생:

```
Error: Page "/login" is missing "generateStaticParams()" ...
useSearchParams() should be wrapped in a suspense boundary at page "/login"

Error: Page "/auth/callback" is missing "generateStaticParams()" ...
useSearchParams() should be wrapped in a suspense boundary at page "/auth/callback"
```

---

## 근본 원인

Next.js App Router는 빌드 시 모든 페이지를 **정적 프리렌더링(Static Prerendering)** 하려고 시도한다.

`useSearchParams()`는 URL 쿼리스트링을 읽는 훅인데, 이건 **런타임에만 알 수 있는 값**이다.
그래서 Next.js는 "이 페이지는 정적으로 못 만든다" 고 에러를 낸다.

```
빌드 시점 → URL 쿼리 알 수 없음 → useSearchParams() 쓰는 컴포넌트 렌더링 불가 → 빌드 실패
```

---

## 해결 방법: 서버 컴포넌트 + Suspense 분리

### 핵심 아이디어

| 역할                       | 파일            | 특징                                 |
| -------------------------- | --------------- | ------------------------------------ |
| 서버 컴포넌트 (껍데기)     | `page.tsx`      | 정적 렌더링 가능, Suspense로 감쌈    |
| 클라이언트 컴포넌트 (내용) | `XxxClient.tsx` | `"use client"`, useSearchParams 사용 |

`page.tsx`는 정적으로 렌더링되고, 동적인 부분(`useSearchParams`)은 클라이언트에서 처리한다.
`Suspense`가 경계 역할을 해서 "이 안의 컴포넌트는 클라이언트에서 처리해" 라고 Next.js에게 알려준다.

---

## 수정한 파일

### 1. `/login` 페이지

**Before — page.tsx 하나에 모든 로직**

```tsx
// apps/web/src/app/login/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
// ... 전부 여기에

export default function LoginPage() {
  const searchParams = useSearchParams(); // ← 빌드 에러 원인
  // ...
}
```

**After — 서버 컴포넌트 + 클라이언트 분리**

```tsx
// apps/web/src/app/login/page.tsx (서버 컴포넌트)
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
```

```tsx
// apps/web/src/app/login/LoginClient.tsx (클라이언트 컴포넌트)
"use client";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const searchParams = useSearchParams(); // ← Suspense 안에 있으므로 OK
  const fromExtension = searchParams.get("from") === "extension";
  // ... 이메일/비밀번호, 구글 OAuth 등 모든 로직
}
```

---

### 2. `/auth/callback` 페이지

같은 패턴으로 분리.

```tsx
// apps/web/src/app/auth/callback/page.tsx (서버 컴포넌트)
import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* 로딩 스피너 — 정적으로 렌더링 가능 */}
      <div className="flex flex-col items-center gap-3">
        <svg className="h-8 w-8 animate-spin text-zinc-400" ...>
          ...
        </svg>
        <p className="text-sm text-zinc-500">로그인 처리 중...</p>
      </div>
      {/* 동적 부분은 Suspense 안으로 */}
      <Suspense>
        <AuthCallbackClient />
      </Suspense>
    </div>
  );
}
```

```tsx
// apps/web/src/app/auth/callback/AuthCallbackClient.tsx (클라이언트 컴포넌트)
"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/shared/api/supabase/client";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromExtension = searchParams.get("from") === "extension";

  useEffect(() => {
    // Supabase onAuthStateChange → SIGNED_IN 이벤트 감지 → 리다이렉트
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        router.replace(fromExtension ? "/auth/extension-token" : "/");
      }
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    // 이미 세션 있으면 바로 리다이렉트
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(fromExtension ? "/auth/extension-token" : "/");
    });

    return () => subscription.unsubscribe();
  }, [router, fromExtension]);

  return null; // UI 없음 — page.tsx의 스피너가 보임
}
```

---

## Suspense fallback을 안 써도 되는 이유

```tsx
<Suspense>
  {" "}
  {/* fallback 생략 → fallback=null */}
  <LoginClient />
</Suspense>
```

`/login`처럼 LoginClient 자체가 화면 전체를 그리는 경우,
Suspense fallback을 별도로 안 써도 된다 — 어차피 클라이언트에서 바로 렌더링된다.

`/auth/callback`처럼 Suspense 바깥에 이미 로딩 UI가 있는 경우도 fallback 생략 OK.

---

## 언제 이 패턴을 써야 하나

다음 훅들이 `page.tsx`에 있으면 무조건 이 패턴으로 분리해야 한다:

| 훅                  | 이유                                          |
| ------------------- | --------------------------------------------- |
| `useSearchParams()` | URL 쿼리는 런타임에만 알 수 있음              |
| `usePathname()`     | 빌드 시 알 수 없는 경우 있음                  |
| `useRouter()`       | 단독으론 괜찮지만 위 훅과 같이 쓰면 분리 필요 |

---

## 요약

```
빌드 에러: useSearchParams()가 정적 프리렌더링 차단
    ↓
해결: page.tsx는 서버 컴포넌트로 두고 Suspense 추가
      useSearchParams 쓰는 로직은 XxxClient.tsx ("use client")로 분리
    ↓
결과: page.tsx는 정적 렌더링, XxxClient는 클라이언트 런타임에서 실행
```

---

## 관련 커밋

- `fix: 빌드 에러 수정` — auth/callback Suspense 분리
- `fix(login): useSearchParams 빌드 에러 수정 - LoginClient로 분리` — login Suspense 분리
