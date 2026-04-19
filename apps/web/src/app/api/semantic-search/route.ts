import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { getErrorMessage } from "@/shared/lib/error";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { query, tags } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ success: false, message: "검색어가 없습니다." }, { status: 400 });
    }

    // 1. 검색어 임베딩 생성
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text: query }], role: "user" },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 3072,
    } as any);
    const embedding = result.embedding.values;

    // 2. Supabase RPC로 유사도 검색 (세션에서 추출한 user.id 사용)
    const { data, error } = await supabase.rpc("match_bookmarks", {
      query_embedding: embedding,
      p_user_id: user.id,
      match_threshold: 0.65,
      match_count: 10,
      p_tags: tags?.length > 0 ? tags : null,
    });

    if (error) throw error;

    // 3. 태그 조회 (별도)
    const ids = (data ?? []).map((r: unknown) => r.id);
    let tagsMap: Record<string, string[]> = {};

    if (ids.length > 0) {
      const { data: btData } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id, tags(name)")
        .in("bookmark_id", ids);

      if (btData) {
        tagsMap = btData.reduce((acc: Record<string, string[]>, bt: unknown) => {
          if (!acc[bt.bookmark_id]) acc[bt.bookmark_id] = [];
          if (bt.tags?.name) acc[bt.bookmark_id].push(bt.tags.name);
          return acc;
        }, {});
      }
    }

    const EXACT_THRESHOLD = 0.8;

    const results = (data ?? []).map((r: unknown) => ({
      id: r.id,
      url: r.url,
      title: r.title ?? "",
      summary: r.summary ?? "",
      thumbnailUrl: r.thumbnail_url,
      aiStatus: r.ai_status,
      status: r.status,
      tags: tagsMap[r.id] ?? [],
      userId: user.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      similarity: r.similarity,
    }));

    return NextResponse.json({
      success: true,
      data: {
        exact: results.filter((r: unknown) => r.similarity >= EXACT_THRESHOLD),
        related: results.filter((r: unknown) => r.similarity < EXACT_THRESHOLD),
      },
    });
  } catch (error: unknown) {
    console.error("[API SemanticSearch] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: "시맨틱 검색 중 오류가 발생했습니다.",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
