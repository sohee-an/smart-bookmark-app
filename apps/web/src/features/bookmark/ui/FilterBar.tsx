import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  allTags: string[];
  recentTags: string[];
}

export const FilterBar = ({
  selectedTags,
  onTagClick,
  onTagRemove,
  allTags,
  recentTags,
}: FilterBarProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const TagChip = ({ tag }: { tag: string }) => {
    const active = selectedTags.includes(tag);
    return (
      <button
        onClick={() => onTagClick(tag)}
        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
          active
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        }`}
      >
        #{tag}
        {active && <span className="ml-0.5 text-white/60 dark:text-zinc-900/60">✓</span>}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      {/* 필터 버튼 */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <SlidersHorizontal size={15} />
        필터
        {selectedTags.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-black text-white dark:bg-zinc-100 dark:text-zinc-900">
            {selectedTags.length}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute top-full left-0 z-20 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {recentTags.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                최근 북마크 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentTags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            </div>
          )}

          {allTags.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                전체 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            </div>
          )}

          {allTags.length === 0 && recentTags.length === 0 && (
            <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">태그가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
};
