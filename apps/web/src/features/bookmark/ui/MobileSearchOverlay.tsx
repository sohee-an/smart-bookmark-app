"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowRight, Clock, Hash } from "lucide-react";
import { SearchIcon } from "@smart-bookmark/ui/icons";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (q: string) => void;
  onTagSelect: (tag: string) => void;
  bookmarks: Bookmark[];
  recentSearches: string[];
  onRecentRemove: (q: string) => void;
  frequentTags: string[];
}

export function MobileSearchOverlay({
  isOpen,
  onClose,
  onSearch,
  onTagSelect,
  bookmarks,
  recentSearches,
  onRecentRemove,
  frequentTags,
}: MobileSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;

  const quickResults = hasQuery
    ? bookmarks
        .filter(
          (b) =>
            b.title?.toLowerCase().includes(query.toLowerCase()) ||
            b.summary?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800">
            <SearchIcon size={16} className="shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="북마크 검색..."
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
            />
          </div>
        </form>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {!hasQuery && (
          <>
            {recentSearches.length > 0 && (
              <div className="mb-6">
                <p className="mb-3 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  최근 검색
                </p>
                <div className="space-y-1">
                  {recentSearches.map((s) => (
                    <div key={s} className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          onSearch(s);
                          onClose();
                        }}
                        className="flex flex-1 items-center gap-3 rounded-xl px-2 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        <Clock size={14} className="shrink-0 text-zinc-400" />
                        {s}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRecentRemove(s)}
                        className="p-2 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600"
                        aria-label="삭제"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {frequentTags.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                  태그로 탐색
                </p>
                <div className="flex flex-wrap gap-2">
                  {frequentTags.slice(0, 12).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        onTagSelect(tag);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      <Hash size={12} />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {recentSearches.length === 0 && frequentTags.length === 0 && (
              <p className="mt-12 text-center text-sm text-zinc-400">검색어를 입력해보세요.</p>
            )}
          </>
        )}

        {hasQuery && (
          <div>
            {quickResults.length > 0 && (
              <div className="mb-3 space-y-1">
                {quickResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSearch(query);
                      onClose();
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {b.title || b.url}
                      </p>
                      {b.summary && (
                        <p className="mt-0.5 truncate text-xs text-zinc-400">{b.summary}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {quickResults.length === 0 && (
              <p className="mb-3 text-sm text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  &quot;{query}&quot;
                </span>{" "}
                검색 결과가 없어요.
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                onSearch(query);
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3.5 text-sm font-bold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <span>&quot;{query}&quot; 전체 결과 보기</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
