import { Suspense } from "react";
import type { Metadata } from "next";
import HomeContent from "./_home-content";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

export const metadata: Metadata = {
  title: "SmartMark - 스마트 북마크 관리",
};

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
