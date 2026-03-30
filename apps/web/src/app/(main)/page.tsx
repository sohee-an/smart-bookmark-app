import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import HomeContent from "./_home-content";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";
import { bookmarkKeys } from "@/features/bookmark/model/queries";
import { fetchBookmarksServer } from "@/entities/bookmark/api/bookmark.server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

export const metadata: Metadata = {
  title: "SmartMark - 스마트 북마크 관리",
};

export default async function HomePage() {
  const queryClient = new QueryClient();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: bookmarkKeys.list(),
      queryFn: fetchBookmarksServer,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<PageLoadingSkeleton />}>
        <HomeContent />
      </Suspense>
    </HydrationBoundary>
  );
}
