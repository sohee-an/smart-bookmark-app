"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { BookmarkCard } from "@/entities/bookmark/ui/BookmarkCard";
import type { Bookmark } from "@/entities/bookmark/model/types";

/**
 * 대용량 북마크 리스트를 위한 가상 스크롤 그리드.
 *
 * 왜 필요한가: 카드 수백~수천 개를 전부 DOM에 그리면 초기 렌더가 느리고 스크롤이 버벅인다.
 * 화면에 보이는 "행"만 렌더하고 나머지는 높이만 차지하게 해, 데이터가 아무리 많아도
 * DOM 노드 수를 일정하게 유지한다.
 *
 * 구현 포인트:
 * - window 스크롤 기반(useWindowVirtualizer) — 페이지 전체가 스크롤되는 기존 UX 유지(중첩 스크롤 없음)
 * - 반응형 그리드는 "행 단위"로 가상화: 열 수(1/2/3/4)를 계산해 카드를 행으로 묶고, 행을 virtualize
 * - 카드 높이가 내용마다 다르므로 measureElement로 실제 높이를 동적 측정(추정치는 첫 페인트용)
 * - scrollMargin으로 그리드가 페이지 상단에서 떨어진 오프셋을 보정
 */

// Tailwind 브레이크포인트와 일치: <640=1열, <1024=2열, <1280=3열, 그 이상=4열
function columnsForWidth(width: number): number {
  if (width < 640) return 1;
  if (width < 1024) return 2;
  if (width < 1280) return 3;
  return 4;
}

const ROW_GAP_PX = 20; // Tailwind gap-5
const ESTIMATED_ROW_PX = 340; // 카드 높이 추정(첫 페인트용, 이후 실측으로 보정)

interface VirtualBookmarkGridProps {
  bookmarks: Bookmark[];
  onBookmarkClick: (bookmark: Bookmark) => void;
  onTagClick: (tag: string) => void;
  onRetry?: (bookmark: Bookmark) => void;
  getRetryExhausted?: (id: string) => boolean;
}

export function VirtualBookmarkGrid({
  bookmarks,
  onBookmarkClick,
  onTagClick,
  onRetry,
  getRetryExhausted,
}: VirtualBookmarkGridProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  // 뷰포트 너비 → 열 수 (리사이즈 대응)
  useEffect(() => {
    const update = () => setColumns(columnsForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // 카드를 열 수만큼 묶어 "행" 배열로 변환 → 행 단위로 가상화
  const rows = useMemo(() => {
    const grouped: Bookmark[][] = [];
    for (let i = 0; i < bookmarks.length; i += columns) {
      grouped.push(bookmarks.slice(i, i + columns));
    }
    return grouped;
  }, [bookmarks, columns]);

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ESTIMATED_ROW_PX + ROW_GAP_PX,
    overscan: 3,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  return (
    <div ref={listRef}>
      <div style={{ position: "relative", height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              <div
                className="grid gap-5"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  paddingBottom: ROW_GAP_PX,
                }}
              >
                {row.map((bookmark) => (
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
