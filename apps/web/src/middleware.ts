import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // 1. Supabase 유저 확인 (getSession은 쿠키 위변조 가능 → getUser로 서버 검증)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. 게스트 쿠키 확인
  const isGuest = request.cookies.get("is_guest")?.value === "true";

  const isAuth = !!user || isGuest;
  const { pathname } = request.nextUrl;

  const isLandingPage = pathname === "/landing";
  const isLoginPage = pathname === "/login";
  const isPublicPage = pathname === "/privacy";

  // 인증된 사용자가 랜딩/로그인 페이지 접근 시
  if (isAuth && (isLandingPage || isLoginPage)) {
    // 익스텐션에서 온 경우 → 토큰을 익스텐션에 전달
    const fromExtension = request.nextUrl.searchParams.get("from") === "extension";
    if (fromExtension && user) {
      return NextResponse.redirect(new URL(`/auth/extension-token`, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 비인증 사용자가 보호된 페이지(메인 등) 접근 시 랜딩('/landing')으로
  if (
    !isAuth &&
    !isLandingPage &&
    !isLoginPage &&
    !isPublicPage &&
    !pathname.startsWith("/auth/callback") &&
    !pathname.startsWith("/auth/extension-token") &&
    !pathname.startsWith("/auth/web-redirect") &&
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
