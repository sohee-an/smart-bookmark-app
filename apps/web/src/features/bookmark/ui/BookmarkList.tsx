import { Bookmark as BookmarkIcon } from "lucide-react";
import { BookmarkCard } from "@/entities/bookmark/ui/BookmarkCard";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onBookmarkClick: (bookmark: Bookmark) => void;
  onTagClick: (tag: string) => void;
  emptyMessage?: string;
}

export const BookmarkList = ({
  bookmarks,
  onBookmarkClick,
  onTagClick,
  emptyMessage = "검색 결과가 없습니다.",
}: BookmarkListProps) => {
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
        />
      ))}
    </div>
  );
};
