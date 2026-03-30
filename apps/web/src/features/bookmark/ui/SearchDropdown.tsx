"use client";

import { Clock, X, ArrowRight, Hash } from "lucide-react";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface SearchDropdownProps {
  query: string;
  bookmarks: Bookmark[];
  recentSearches: string[];
  frequentTags: string[];
  onSearchSelect: (q: string) => void;
  onTagSelect: (tag: string) => void;
  onRecentRemove: (q: string) => void;
  onViewAll: () => void;
}

export function SearchDropdown({
  query,
  bookmarks,
  recentSearches,
  frequentTags,
  onSearchSelect,
  onTagSelect,
  onRecentRemove,
  onViewAll,
}: SearchDropdownProps) {
  const hasQuery = query.trim().length > 0;

  const quickResults = hasQuery
    ? bookmarks
        .filter(
          (b) =>
            b.title?.toLowerCase().includes(query.toLowerCase()) ||
            b.summary?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 4)
    : [];

  const showEmpty = hasQuery && quickResults.length === 0;

  if (!hasQuery && recentSearches.length === 0 && frequentTags.length === 0) return null;

  return (
    <div className="absolute top-full left-0 z-50 mt-2 w-full min-w-[340px] rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      {!hasQuery && (
        <>
          {recentSearches.length > 0 && (
            <div className="p-3">
              <p className="mb-2 px-2 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                최근 검색
              </p>
              <div className="space-y-0.5">
                {recentSearches.map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <button
                      type="button"
                      onClick={() => onSearchSelect(s)}
                      className="flex flex-1 items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <Clock size={13} className="shrink-0 text-zinc-400" />
                      {s}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRecentRemove(s)}
                      className="p-1 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                      aria-label="삭제"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {frequentTags.length > 0 && (
            <div
              className={`p-3 ${recentSearches.length > 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""}`}
            >
              <p className="mb-2 px-2 text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
                태그로 탐색
              </p>
              <div className="flex flex-wrap gap-1.5 px-2">
                {frequentTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagSelect(tag)}
                    className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <Hash size={10} />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {hasQuery && (
        <div className="p-3">
          {quickResults.length > 0 && (
            <div className="mb-1 space-y-0.5">
              {quickResults.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSearchSelect(query)}
                  className="flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {b.title || b.url}
                    </p>
                    {b.summary && <p className="truncate text-xs text-zinc-400">{b.summary}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showEmpty && (
            <p className="px-2 py-2 text-sm text-zinc-400">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">"{query}"</span> 검색
              결과가 없어요.
            </p>
          )}

          <button
            type="button"
            onClick={onViewAll}
            className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${
              quickResults.length > 0 || showEmpty
                ? "border-t border-zinc-100 pt-3 dark:border-zinc-800"
                : ""
            }`}
          >
            <span>"{query}" 전체 결과 보기</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
