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
