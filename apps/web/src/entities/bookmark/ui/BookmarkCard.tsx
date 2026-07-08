import { useState } from "react";
import Image from "next/image";
import { Loader2, AlertCircle } from "lucide-react";
import { TagGroup } from "@/shared/ui/tag/Tag";
import { useClientNow } from "@/shared/lib/useClientNow";
import type { Bookmark } from "../model/types";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onClick?: (bookmark: Bookmark) => void;
  onTagClick?: (tag: string) => void;
  onRetry?: (bookmark: Bookmark) => void;
  retryExhausted?: boolean;
}

/**
 * @description 북마크 정보를 카드 형태로 보여주는 엔티티 컴포넌트입니다.
 * AI 분석 상태(aiStatus), 읽음 상태(status), 크롤링 결과에 따른 대응 UI를 포함합니다.
 */
export const BookmarkCard = ({
  bookmark,
  onClick,
  onTagClick,
  onRetry,
  retryExhausted,
}: BookmarkCardProps) => {
  const { title, url, thumbnailUrl, summary, tags, aiStatus, status } = bookmark;

  const isCrawling = aiStatus === "crawling";
  const isProcessing = aiStatus === "processing";
  const isFailed = aiStatus === "failed";
  const isCrawlFailed = aiStatus === "crawl_failed";
  const isUnread = status === "unread";
  const isPending = isCrawling || isProcessing;

  const now = useClientNow();
  const isNew = now !== null && now - new Date(bookmark.createdAt).getTime() <= 24 * 60 * 60 * 1000;

  return (
    <div
      onClick={() => !isPending && onClick?.(bookmark)}
      onKeyDown={(e) => {
        if (isPending) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(bookmark);
        }
      }}
      role="button"
      tabIndex={isPending ? -1 : 0}
      aria-label={`북마크: ${title}`}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white transition-all ${isPending ? "cursor-wait opacity-90" : "cursor-pointer hover:-translate-y-1 hover:shadow-2xl"} focus-visible:ring-brand-primary shadow-sm focus-visible:ring-2 focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-900`}
    >
      <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-800/50">
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
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className={`object-cover transition-transform duration-700 ${isProcessing ? "blur-md grayscale" : "group-hover:scale-110"}`}
          />
        ) : (
          <ThumbnailFallback url={url} />
        )}

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

        {isNew && !isPending && (
          <div className="bg-brand-primary absolute top-4 right-4 flex h-6 w-14 items-center justify-center rounded-full px-2 text-[10px] font-black text-white shadow-lg">
            NEW
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
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
              {retryExhausted ? (
                <p className="px-3 py-2 text-center text-xs text-zinc-400">
                  재시도 횟수를 초과했어요.
                </p>
              ) : (
                onRetry && (
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
                )
              )}
            </div>
          ) : isFailed ? (
            <div className="space-y-2">
              <div className="bg-status-error/10 text-status-error flex items-center gap-2 rounded-xl p-3 text-xs font-medium">
                <AlertCircle size={14} />
                <span>AI 요약에 실패했어요.</span>
              </div>
              {retryExhausted ? (
                <p className="px-3 py-2 text-center text-xs text-zinc-400">
                  재시도 횟수를 초과했어요.
                </p>
              ) : (
                onRetry && (
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
                )
              )}
            </div>
          ) : (
            <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {summary || "요약된 내용이 없습니다."}
            </p>
          )}
        </div>

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

/**
 * og:image가 없을 때의 썸네일 폴백 — 도메인 해시 기반 고유 색 + 파비콘(실패 시 이니셜).
 * 폴백 카드들이 똑같은 회색으로 나열되면 목록 스캔이 어려워지므로 도메인마다 색·글자를 다르게 한다.
 */
function domainHue(host: string): number {
  let h = 0;
  for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) % 360;
  return h;
}

function ThumbnailFallback({ url }: { url: string }) {
  const [faviconFailed, setFaviconFailed] = useState(false);

  let hostname = "";
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    hostname = url;
  }
  const hue = domainHue(hostname);

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2.5 px-4"
      style={{ backgroundColor: `hsl(${hue} 70% 50% / 0.13)` }}
    >
      {hostname && !faviconFailed ? (
        <div className="rounded-2xl bg-white/85 p-2.5 shadow-sm dark:bg-zinc-900/70">
          <Image
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="rounded-lg"
            onError={() => setFaviconFailed(true)}
          />
        </div>
      ) : (
        <span className="text-4xl font-black" style={{ color: `hsl(${hue} 55% 45%)` }}>
          {(hostname.charAt(0) || "?").toUpperCase()}
        </span>
      )}
      <span className="max-w-full truncate text-xs font-bold tracking-wide text-zinc-500 dark:text-zinc-400">
        {hostname}
      </span>
    </div>
  );
}
