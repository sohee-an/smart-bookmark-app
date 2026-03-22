import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerClient } from "@supabase/ssr";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { query, userId } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ success: false, message: "검색어가 없습니다." });
    }

    // 1. 검색어 임베딩 생성
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text: query }], role: "user" },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 3072,
    } as any);
    const embedding = result.embedding.values;

    // 2. Supabase RPC로 유사도 검색
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      { cookies: { get: (n) => req.cookies[n], set: () => {}, remove: () => {} } }
    );

    const { data, error } = await supabase.rpc("match_bookmarks", {
      query_embedding: embedding,
      p_user_id: userId,
      match_threshold: 0.5,
      match_count: 20,
    });

    if (error) throw error;

    // 3. 태그 조회 (별도)
    const ids = (data ?? []).map((r: any) => r.id);
    let tagsMap: Record<string, string[]> = {};

    if (ids.length > 0) {
      const { data: btData } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id, tags(name)")
        .in("bookmark_id", ids);

      if (btData) {
        tagsMap = btData.reduce((acc: Record<string, string[]>, bt: any) => {
          if (!acc[bt.bookmark_id]) acc[bt.bookmark_id] = [];
          if (bt.tags?.name) acc[bt.bookmark_id].push(bt.tags.name);
          return acc;
        }, {});
      }
    }

    const EXACT_THRESHOLD = 0.8;

    const results = (data ?? []).map((r: any) => ({
      id: r.id,
      url: r.url,
      title: r.title ?? "",
      summary: r.summary ?? "",
      thumbnailUrl: r.thumbnail_url,
      aiStatus: r.ai_status,
      status: r.status,
      tags: tagsMap[r.id] ?? [],
      userId,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      similarity: r.similarity,
    }));

    return res.status(200).json({
      success: true,
      data: {
        exact: results.filter((r: any) => r.similarity >= EXACT_THRESHOLD),
        related: results.filter((r: any) => r.similarity < EXACT_THRESHOLD),
      },
    });
  } catch (error: any) {
    console.error("[API SemanticSearch] 오류:", error);
    return res.status(500).json({
      success: false,
      message: "시맨틱 검색 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
}
