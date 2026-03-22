import Head from "next/head";
import { useRouter } from "next/router";
import { Header } from "@/components/layout/Header";
import { RecentBookmarkSlider } from "@/widgets/bookmark/RecentBookmarkSlider";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { useEffect } from "react";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import type { Bookmark } from "@/entities/bookmark/model/types";

export default function Home() {
  const router = useRouter();
  const { bookmarks, setBookmarks, setSelectedBookmarkId, updateBookmark } = useBookmarkStore();

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmarkId(bookmark.id);
    if (bookmark.status === "unread") {
      bookmarkService.updateBookmark(bookmark.id, { status: "read" });
      updateBookmark(bookmark.id, { status: "read" });
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedBookmarkId(null);
    router.push(`/bookmarks?tag=${encodeURIComponent(tag)}`);
  };

  const handlePanelSave = async (id: string, data: Pick<Bookmark, "title" | "tags">) => {
    await bookmarkService.updateBookmark(id, data);
    updateBookmark(id, data);
  };

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const data = await bookmarkService.getBookmarks();
        setBookmarks(data);
      } catch (error) {
        console.error("북마크 로드 실패:", error);
      }
    };
    fetchBookmarks();
  }, [setBookmarks]);

  return (
    <div className="selection:bg-brand-primary/20 selection:text-brand-primary min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Head>
        <title>SmartMark - 스마트 북마크 관리</title>
      </Head>

      <Header />

      <BookmarkDetailPanel onSave={handlePanelSave} onTagClick={handleTagClick} />

      <main className="pb-20">
        <RecentBookmarkSlider
          bookmarks={(bookmarks ?? []).slice(0, 5)}
          onBookmarkClick={handleBookmarkClick}
          onTagClick={handleTagClick}
        />

        <section className="mx-auto max-w-7xl border-t border-zinc-200 px-4 py-8 sm:px-6 lg:px-8 dark:border-zinc-800">
          <h2 className="mb-6 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            나의 모든 북마크
          </h2>
          <BookmarkList
            bookmarks={bookmarks ?? []}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={handleTagClick}
            emptyMessage="북마크를 추가하세요."
          />
        </section>
      </main>
    </div>
  );
}
