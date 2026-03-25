import { Suspense } from "react";
import { CollectionsContent } from "./CollectionsContent";

export default function CollectionsPage() {
  return (
    <Suspense>
      <CollectionsContent />
    </Suspense>
  );
}
