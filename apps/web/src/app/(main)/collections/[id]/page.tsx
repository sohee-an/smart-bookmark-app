import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CollectionDetailContent } from "./CollectionDetailContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";
import { FEATURES } from "@/shared/config/features";

export const metadata: Metadata = {
  title: "컬렉션",
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!FEATURES.collections) notFound();
  const { id } = await params;
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CollectionDetailContent id={id} />
    </Suspense>
  );
}
