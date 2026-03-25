import { Suspense } from "react";
import { CollectionDetailContent } from "./CollectionDetailContent";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense>
      <CollectionDetailContent id={id} />
    </Suspense>
  );
}
