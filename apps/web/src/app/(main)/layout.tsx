import type { ReactNode } from "react";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ConditionalRealtimeSync } from "@/shared/lib/ConditionalRealtimeSync";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ConditionalRealtimeSync />
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      {children}
    </>
  );
}
