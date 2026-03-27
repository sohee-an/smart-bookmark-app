"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/shared/api/supabase/client";

// 익스텐션 → 웹앱 세션 연결
// URL hash에서 access_token, refresh_token을 읽어 쿠키 세션 생성 후 메인으로 이동
export default function WebRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      router.replace("/login");
      return;
    }

    // 토큰 읽은 즉시 URL에서 제거 (브라우저 히스토리에 토큰 남지 않도록)
    window.history.replaceState(null, "", window.location.pathname);

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          router.replace("/login");
        } else {
          router.replace("/");
        }
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="h-8 w-8 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm text-zinc-500">로그인 중...</p>
      </div>
    </div>
  );
}
