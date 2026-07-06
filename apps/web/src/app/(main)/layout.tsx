import type { ReactNode } from "react";
import { Suspense } from "react";
import { Header } from "@/widgets/layout/Header";
import { BookmarkRealtimeSync } from "@/features/bookmark/ui/BookmarkRealtimeSync";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user && <BookmarkRealtimeSync userId={user.id} />}
      <Suspense
        fallback={
          <div className="h-16 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        }
      >
        <Header initialUser={user} />
      </Suspense>
      {children}
    </>
  );
}
