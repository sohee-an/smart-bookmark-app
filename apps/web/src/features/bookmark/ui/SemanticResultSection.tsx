import { Sparkles } from "lucide-react";
import { BookmarkCard } from "@/entities/bookmark/ui/BookmarkCard";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface SemanticBookmark extends Bookmark {
  similarity: number;
}

interface SemanticResultSectionProps {
  exact: SemanticBookmark[];
  related: SemanticBookmark[];
  isLoading: boolean;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onTagClick: (tag: string) => void;
}

export const SemanticResultSection = ({
  exact,
  related,
  isLoading,
  onBookmarkClick,
  onTagClick,
}: SemanticResultSectionProps) => {
  if (isLoading) {
    return (
      <div className="mt-10">
        <SectionHeader />
        <div className="flex items-center gap-2 py-8 text-sm text-zinc-400 dark:text-zinc-500">
          <Sparkles size={16} className="animate-pulse" />
          AI가 의미를 분석하는 중...
        </div>
      </div>
    );
  }

  if (exact.length === 0 && related.length === 0) return null;

  return (
    <div className="mt-10">
      <SectionHeader />

      {exact.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            정확한 결과 ({exact.length})
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {exact.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onClick={onBookmarkClick}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            연관된 결과 ({related.length})
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {related.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onClick={onBookmarkClick}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionHeader = () => (
  <div className="mb-4 flex items-center gap-2">
    <Sparkles size={16} className="text-brand-primary" />
    <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">AI 의미 검색 결과</h2>
    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
  </div>
);
