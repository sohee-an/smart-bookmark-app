"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { RecentBookmarkSlider } from "@/widgets/bookmark/RecentBookmarkSlider";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { AddToCollectionButton } from "@/features/collection/ui/AddToCollectionButton";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import { useBookmarks, useUpdateBookmark } from "@/features/bookmark/model/queries";
import type { Bookmark } from "@/entities/bookmark/model/types";

export default function HomeContent() {
  const router = useRouter();
  const { selectedBookmarkId, setSelectedBookmarkId } = useBookmarkStore();
  const { data: bookmarks = [] } = useBookmarks();
  const { mutate: updateBookmark, mutateAsync: updateBookmarkAsync } = useUpdateBookmark();

  const selectedBookmark = bookmarks.find((b) => b.id === selectedBookmarkId) ?? null;

  const now = Date.now();
  const recentBookmarks = bookmarks.filter(
    (b) => now - new Date(b.createdAt).getTime() <= 24 * 60 * 60 * 1000
  );
  const recentIds = new Set(recentBookmarks.map((b) => b.id));
  const allBookmarks = bookmarks.filter((b) => !recentIds.has(b.id));

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmarkId(bookmark.id);
    if (bookmark.status === "unread") {
      updateBookmark({ id: bookmark.id, data: { status: "read" } });
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedBookmarkId(null);
    router.push(`/bookmarks?tag=${encodeURIComponent(tag)}`);
  };

  const handlePanelSave = async (id: string, data: Pick<Bookmark, "title" | "tags">) => {
    await updateBookmarkAsync({ id, data });
  };

  return (
    <div className="selection:bg-brand-primary/20 selection:text-brand-primary min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header />

      <BookmarkDetailPanel
        bookmark={selectedBookmark}
        onSave={handlePanelSave}
        onTagClick={handleTagClick}
        actions={
          selectedBookmark ? <AddToCollectionButton bookmarkId={selectedBookmark.id} /> : undefined
        }
      />

      <main className="pb-20">
        <RecentBookmarkSlider
          bookmarks={recentBookmarks}
          onBookmarkClick={handleBookmarkClick}
          onTagClick={handleTagClick}
        />

        <section className="mx-auto max-w-7xl border-t border-zinc-200 px-4 py-8 sm:px-6 lg:px-8 dark:border-zinc-800">
          <h2 className="mb-6 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            나의 모든 북마크
          </h2>
          <BookmarkList
            bookmarks={allBookmarks}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={handleTagClick}
            emptyMessage="북마크를 추가하세요."
          />
        </section>
      </main>
    </div>
  );
}
