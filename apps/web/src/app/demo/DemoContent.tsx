"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { makeFakeBookmarks } from "@/features/bookmark/lib/fakeBookmarks";
import { VirtualBookmarkGrid } from "@/features/bookmark/ui/VirtualBookmarkGrid";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";

const COUNT_PRESETS = [2000, 5000, 10000];

export function DemoContent() {
  const params = useSearchParams();
  const count = Math.min(Math.max(Number(params.get("count")) || 2000, 1), 10000);
  const virtual = params.get("virtual") !== "off";

  // 메모리에서만 생성 — DB/localStorage 저장 없음 (순수 렌더 성능 측정용)
  const bookmarks = useMemo(() => makeFakeBookmarks(count), [count]);
  const noop = () => {};

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-black tracking-tight">
            가상 스크롤 성능 데모{" "}
            <span className="text-brand-primary">{count.toLocaleString()}개</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            가짜 데이터를 메모리에서 생성해 렌더 성능만 측정합니다 (DB 저장 없음). 아래 토글로{" "}
            <b>가상화 ON/OFF</b>를 직접 비교해 보세요.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            💡 빠른 기기에선 체감이 작을 수 있어요. DevTools <b>Elements</b>에서 DOM 노드 수(ON은
            수십 개, OFF는 전체)를 비교하거나, <b>Performance → CPU 6x 스로틀</b>로 느린 기기를
            시뮬레이션하면 차이가 확실합니다.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-400">개수</span>
            {COUNT_PRESETS.map((n) => (
              <Link
                key={n}
                href={`/demo?count=${n}${virtual ? "" : "&virtual=off"}`}
                className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                  count === n
                    ? "bg-brand-primary text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {n.toLocaleString()}
              </Link>
            ))}
            <span className="ml-2 text-zinc-400">가상화</span>
            <Link
              href={`/demo?count=${count}`}
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                virtual
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              ON
            </Link>
            <Link
              href={`/demo?count=${count}&virtual=off`}
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                !virtual
                  ? "bg-red-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              OFF
            </Link>
          </div>

          {!virtual && (
            <p className="mt-2 text-xs font-medium text-red-500">
              ⚠️ 가상화 OFF — {count.toLocaleString()}개를 모두 DOM에 렌더합니다. 초기 로딩·스크롤이
              버벅일 수 있어요 (개수가 크면 브라우저가 잠시 멈출 수 있음).
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {virtual ? (
          <VirtualBookmarkGrid bookmarks={bookmarks} onBookmarkClick={noop} onTagClick={noop} />
        ) : (
          <BookmarkList bookmarks={bookmarks} onBookmarkClick={noop} onTagClick={noop} />
        )}
      </main>
    </div>
  );
}
