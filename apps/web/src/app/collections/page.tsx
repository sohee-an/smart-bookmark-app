import { Suspense } from "react";
import { CollectionsContent } from "./CollectionsContent";
import { PageLoadingSkeleton } from "@/shared/ui/PageLoadingSkeleton";

export default function CollectionsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <CollectionsContent />
    </Suspense>
  );
}
