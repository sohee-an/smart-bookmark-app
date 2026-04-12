import type { Metadata } from "next";
import { HomeContent } from "@/widgets/home/ui/HomeContent";

export const metadata: Metadata = {
  title: "SmartMark - 스마트 북마크 관리",
};

export default function HomePage() {
  return <HomeContent />;
}
