import { Suspense } from "react";
import type { Metadata } from "next";
import HomeContent from "./_home-content";

export const metadata: Metadata = {
  title: "SmartMark - 스마트 북마크 관리",
};

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
