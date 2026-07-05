import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionsContent } from "./CollectionsContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

export const metadata: Metadata = {
  title: "컬렉션",
  description: "북마크를 컬렉션으로 묶고 팀과 함께 관리하세요.",
};

export default function CollectionsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CollectionsContent />
    </Suspense>
  );
}
