"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/shared/api/supabase/client";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromExtension = searchParams.get("from") === "extension";

  useEffect(() => {
    const redirect = (session: boolean) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      router.replace(fromExtension ? "/auth/extension-token" : "/");
      // 새 세션으로 서버 컴포넌트(layout/Header)를 재판정하도록 라우터 캐시 무효화
      // (이메일 로그인·게스트 전환 지점들과 동일하게 인증 변이 후 refresh)
      router.refresh();
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

  return null;
}
