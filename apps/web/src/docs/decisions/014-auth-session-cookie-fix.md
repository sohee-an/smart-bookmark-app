# 플랜: Supabase 인증 세션 쿠키 버그 수정

## Context

회원가입/로그인 후 세션이 쿠키에 저장되지 않아 미들웨어가 항상 "인증 없음"으로 판단하여 `/landing`으로 튕기는 버그.

**근본 원인 2가지:**

1. `supabase.ts`가 `createClient` (localStorage 저장) 사용 중
   → 미들웨어는 쿠키를 읽는데, 세션이 localStorage에 있어서 미들웨어가 못 찾음

2. `/api/auth/callback` 라우트 없음
   → 이메일 인증 링크 클릭 시 code를 JWT로 교환하는 곳이 없어서 쿠키 생성 안 됨

**참고 문서:** `apps/web/src/docs/decisions/013-AUTH 관련.md` (섹션 4 - OAuth Authorization Code Flow)

---

## 수정할 파일

| 파일                                                 | 작업                                        |
| ---------------------------------------------------- | ------------------------------------------- |
| `apps/web/src/shared/api/supabase.ts`                | `createClient` → `createBrowserClient` 교체 |
| `apps/web/src/pages/api/auth/callback.ts`            | 신규 생성                                   |
| `apps/web/src/docs/issue/001-auth-session-cookie.md` | 신규 생성 (이슈 문서)                       |

---

## 구현 내용

### 1. `supabase.ts` 수정

```ts
// Before
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(url, key);

// After
import { createBrowserClient } from "@supabase/ssr";
export const supabase = createBrowserClient(url, key);
```

`createBrowserClient`는 세션을 쿠키에 저장 → 미들웨어가 읽을 수 있음.

### 2. `/api/auth/callback.ts` 신규 생성

```ts
import { createServerClient } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (code) {
    const supabase = createServerClient(url, key, {
      cookies: {
        /* req/res 기반 쿠키 읽기/쓰기 */
      },
    });
    await supabase.auth.exchangeCodeForSession(String(code));
  }

  res.redirect("/");
}
```

이메일 인증 링크 → `/api/auth/callback?code=xxx` → JWT 교환 → 쿠키 저장 → `/` 리다이렉트.

### 3. Supabase 대시보드 설정 (수동)

Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/api/auth/callback` 추가

### 4. 이슈 문서 생성

`apps/web/src/docs/issue/001-auth-session-cookie.md`에 버그 증상, 원인, 수정 내용 기록.

---

## 검증

```
1. pnpm dev 실행
2. 회원가입 → 이메일 인증 링크 클릭 → / 로 이동 확인 (landing 튕김 없음)
3. 로그인 → / 로 이동 확인
4. 새로고침 후에도 로그인 상태 유지 확인
```
