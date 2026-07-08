import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { BookmarksContent } from "./BookmarksContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";
import { bookmarkKeys } from "@/features/bookmark/model/queries";
import { fetchBookmarksServer } from "@/entities/bookmark/api/bookmark.server";
import { getAuthState } from "@/shared/api/supabase/getAuthState";

export const metadata: Metadata = {
  title: "북마크 검색 — SmartMark",
};

export default async function BookmarksPage() {
  const queryClient = new QueryClient();

  // 회원만 서버 사이드 prefetch
  // 비회원은 localStorage 기반이므로 클라이언트에서 직접 fetch
  const { user, isGuest } = await getAuthState();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: bookmarkKeys.list(),
      queryFn: fetchBookmarksServer,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<PageLoadingSkeleton />}>
        <BookmarksContent isGuest={isGuest} />
      </Suspense>
    </HydrationBoundary>
  );
}
