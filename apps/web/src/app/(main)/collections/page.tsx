import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CollectionsContent } from "./CollectionsContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";
import { FEATURES } from "@/shared/config/features";

export const metadata: Metadata = {
  title: "컬렉션",
  description: "북마크를 컬렉션으로 묶고 팀과 함께 관리하세요.",
};

export default function CollectionsPage() {
  if (!FEATURES.collections) notFound();
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CollectionsContent />
    </Suspense>
  );
}
