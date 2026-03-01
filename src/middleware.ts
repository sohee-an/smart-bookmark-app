import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // 1. Supabase 세션 확인
  const { data: { session } } = await supabase.auth.getSession();
  
  // 2. 게스트 쿠키 확인
  const isGuest = request.cookies.get('is_guest')?.value === 'true';

  const isAuth = !!session || isGuest;
  const { pathname } = request.nextUrl;

  const isLandingPage = pathname === '/landing';
  const isLoginPage = pathname === '/login';

  // 인증된 사용자가 랜딩/로그인 페이지 접근 시 메인('/')으로
  if (isAuth && (isLandingPage || isLoginPage)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 비인증 사용자가 보호된 페이지(메인 등) 접근 시 랜딩('/landing')으로
  if (!isAuth && !isLandingPage && !isLoginPage && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
