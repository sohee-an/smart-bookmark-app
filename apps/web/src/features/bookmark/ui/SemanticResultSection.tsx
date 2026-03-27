import { Sparkles, LogIn } from "lucide-react";
import { BookmarkCard } from "@/entities/bookmark/ui/BookmarkCard";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { useRouter } from "next/navigation";

interface SemanticBookmark extends Bookmark {
  similarity: number;
}

interface SemanticResultSectionProps {
  exact: SemanticBookmark[];
  related: SemanticBookmark[];
  isLoading: boolean;
  isGuest?: boolean;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onTagClick: (tag: string) => void;
}

export const SemanticResultSection = ({
  exact,
  related,
  isLoading,
  isGuest,
  onBookmarkClick,
  onTagClick,
}: SemanticResultSectionProps) => {
  const router = useRouter();

  if (isGuest) {
    return (
      <div className="mt-10">
        <SectionHeader />
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Sparkles size={22} className="text-zinc-400 dark:text-zinc-500" />
          </div>
          <div>
            <p className="font-bold text-zinc-700 dark:text-zinc-300">
              AI 의미 검색은 로그인 후 사용할 수 있어요
            </p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              제목이 기억 안 나도 내용으로 찾아드려요
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="bg-brand-primary hover:bg-brand-primary-hover flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white transition-all"
          >
            <LogIn size={15} />
            로그인하기
          </button>
        </div>
      </div>
    );
  }

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
