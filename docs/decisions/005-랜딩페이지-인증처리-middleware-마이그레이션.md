# 랜딩 페이지 인증 처리 - useEffect → Middleware 마이그레이션

> 랜딩 페이지 세션 체크를 useEffect에서 Next.js Middleware로 이전한 과정 기록

---

## 문제 상황

### 기존 코드 (useEffect)

```ts
useEffect(() => {
  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) router.push("/");
    else if (storage.get("is_guest")) router.push("/");
  };
  checkUser();
}, [router]);
```

### 문제점

**1. 깜빡임 (Flash)**

```
사용자가 /landing 접근
  ↓
랜딩 페이지 HTML 렌더링 (사용자에게 보임)
  ↓
useEffect 실행 (클라이언트)
  ↓
이미 로그인된 사용자 → / 로 리다이렉트
```

로그인된 사용자한테 랜딩 페이지가 0.1~0.3초 보였다가 사라지는 현상 발생.

**2. localStorage를 서버에서 못 읽음**

```
is_guest → localStorage에 저장
미들웨어 → 서버에서 실행
서버는 localStorage 접근 불가
```

**3. SEO 불안정**

```
검색엔진이 페이지를 크롤링할 때
useEffect는 실행 안 됨
리다이렉트 의도가 검색엔진에 전달 안 됨
```

---

## 해결 과정

### 시도 1 — 일반 supabase 클라이언트 사용

```ts
import { supabase } from "./shared/api/supabase";

export async function middleware(request: NextRequest) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
}
```

**실패 이유**

```
미들웨어는 Edge Runtime에서 실행
일반 supabase 클라이언트는 Edge Runtime 미지원
```

---

### 시도 2 — createMiddlewareClient 사용

```ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
```

**실패 이유**

```
@supabase/auth-helpers-nextjs 구버전 패키지
현재 버전에서 createMiddlewareClient export 없음
```

---

### 시도 3 — createServerClient (deprecated)

```ts
import { createServerClient } from "@supabase/ssr";
```

**실패 이유**

```
설치된 @supabase/ssr 버전에서
기존 방식의 createServerClient가 deprecated
쿠키 처리 방식이 바뀜
```

---

### 최종 해결 — 공식문서 기반 최신 방식

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = request.cookies.get("is_guest")?.value === "true";
  const isAuth = !!user || isGuest;
  const { pathname } = request.nextUrl;

  const isLandingPage = pathname === "/landing";
  const isLoginPage = pathname === "/login";

  // 인증된 사용자 → 랜딩/로그인 접근 시 메인으로
  if (isAuth && (isLandingPage || isLoginPage)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 비인증 사용자 → 보호된 페이지 접근 시 랜딩으로
  if (
    !isAuth &&
    !isLandingPage &&
    !isLoginPage &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next")
  ) {
    return NextResponse.redirect(new URL("/landing", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
```

---

## is_guest 저장소 변경

미들웨어는 서버에서 실행되기 때문에 localStorage 접근 불가.

```
변경 전: localStorage → storage.set('is_guest', true)
변경 후: Cookie      → document.cookie = 'is_guest=true; path=/'
```

미들웨어에서 쿠키는 읽을 수 있어요.

```ts
const isGuest = request.cookies.get("is_guest")?.value === "true";
```

---

## 트레이드오프

### useEffect 방식

```
장점
  구현 단순
  익숙한 패턴

단점
  깜빡임 발생
  localStorage → 서버에서 못 읽음
  SEO 불안정
```

### Middleware 방식

```
장점
  페이지 렌더링 전에 리다이렉트
  깜빡임 없음
  서버에서 실행 → SEO 안전
  쿠키로 is_guest 관리 가능

단점
  구현 복잡
  Edge Runtime 제약 있음
  쿠키 처리 직접 구현해야 함
  Supabase 버전마다 API 달라서 공식문서 확인 필수
```

---

## getSession vs getUser

```
getSession → 로컬 쿠키에서 세션 가져옴 (서버 검증 안 함)
             토큰 만료돼도 로그인된 것처럼 보일 수 있음

getUser    → 서버에서 토큰 검증
             더 안전하지만 네트워크 요청 발생
```

진짜 서비스라면 미들웨어에서 `getUser` 사용 권장.

---

## 배운 것

```
1. 미들웨어는 Edge Runtime → 일반 클라이언트 사용 불가
2. localStorage는 브라우저 전용 → 서버에서 쿠키로 대체
3. Supabase 패키지 버전 변화가 빠름 → 공식문서 항상 확인
4. 라이브러리 API가 deprecated 되는 건 자주 있는 일
5. 에러 메시지를 읽고 공식문서에서 직접 찾는 것이 맞는 방법
```
