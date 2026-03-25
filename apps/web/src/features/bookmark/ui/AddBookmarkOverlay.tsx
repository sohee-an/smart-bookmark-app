import React, { useState } from "react";
import { Link2, FileText, X, Plus, Lock } from "lucide-react";
import { Input } from "@/shared/ui/input/Input";
import { bookmarkService } from "../model/bookmark.service";
import { bookmarkKeys } from "../model/queries";
import { validateUrl } from "@/shared/lib/validateUrl";
import { useRouter } from "next/navigation";
import { toast } from "@/shared/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface AddBookmarkOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBookmarkOverlay = ({ isOpen, onClose }: AddBookmarkOverlayProps) => {
  const [url, setUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const patchCache = (id: string, data: Partial<Bookmark>) => {
    queryClient.setQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all }, (old = []) =>
      old.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
  };

  const handleClose = () => {
    setUrlError(null);
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }

    setIsLoading(true);

    const cachedBookmarks = queryClient.getQueryData<Bookmark[]>(bookmarkKeys.list()) ?? [];
    const isFifth = cachedBookmarks.length === 4;

    let newBookmark: Bookmark;
    try {
      // 1. DB 저장 (aiStatus: "crawling"), 카드 즉시 표시
      newBookmark = await bookmarkService.addBookmark(url, memo);
      queryClient.setQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all }, (old = []) => [
        newBookmark,
        ...old,
      ]);
      handleClose();
      if (isFifth) {
        toast.show({
          message: "북마크 5개를 모두 채웠어요! 로그인하면 무제한으로 저장할 수 있어요.",
          action: { label: "로그인", onClick: () => router.push("/login") },
          duration: 6000,
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("무료 체험 한도")) {
        setIsLimitReached(true);
      } else {
        console.error(error);
      }
      setIsLoading(false);
      return;
    }
    setIsLoading(false);

    const bookmarkId = newBookmark.id;

    // 2. 백그라운드 크롤링
    try {
      const crawlRes = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const crawlJson = await crawlRes.json();

      if (!crawlJson.success) {
        await bookmarkService.updateBookmark(bookmarkId, { aiStatus: "failed" });
        patchCache(bookmarkId, { aiStatus: "failed" });
        return;
      }

      const { title, thumbnailUrl, description, bodyChunks } = crawlJson.data;

      // 3. 크롤링 결과 반영 + AI 분석 중 상태로 전환
      const crawlUpdate = {
        thumbnailUrl,
        aiStatus: "processing" as const,
        ...(title ? { title } : {}),
      };
      await bookmarkService.updateBookmark(bookmarkId, crawlUpdate);
      patchCache(bookmarkId, crawlUpdate);

      // 4. 백그라운드 AI 분석
      const aiRes = await fetch("/api/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, bodyChunks }),
      });
      const aiJson = await aiRes.json();

      if (!aiJson.success) {
        await bookmarkService.updateBookmark(bookmarkId, { aiStatus: "failed" });
        patchCache(bookmarkId, { aiStatus: "failed" });
        return;
      }

      const { title: aiTitle, summary, tags } = aiJson.data;

      // 5. 임베딩 생성 (백그라운드, 실패해도 북마크 저장은 완료 처리)
      const resolvedTitle = aiTitle || title || "";
      fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resolvedTitle, summary }),
      })
        .then((r) => r.json())
        .then(async (embedJson) => {
          if (embedJson.success) {
            await bookmarkService.saveEmbedding(bookmarkId, embedJson.data.embedding);
          }
        })
        .catch((e) => console.error("[Pipeline] 임베딩 오류:", e));

      // 6. AI 결과 반영 + 완료
      const finalUpdate = {
        summary,
        tags,
        aiStatus: "completed" as const,
        ...(aiTitle ? { title: aiTitle } : {}),
      };
      await bookmarkService.updateBookmark(bookmarkId, finalUpdate);
      patchCache(bookmarkId, finalUpdate);
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    } catch (error) {
      console.error("[Pipeline] 파이프라인 오류:", error);
      await bookmarkService.updateBookmark(bookmarkId, { aiStatus: "failed" });
      patchCache(bookmarkId, { aiStatus: "failed" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="animate-in fade-in absolute inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="animate-in zoom-in-95 fade-in relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl duration-300 dark:bg-zinc-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isLimitReached ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-brand-primary/10 text-brand-primary"}`}
            >
              {isLimitReached ? (
                <Lock size={20} strokeWidth={2.5} />
              ) : (
                <Plus size={22} strokeWidth={2.5} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {isLimitReached ? "무료 체험 한도 도달" : "새 북마크 추가"}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isLimitReached
                  ? "로그인하면 무제한으로 저장할 수 있어요"
                  : "나중에 기억할 URL을 저장하세요"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* 한도 초과 UI */}
        {isLimitReached ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              비회원은 북마크를 최대 <span className="font-bold">5개</span>까지 저장할 수 있어요.
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-2xl border-2 border-zinc-100 bg-white py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/login");
                }}
                className="bg-brand-primary hover:bg-brand-primary-hover flex-[1.5] rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98]"
              >
                로그인 / 회원가입
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="URL 주소"
              placeholder="https://example.com"
              icon={<Link2 size={18} />}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              error={urlError ?? undefined}
              autoFocus
              className="w-full"
            />

            <Input
              label="메모 (선택)"
              placeholder="이 북마크에 대한 짧은 메모..."
              icon={<FileText size={18} />}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full"
            />

            {/* Footer Actions */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-2xl border-2 border-zinc-100 bg-white py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="dark:bg-brand-primary dark:hover:bg-brand-primary/90 flex-[1.5] rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-900"
              >
                {isLoading ? "저장 중..." : "북마크 저장"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
