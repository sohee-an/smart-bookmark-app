import { Suspense } from "react";
import { CollectionDetailContent } from "./CollectionDetailContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

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
