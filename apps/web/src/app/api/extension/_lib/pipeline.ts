import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { crawlerService } from "@/server/services/crawler.service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Vercel Hobby: 10s, Pro: 60s — 안전하게 8초 여유
export const PIPELINE_TIMEOUT_MS = 25_000;

export async function runPipeline(supabase: unknown, bookmarkId: string, url: string) {
  console.log("[Pipeline] 시작:", url);

  // 크롤링
  const crawlResult = await crawlerService.crawl(url);
  console.log("[Pipeline] 크롤링 결과:", crawlResult.success, crawlResult.errorCode ?? "");

  if (!crawlResult.success) {
    await supabase.from("bookmarks").update({ ai_status: "failed" }).eq("id", bookmarkId);
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
  console.log("[Pipeline] AI 분석 시작");
  const bodyText = bodyChunks ? bodyChunks.join(" ") : "";
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = `당신은 전문적인 지식 큐레이터입니다. 다음 정보를 분석해 한국어 JSON 형식으로 응답하세요.
제목: ${title || "(없음)"}
설명: ${description || "(없음)"}
본문: ${bodyText.slice(0, 2000)}
[요구사항]
- 반드시 JSON 형식으로만 응답하세요.
- title이 "(없음)"이면 본문을 보고 적절한 제목을 생성하고, 있으면 null을 반환하세요.
- 형식: { "title": "생성된제목 또는 null", "summary": "3줄요약", "tags": ["태그1", "태그2"] }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const finalTitle = aiData.title || title || "";
  const summary = aiData.summary ?? "";
  const tags: string[] = aiData.tags ?? [];
  console.log("[Pipeline] AI 분석 완료 - title:", finalTitle, "tags:", tags);

  // 태그 저장
  for (const name of tags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ name }, { onConflict: "name" })
      .select("id")
      .single();
    if (tag) {
      await supabase.from("bookmark_tags").upsert({ bookmark_id: bookmarkId, tag_id: tag.id });
    }
  }

  // 임베딩 생성 (실패해도 북마크 저장은 completed 처리)
  console.log("[Pipeline] 임베딩 시작");
  try {
    const embeddingText = [finalTitle, summary].filter(Boolean).join(" ");
    if (embeddingText.trim()) {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embeddingResult = await embeddingModel.embedContent({
        content: { parts: [{ text: embeddingText }], role: "user" },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: 3072,
      } as any);
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

  console.log("[Pipeline] 완료:", bookmarkId);
}
