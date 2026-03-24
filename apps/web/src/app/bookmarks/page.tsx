import { Suspense } from "react";
import type { Metadata } from "next";
import { BookmarksContent } from "./BookmarksContent";

export const metadata: Metadata = {
  title: "북마크 검색 — SmartMark",
};

export default function BookmarksPage() {
  return (
    <Suspense>
      <BookmarksContent />
    </Suspense>
  );
}
