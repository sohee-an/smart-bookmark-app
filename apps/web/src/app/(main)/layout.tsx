import type { ReactNode } from "react";
import { Suspense } from "react";
import { Header } from "@/widgets/layout/Header";
import { BookmarkRealtimeSync } from "@/features/bookmark/ui/BookmarkRealtimeSync";
import { getAuthState } from "@/shared/api/supabase/getAuthState";

export default async function MainLayout({ children }: { children: ReactNode }) {
  // 게스트 여부도 서버에서 판정해 내려줌 — 클라이언트 렌더 중 쿠키를 읽으면 hydration 불일치
  const { user, isGuest } = await getAuthState();

  return (
    <>
      {user && <BookmarkRealtimeSync userId={user.id} />}
      <Suspense
        fallback={
          <div className="h-16 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
        }
      >
        <Header user={user} isGuest={isGuest} />
      </Suspense>
      {children}
    </>
  );
}
