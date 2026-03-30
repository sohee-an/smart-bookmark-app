import { Suspense } from "react";
import type { Metadata } from "next";
import { BookmarksContent } from "./BookmarksContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

export const metadata: Metadata = {
  title: "북마크 검색 — SmartMark",
};

export default function BookmarksPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <BookmarksContent />
    </Suspense>
  );
}
