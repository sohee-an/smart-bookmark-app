import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { crawlerService } from "@/server/services/crawler.service";
import { analyzeBookmark } from "@/server/services/ai-analysis.service";
import type { SupabaseClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Vercel Hobby: 10s, Pro: 60s — 안전하게 8초 여유
export const PIPELINE_TIMEOUT_MS = 25_000;

export async function runPipeline(supabase: SupabaseClient, bookmarkId: string, url: string) {
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

  const aiData = await analyzeBookmark({ title, description, bodyChunks });

  const finalTitle = aiData.title || title || "";
  const summary = aiData.summary ?? "";
  const tags: string[] = aiData.tags ?? [];

  // 태그 저장 — 배치 처리. 충돌 시 DO NOTHING(ignoreDuplicates): DO UPDATE 경로는
  // tags에 UPDATE RLS 정책이 없어 저장 전체가 실패한다. (DO NOTHING은 기존 행 id를
  // 반환하지 않으므로 이름으로 일괄 재조회)
  if (tags.length > 0) {
    await supabase.from("tags").upsert(
      tags.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: true }
    );

    const { data: tagRows } = await supabase.from("tags").select("id").in("name", tags);

    if (tagRows && tagRows.length > 0) {
      await supabase.from("bookmark_tags").upsert(
        tagRows.map((t) => ({ bookmark_id: bookmarkId, tag_id: t.id })),
        { ignoreDuplicates: true }
      );
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
      // onConflict를 bookmark_id(unique)로 명시 — 재저장 시 갱신 경로는 migration 006 정책 필요
      await supabase
        .from("embeddings")
        .upsert(
          { bookmark_id: bookmarkId, embedding: embeddingResult.embedding.values },
          { onConflict: "bookmark_id" }
        );
    }
  } catch (e) {
    console.error("[Pipeline] 임베딩 오류:", e);
  }

  await supabase
    .from("bookmarks")
    .update({ title: finalTitle, summary, ai_status: "completed" })
    .eq("id", bookmarkId);
}
