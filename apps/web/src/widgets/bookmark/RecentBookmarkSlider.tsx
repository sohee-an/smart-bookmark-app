import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { BookmarkCard } from "@/entities/bookmark/ui/BookmarkCard";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface RecentBookmarkSliderProps {
  title?: string;
  subtitle?: string;
  bookmarks: Bookmark[];
  onBookmarkClick?: (bookmark: Bookmark) => void;
}

/**
 * @description 최근 추가된 북마크를 가로 슬라이더 형태로 보여주는 반응형 위젯입니다.
 */
export const RecentBookmarkSlider = ({
  title = "최근 저장한 북마크",
  subtitle = "최근에 저장된 북마크들을 한눈에 확인하세요.",
  bookmarks,
  onBookmarkClick,
}: RecentBookmarkSliderProps) => {
  if (!bookmarks || bookmarks.length === 0) {
    return null; // 데이터가 없으면 렌더링하지 않음 (또는 Empty State UI로 변경 가능)
  }

  return (
    <section className="w-full py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 1. Header Area: Title & "View All" Button */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
              {title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          </div>

          <Link
            href="/bookmarks"
            className="group text-brand-primary flex items-center gap-1 text-sm font-bold transition-all hover:opacity-80"
          >
            전체보기
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* 2. Slider Container */}
        {/* 모바일 화면에서 양옆 여백을 뚫고 스크롤되도록 음수 마진 적용 후 내부에서 패딩으로 보정 */}
        <div className="relative -mx-4 sm:mx-0">
          <div
            className="flex w-full snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-4 pb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="w-[85vw] flex-none snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]"
              >
                <BookmarkCard bookmark={bookmark} onClick={onBookmarkClick} />
              </div>
            ))}

            {/* 스크롤 끝에 도달했을 때 모바일에서 살짝의 여백을 주기 위한 투명 Spacer */}
            <div className="w-1 flex-none sm:hidden" />
          </div>

          {/* 오른쪽 그라데이션 페이드 효과 (선택적) */}
          <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-12 bg-gradient-to-l from-zinc-50 to-transparent sm:hidden dark:from-zinc-950" />
        </div>
      </div>
    </section>
  );
};
