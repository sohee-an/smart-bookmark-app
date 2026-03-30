"use client";

import { useEffect, ReactNode } from "react";
import { supabase } from "@/shared/api/supabase/client";
import { useAuthStore } from "@/shared/model/useAuthStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!error) setUser(user);
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setInitialized]);

  return <>{children}</>;
}
