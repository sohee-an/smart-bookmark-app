import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { crawlerService } from "@/server/services/crawler.service";
import { analyzeBookmark } from "@/server/services/ai-analysis.service";
import type { SupabaseClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Vercel Hobby: 10s, Pro: 60s — 안전하게 8초 여유
export const PIPELINE_TIMEOUT_MS = 25_000;

export async function runPipeline(supabase: SupabaseClient, bookmarkId: string, url: string) {
  // 크롤링
  const crawlResult = await crawlerService.crawl(url);

  if (!crawlResult.success) {
    await supabase.from("bookmarks").update({ ai_status: "crawl_failed" }).eq("id", bookmarkId);
    return;
  }

  const { title, thumbnailUrl, description, bodyChunks } = crawlResult;

  await supabase
    .from("bookmarks")
    .update({
      title: title ?? null,
      thumbnail_url: thumbnailUrl ?? null,
      ai_status: "processing",
    })
    .eq("id", bookmarkId);

  // AI 분석
  const aiData = await analyzeBookmark({ title, description, bodyChunks });

  const finalTitle = aiData.title || title || "";
  const summary = aiData.summary ?? "";
  const tags: string[] = aiData.tags ?? [];

  // 태그 저장 — 태그별 순차 왕복(2N) 대신 배치 upsert 2회로 처리
  if (tags.length > 0) {
    const { data: tagRows } = await supabase
      .from("tags")
      .upsert(
        tags.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id");

    if (tagRows && tagRows.length > 0) {
      await supabase
        .from("bookmark_tags")
        .upsert(tagRows.map((t) => ({ bookmark_id: bookmarkId, tag_id: t.id })));
    }
  }

  // 임베딩 생성 (실패해도 북마크 저장은 completed 처리)
  try {
    const embeddingText = [finalTitle, summary].filter(Boolean).join(" ");
    if (embeddingText.trim()) {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embeddingResult = await embeddingModel.embedContent({
        content: { parts: [{ text: embeddingText }], role: "user" },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: 3072,
      } as Parameters<typeof embeddingModel.embedContent>[0]);
      await supabase
        .from("embeddings")
        .upsert({ bookmark_id: bookmarkId, embedding: embeddingResult.embedding.values });
    }
  } catch (e) {
    console.error("[Pipeline] 임베딩 오류:", e);
  }

  // 최종 업데이트
  await supabase
    .from("bookmarks")
    .update({ title: finalTitle, summary, ai_status: "completed" })
    .eq("id", bookmarkId);
}
