import { OverlayProvider } from "@/shared/lib/overlay/OverlayProvider";
import { QueryProvider } from "@/shared/lib/QueryProvider";
import { BookmarkRealtimeSync } from "@/shared/lib/BookmarkRealtimeSync";
import { Toaster } from "@/shared/ui/Toaster";
import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://smart-bookmark-app-hdz6.vercel.app";

export const metadata: Metadata = {
  description: "저장은 했는데, 어디 있는지 모르겠다고요? AI가 내용을 읽고 의미로 찾아드려요.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "SmartMark — AI 북마크 관리",
    description: "저장은 했는데, 어디 있는지 모르겠다고요? AI가 내용을 읽고 의미로 찾아드려요.",
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630 }],
    locale: "ko_KR",
    siteName: "SmartMark",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartMark — AI 북마크 관리",
    description: "저장은 했는데, 어디 있는지 모르겠다고요? AI가 내용을 읽고 의미로 찾아드려요.",
    images: [`${SITE_URL}/api/og`],
  },
  icons: {
    icon: "/favicon.svg",
    other: { rel: "alternate icon", url: "/favicon.ico" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-zinc-950 antialiased`}>
        <QueryProvider>
          <BookmarkRealtimeSync />
          <OverlayProvider>
            {children}
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </OverlayProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
