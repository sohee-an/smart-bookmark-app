import { ExternalLink, Loader2, AlertCircle, Bookmark as BookmarkIcon } from "lucide-react";
import { TagGroup } from "@/shared/ui/tag/Tag";
import type { Bookmark } from "../model/types";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  onTagClick?: (tag: string) => void;
  onRetry?: (bookmark: Bookmark) => void;
}

/**
 * @description 북마크 정보를 카드 형태로 보여주는 엔티티 컴포넌트입니다.
 * AI 분석 상태(aiStatus), 읽음 상태(status), 크롤링 결과에 따른 대응 UI를 포함합니다.
 */
export const BookmarkCard = ({ bookmark, onClick, onTagClick, onRetry }: BookmarkCardProps) => {
  const { title, url, thumbnailUrl, summary, tags, aiStatus, status } = bookmark;

  const isCrawling = aiStatus === "crawling";
  const isProcessing = aiStatus === "processing";
  const isFailed = aiStatus === "failed";
  const isCrawlFailed = aiStatus === "crawl_failed";
  const isUnread = status === "unread";
  const isPending = isCrawling || isProcessing;
  const isNew = Date.now() - new Date(bookmark.createdAt).getTime() <= 24 * 60 * 60 * 1000;

  return (
    <div
      onClick={() => !isPending && onClick?.(bookmark)}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white transition-all ${isPending ? "cursor-wait opacity-90" : "cursor-pointer hover:-translate-y-1 hover:shadow-2xl"} shadow-sm dark:border-zinc-800 dark:bg-zinc-900`}
    >
      {/* 1. Thumbnail Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800/50">
        {isCrawling ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-xl dark:bg-zinc-900/90">
              <Loader2 size={16} className="text-brand-primary animate-spin" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                크롤링 중...
              </span>
            </div>
          </div>
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className={`h-full w-full object-cover transition-transform duration-700 ${isProcessing ? "blur-md grayscale" : "group-hover:scale-110"}`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900">
            <div className="mb-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-800 dark:ring-zinc-700">
              <ExternalLink size={32} strokeWidth={1.5} className="text-zinc-400" />
            </div>
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              {new URL(url).hostname}
            </span>
          </div>
        )}

        {/* AI Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/20 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-xl dark:bg-zinc-900/90">
              <Loader2 size={16} className="text-brand-primary animate-spin" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                AI 분석 중...
              </span>
            </div>
          </div>
        )}

        {/* New Badge */}
        {isNew && !isPending && (
          <div className="bg-brand-primary absolute top-4 right-4 flex h-6 w-14 items-center justify-center rounded-full px-2 text-[10px] font-black text-white shadow-lg">
            NEW
          </div>
        )}
      </div>

      {/* 2. Content Area */}
      <div className="flex flex-1 flex-col p-6">
        {/* Title with Unread Dot */}
        <div className="mb-3 flex items-start gap-2">
          {isUnread && !isPending && (
            <div className="bg-brand-primary mt-2 h-2 w-2 flex-none rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          )}
          <h3
            className={`line-clamp-2 text-lg leading-snug font-black tracking-tight transition-colors ${isCrawling ? "text-zinc-300" : isProcessing ? "text-zinc-400" : "group-hover:text-brand-primary text-zinc-900 dark:text-zinc-100"}`}
          >
            {isCrawling ? (
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
            ) : (
              title || url
            )}
          </h3>
        </div>

        {/* Summary or Loading placeholder */}
        <div className="mb-6 flex-1">
          {isCrawling ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-[60%] animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : isProcessing ? (
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-[80%] animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : isCrawlFailed ? (
            <div className="space-y-2">
              <div className="bg-status-error/10 text-status-error flex items-center gap-2 rounded-xl p-3 text-xs font-medium">
                <AlertCircle size={14} />
                <span>URL을 불러오는데 실패했어요.</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(bookmark);
                  }}
                  className="text-brand-primary hover:bg-brand-primary/10 w-full rounded-xl px-3 py-2 text-xs font-bold transition-colors"
                >
                  다시 시도
                </button>
              )}
            </div>
          ) : isFailed ? (
            <div className="space-y-2">
              <div className="bg-status-error/10 text-status-error flex items-center gap-2 rounded-xl p-3 text-xs font-medium">
                <AlertCircle size={14} />
                <span>AI 요약에 실패했어요.</span>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(bookmark);
                  }}
                  className="text-brand-primary hover:bg-brand-primary/10 w-full rounded-xl px-3 py-2 text-xs font-bold transition-colors"
                >
                  다시 시도
                </button>
              )}
            </div>
          ) : (
            <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {summary || "요약된 내용이 없습니다."}
            </p>
          )}
        </div>

        {/* 3. Bottom Info: Tags & AI completed badge */}
        <div className="mt-auto flex items-center justify-between pt-4">
          {!isPending && !isCrawlFailed && (
            <TagGroup
              tags={tags}
              maxVisible={2}
              showLabel={false}
              onTagClick={onTagClick}
              onMoreClick={() => onClick?.(bookmark)}
            />
          )}

          {/* AI Completed Indicator */}
          {!isPending && !isFailed && !isCrawlFailed && summary && (
            <div
              className="bg-brand-primary/10 text-brand-primary flex h-8 w-8 items-center justify-center rounded-xl shadow-sm"
              title="AI 요약 완료"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
