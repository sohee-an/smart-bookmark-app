import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { getErrorMessage } from "@/shared/lib/error";
import { cookies } from "next/headers";
import { GUEST_COOKIE } from "@/shared/lib/guestCookie";
import { rateLimit, getClientIp } from "@/shared/lib/rateLimit";
import {
  SEMANTIC_EXACT_THRESHOLD,
  SEMANTIC_MATCH_COUNT,
  SEMANTIC_MATCH_THRESHOLD,
} from "@/features/bookmark/lib/semantic";

type SearchResultRow = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  thumbnail_url: string | null;
  ai_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  similarity: number;
};

type BookmarkTagRow = {
  bookmark_id: string;
  tags: { name: string } | null;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/** 검색어 최대 길이 (임베딩 비용, 남용 방지) */
const MAX_QUERY_LENGTH = 200;

async function embedQuery(query: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text: query }], role: "user" },
    taskType: TaskType.RETRIEVAL_QUERY,
    outputDimensionality: 3072,
  } as Parameters<typeof model.embedContent>[0]);
  return result.embedding.values;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isGuest = !user && (await cookies()).get(GUEST_COOKIE)?.value === "true";

    if (!user && !isGuest) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { query, tags } = await request.json();

    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ success: false, message: "검색어가 없습니다." }, { status: 400 });
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { success: false, message: `검색어는 ${MAX_QUERY_LENGTH}자까지 쓸 수 있습니다.` },
        { status: 400 }
      );
    }

    // 비회원: 북마크가 브라우저에만 있으므로 검색어 임베딩만 돌려주고 유사도는 브라우저가 계산한다.
    // 하루 5회 제한은 화면(localStorage)이 안내하고, 실제 비용 방어는 이 IP rate limit이 한다
    if (isGuest) {
      const rl = rateLimit(`semantic-guest:${getClientIp(request)}`, 10, 60_000);
      if (!rl.ok) {
        return NextResponse.json(
          { success: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
          { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
        );
      }
      return NextResponse.json({
        success: true,
        data: { mode: "guest", queryEmbedding: await embedQuery(query) },
      });
    }

    // 여기부터 회원. 위 판정과 같은 조건이지만 타입을 좁히기 위해 한 번 더 확인한다
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const embedding = await embedQuery(query);

    const { data, error } = await supabase.rpc("match_bookmarks", {
      query_embedding: embedding,
      p_user_id: user.id,
      match_threshold: SEMANTIC_MATCH_THRESHOLD,
      match_count: SEMANTIC_MATCH_COUNT,
      p_tags: tags?.length > 0 ? tags : null,
    });

    if (error) throw error;

    const ids = ((data ?? []) as unknown as SearchResultRow[]).map((r) => r.id);
    let tagsMap: Record<string, string[]> = {};

    if (ids.length > 0) {
      const { data: btData } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id, tags(name)")
        .in("bookmark_id", ids);

      if (btData) {
        tagsMap = (btData as unknown as BookmarkTagRow[]).reduce(
          (acc: Record<string, string[]>, bt) => {
            if (!acc[bt.bookmark_id]) acc[bt.bookmark_id] = [];
            if (bt.tags?.name) acc[bt.bookmark_id].push(bt.tags.name);
            return acc;
          },
          {}
        );
      }
    }

    const results = ((data ?? []) as unknown as SearchResultRow[]).map((r) => ({
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
        exact: results.filter((r) => r.similarity >= SEMANTIC_EXACT_THRESHOLD),
        related: results.filter((r) => r.similarity < SEMANTIC_EXACT_THRESHOLD),
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
