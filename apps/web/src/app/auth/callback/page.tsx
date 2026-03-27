"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/shared/api/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromExtension = searchParams.get("from") === "extension";

  useEffect(() => {
    const redirect = (session: boolean) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      // extension에서 온 경우 토큰 전달 페이지로
      router.replace(fromExtension ? "/auth/extension-token" : "/");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") redirect(!!session);
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirect(true);
    });

    return () => subscription.unsubscribe();
  }, [router, fromExtension]);

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
        <p className="text-sm text-zinc-500">로그인 처리 중...</p>
      </div>
    </div>
  );
}
