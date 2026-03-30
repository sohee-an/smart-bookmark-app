"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RecentBookmarkSlider } from "@/widgets/bookmark/RecentBookmarkSlider";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { AddToCollectionButton } from "@/features/collection/ui/AddToCollectionButton";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from "@/features/bookmark/model/queries";
import { useBookmarkPipeline } from "@/features/bookmark/model/useBookmarkPipeline";
import { overlay } from "@/shared/lib/overlay/overlay";
import { AddBookmarkOverlay } from "@/features/bookmark/ui/AddBookmarkOverlay";
import type { Bookmark } from "@/entities/bookmark/model/types";

export default function HomeContent() {
  const router = useRouter();
  const { selectedBookmarkId, setSelectedBookmarkId } = useBookmarkStore();
  const { data: bookmarks = [], isLoading } = useBookmarks();
  const { mutate: updateBookmark, mutateAsync: updateBookmarkAsync } = useUpdateBookmark();
  const { mutateAsync: deleteBookmarkAsync } = useDeleteBookmark();
  const { runPipeline, patchCache } = useBookmarkPipeline();

  const retryCounts = useRef<Record<string, number>>({});
  const [exhaustedIds, setExhaustedIds] = useState<Set<string>>(new Set());

  // 마운트 시 5분+ stuck 북마크 자동 failed 처리
  useEffect(() => {
    if (!bookmarks.length) return;
    const STALE_MS = 5 * 60 * 1000;
    const now = Date.now();
    bookmarks.forEach((b) => {
      if (
        (b.aiStatus === "crawling" || b.aiStatus === "processing") &&
        now - new Date(b.createdAt).getTime() > STALE_MS
      ) {
        const failedStatus = b.aiStatus === "crawling" ? "crawl_failed" : "failed";
        updateBookmark({ id: b.id, data: { aiStatus: failedStatus } });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!bookmarks.length]);

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

  const handlePanelDelete = async (id: string) => {
    await deleteBookmarkAsync(id);
    setSelectedBookmarkId(null);
  };

  const handleRetry = (bookmark: Bookmark) => {
    const count = retryCounts.current[bookmark.id] ?? 0;
    if (count >= 3) {
      setExhaustedIds((prev) => new Set(prev).add(bookmark.id));
      return;
    }
    retryCounts.current[bookmark.id] = count + 1;
    patchCache(bookmark.id, { aiStatus: "crawling" });
    runPipeline(bookmark.id, bookmark.url);
  };

  return (
    <div className="selection:bg-brand-primary/20 selection:text-brand-primary min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <BookmarkDetailPanel
        bookmark={selectedBookmark}
        onSave={handlePanelSave}
        onDelete={handlePanelDelete}
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
          isLoading={isLoading}
        />

        <section className="mx-auto max-w-7xl border-t border-zinc-200 px-4 py-8 sm:px-6 lg:px-8 dark:border-zinc-800">
          <div className="mb-6 flex items-baseline gap-2">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              나의 모든 북마크
            </h2>
            <span className="text-sm text-zinc-400 dark:text-zinc-500">
              {allBookmarks.length}개
            </span>
          </div>
          <BookmarkList
            bookmarks={allBookmarks}
            isLoading={isLoading}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={handleTagClick}
            onRetry={handleRetry}
            getRetryExhausted={(id) => exhaustedIds.has(id)}
            emptyMessage="북마크를 추가하세요."
            onAddClick={() =>
              overlay.open(({ isOpen, close }) => (
                <AddBookmarkOverlay isOpen={isOpen} onClose={close} />
              ))
            }
          />
        </section>
      </main>
    </div>
  );
}
