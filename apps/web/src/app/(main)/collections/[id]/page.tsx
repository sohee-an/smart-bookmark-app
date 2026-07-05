import { Suspense } from "react";
import type { Metadata } from "next";
import { CollectionDetailContent } from "./CollectionDetailContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

export const metadata: Metadata = {
  title: "컬렉션",
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CollectionDetailContent id={id} />
    </Suspense>
  );
}
