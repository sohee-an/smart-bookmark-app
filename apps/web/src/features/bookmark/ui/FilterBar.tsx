import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

type Tab = "recent" | "frequent" | "all";

interface FilterBarProps {
  selectedTags: string[];
  onTagClick: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  allTags: string[];
  recentTags: string[];
  frequentTags: string[];
}

export const FilterBar = ({
  selectedTags,
  onTagClick,
  onTagRemove,
  allTags,
  recentTags,
  frequentTags,
}: FilterBarProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("recent");
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
        type="button"
        onClick={() => (active ? onTagRemove(tag) : onTagClick(tag))}
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

  const tabs: { key: Tab; label: string; tags: string[] }[] = [
    { key: "recent", label: "최근", tags: recentTags },
    { key: "frequent", label: "자주 쓰는", tags: frequentTags },
    { key: "all", label: "전체", tags: allTags },
  ];

  const currentTags = tabs.find((t) => t.key === activeTab)?.tags ?? [];

  return (
    <div ref={ref} className="relative">
      {/* 필터 버튼 */}
      <button
        type="button"
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
        <div className="absolute top-full left-0 z-20 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* 탭 */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${
                  activeTab === tab.key
                    ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 태그 목록 */}
          <div className="p-4">
            {currentTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
                태그가 없습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
