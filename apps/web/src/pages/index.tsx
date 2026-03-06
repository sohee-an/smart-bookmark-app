import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";
import { Header } from "@/components/layout/Header";
import { RecentBookmarkSlider } from "@/widgets/bookmark/RecentBookmarkSlider";
import { useEffect } from "react";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 데모용 가짜 북마크 데이터
// const MOCK_BOOKMARKS: Bookmark[] = [
//   {
//     id: "1",
//     url: "https://nextjs.org",
//     title: "Next.js 15: The Future of React",
//     thumbnailUrl: "https://nextjs.org/_next/static/media/nextjs-logo.d7963931.svg",
//     summary:
//       "Next.js 15 introduces exciting new features like React Server Components and improved routing. It provides a robust foundation for building fast and scalable web applications.",
//     aiStatus: "completed",
//     status: "unread",
//     tags: ["React", "Next.js", "Frontend"],
//     userId: "test-user",
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   },

// ];

export default function Home() {
  const { bookmarks, setBookmarks } = useBookmarkStore();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const data = await bookmarkService.getBookmarks();
        setBookmarks(data); // store에 저장
      } catch (error) {
        console.error("북마크 로드 실패:", error);
      }
    };
    fetchBookmarks();
  }, [setBookmarks]);

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} selection:bg-brand-primary/20 selection:text-brand-primary min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}
    >
      <Head>
        <title>SmartMark - 스마트 북마크 관리</title>
      </Head>

      <Header />

      <main className="pb-20">
        {/* 최근 북마크 슬라이더 섹션 */}
        <RecentBookmarkSlider
          bookmarks={bookmarks ?? []}
          onBookmarkClick={(bookmark) => {
            console.log("Clicked:", bookmark.title);
          }}
        />

        <section className="mx-auto mt-4 max-w-7xl border-t border-zinc-200 px-4 py-8 sm:px-6 lg:px-8 dark:border-zinc-800">
          <h2 className="mb-6 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            나의 모든 북마크
          </h2>
          <div className="flex h-64 items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-zinc-500 dark:text-zinc-400">
              전체 북마크 리스트가 들어갈 자리입니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
