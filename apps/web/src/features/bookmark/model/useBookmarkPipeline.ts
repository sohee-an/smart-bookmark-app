import { useQueryClient } from "@tanstack/react-query";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { bookmarkService } from "./bookmark.service";
import { bookmarkKeys } from "./queries";

/**
 * @description 북마크 저장 후 크롤링 → AI 분석 → 임베딩 파이프라인을 실행하는 훅.
 * AddBookmarkOverlay 최초 저장 및 실패 카드 재시도에서 공통으로 사용한다.
 */
export function useBookmarkPipeline() {
  const queryClient = useQueryClient();

  const patchCache = (id: string, data: Partial<Bookmark>) => {
    queryClient.setQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all }, (old = []) =>
      old.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
  };

  const runPipeline = async (bookmarkId: string, url: string) => {
    try {
      // 1. 크롤링
      const crawlRes = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const crawlJson = await crawlRes.json();

      if (!crawlJson.success) {
        await bookmarkService.updateBookmark(bookmarkId, { aiStatus: "crawl_failed" });
        patchCache(bookmarkId, { aiStatus: "crawl_failed" });
        return;
      }

      const { title, thumbnailUrl, description, bodyChunks } = crawlJson.data;

      // 2. 크롤링 결과 반영 + AI 분석 중 상태 전환
      const crawlUpdate = {
        thumbnailUrl,
        aiStatus: "processing" as const,
        ...(title ? { title } : {}),
      };
      await bookmarkService.updateBookmark(bookmarkId, crawlUpdate);
      patchCache(bookmarkId, crawlUpdate);

      // 3. AI 분석
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

      // 4. 임베딩 생성 (실패해도 북마크 저장 완료 처리)
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

      // 5. AI 결과 반영 + 완료
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

  return { runPipeline, patchCache };
}
