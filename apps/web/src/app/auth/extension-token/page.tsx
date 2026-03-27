"use client";

import { useEffect } from "react";
import { supabase } from "@/shared/api/supabase/client";

// Extension에서 구글 로그인 후 토큰을 URL hash에 담아 background.ts로 전달
export default function ExtensionTokenPage() {
  useEffect(() => {
    const passTokenToExtension = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // background.ts가 이 URL을 감지해서 토큰을 chrome.storage에 저장
        const params = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? "",
          expires_at: String(session.expires_at ?? ""),
        });
        window.location.href = `${window.location.origin}/auth/extension-token#${params.toString()}`;
      } else {
        window.location.href = "/login";
      }
    };

    passTokenToExtension();
  }, []);

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
        <p className="text-sm text-zinc-500">Extension으로 연결 중...</p>
      </div>
    </div>
  );
}
