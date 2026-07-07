import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DemoContent } from "./DemoContent";

export const metadata: Metadata = {
  title: "성능 데모 — 가상 스크롤",
  description: "대용량 북마크 리스트에서 가상 스크롤 성능 데모",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  // 로컬 측정/GIF 촬영 도구로만 사용 — 프로덕션에는 노출하지 않는다 (결정 문서 025 참고)
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Suspense fallback={null}>
      <DemoContent />
    </Suspense>
  );
}
