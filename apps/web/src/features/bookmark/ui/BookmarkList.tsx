import { Bookmark as BookmarkIcon } from "lucide-react";
import { BookmarkCard } from "@/entities/bookmark/ui/BookmarkCard";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  isLoading?: boolean;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onTagClick: (tag: string) => void;
  onRetry?: (bookmark: Bookmark) => void;
  getRetryExhausted?: (id: string) => boolean;
  emptyMessage?: string;
}

export const BookmarkList = ({
  bookmarks,
  isLoading,
  onBookmarkClick,
  onTagClick,
  onRetry,
  getRetryExhausted,
  emptyMessage = "검색 결과가 없습니다.",
}: BookmarkListProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-72 flex-col overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
            <div className="flex flex-1 flex-col gap-3 p-6">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-zinc-200 py-20 dark:border-zinc-800">
        <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-zinc-800">
          <BookmarkIcon size={28} className="text-zinc-400 dark:text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onClick={onBookmarkClick}
          onTagClick={onTagClick}
          onRetry={onRetry}
          retryExhausted={getRetryExhausted?.(bookmark.id)}
        />
      ))}
    </div>
  );
};
