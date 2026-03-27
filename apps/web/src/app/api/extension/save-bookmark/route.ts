import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { crawlerService } from "@/server/services/crawler.service";
import { validateSsrf, SsrfError } from "@/shared/lib/validateSsrf";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// CORS preflight
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// Bearer 토큰으로 유저 검증
async function getUserFromBearer(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  // 유저 검증용 클라이언트 (anon key)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser(token);
  if (error || !user) {
    console.error("[save-bookmark] auth error:", error);
    return null;
  }

  // RLS가 유저 JWT를 인식하도록 Authorization 헤더에 토큰 주입
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  return { user, supabase, token };
}

export async function POST(request: Request) {
  // 1. 인증
  const auth = await getUserFromBearer(request.headers.get("Authorization"));
  if (!auth) {
    return NextResponse.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const { user, supabase } = auth;

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json(
      { success: false, message: "URL이 필요합니다." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 2. SSRF 방어
  try {
    await validateSsrf(url);
  } catch (e) {
    if (e instanceof SsrfError) {
      return NextResponse.json(
        { success: false, message: e.message },
        { status: 400, headers: CORS_HEADERS }
      );
    }
  }

  // 3. DB 저장
  const { data: bookmark, error: insertError } = await supabase
    .from("bookmarks")
    .insert([{ url, user_id: user.id, status: "unread", ai_status: "processing" }])
    .select()
    .single();

  if (insertError || !bookmark) {
    console.error("[save-bookmark] insert error:", insertError);
    return NextResponse.json(
      { success: false, message: "저장 실패", detail: insertError?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  // 4. 백그라운드 파이프라인
  runPipeline(supabase, bookmark.id, url).catch(async () => {
    await supabase.from("bookmarks").update({ ai_status: "failed" }).eq("id", bookmark.id);
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: bookmark.id,
        url: bookmark.url,
        aiStatus: "processing",
        createdAt: bookmark.created_at,
      },
    },
    { headers: CORS_HEADERS }
  );
}

async function runPipeline(supabase: any, bookmarkId: string, url: string) {
  // 크롤링
  const crawlResult = await crawlerService.crawl(url);
  if (!crawlResult.success || !crawlResult.data) {
    await supabase.from("bookmarks").update({ ai_status: "failed" }).eq("id", bookmarkId);
    return;
  }

  const { title, thumbnailUrl, description, bodyChunks } = crawlResult.data;

  await supabase
    .from("bookmarks")
    .update({
      title: title ?? null,
      thumbnail_url: thumbnailUrl ?? null,
      ai_status: "processing",
    })
    .eq("id", bookmarkId);

  // AI 분석
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

  // 최종 업데이트
  await supabase
    .from("bookmarks")
    .update({
      title: finalTitle,
      summary,
      ai_status: "completed",
    })
    .eq("id", bookmarkId);
}
