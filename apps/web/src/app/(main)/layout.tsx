import type { ReactNode } from "react";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ConditionalRealtimeSync } from "@/shared/lib/ConditionalRealtimeSync";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <ConditionalRealtimeSync />
      <Suspense fallback={null}>
        <Header initialUser={user} />
      </Suspense>
      {children}
    </>
  );
}
