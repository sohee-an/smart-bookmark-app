import { Suspense } from "react";
import type { Metadata } from "next";
import { DemoContent } from "./DemoContent";

export const metadata: Metadata = {
  title: "성능 데모 — 가상 스크롤",
  description: "대용량 북마크 리스트에서 가상 스크롤 성능 데모",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoContent />
    </Suspense>
  );
}
