import Head from "next/head";
import { useRouter } from "next/router";
import { Header } from "@/components/layout/Header";
import { RecentBookmarkSlider } from "@/widgets/bookmark/RecentBookmarkSlider";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { useEffect, useState } from "react";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { supabase } from "@/shared/api/supabase/client";
import storage from "@/shared/lib/storage";
import { X } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { bookmarks, setBookmarks, setSelectedBookmarkId, updateBookmark } = useBookmarkStore();
  const [showGuestBanner, setShowGuestBanner] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const isGuest = !user && storage.cookie.get("is_guest") === "true";
      if (isGuest) setShowGuestBanner(true);
    };
    check();
  }, []);

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

      {/* 게스트 유저 로그인 유도 배너 */}
      {showGuestBanner && (
        <div className="bg-brand-primary/10 border-brand-primary/20 dark:bg-brand-primary/5 border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              지금은 최대 <span className="text-brand-primary font-bold">5개</span>까지 저장할 수
              있어요. 로그인하면 북마크를 무제한으로 저장하고 AI 검색도 사용할 수 있어요.
            </p>
            <div className="flex flex-none items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="bg-brand-primary hover:bg-brand-primary-hover rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setShowGuestBanner(false)}
                className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 우측 슬라이드 패널 */}
      <BookmarkDetailPanel onSave={handlePanelSave} onTagClick={handleTagClick} />

      <main className="pb-20">
        <RecentBookmarkSlider
          bookmarks={(bookmarks ?? []).slice(0, 5)}
          onBookmarkClick={handleBookmarkClick}
          onTagClick={handleTagClick}
          onViewAll={() =>
            document.getElementById("all-bookmarks")?.scrollIntoView({ behavior: "smooth" })
          }
        />

        <section
          id="all-bookmarks"
          className="mx-auto max-w-7xl scroll-mt-24 border-t border-zinc-200 px-4 py-8 sm:px-6 lg:px-8 dark:border-zinc-800"
        >
          <h2 className="mb-6 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            나의 모든 북마크
          </h2>
          <BookmarkList
            bookmarks={bookmarks ?? []}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={handleTagClick}
          />
        </section>
      </main>
    </div>
  );
}
