import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { validateSsrf, SsrfError } from "@/shared/lib/validateSsrf";
import { getUserFromBearer, CORS_HEADERS } from "../_lib/auth";
import { runPipeline, PIPELINE_TIMEOUT_MS } from "../_lib/pipeline";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
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

  const { url, title } = await request.json();
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
    .insert([
      {
        url,
        title: title || null,
        user_id: user.id,
        status: "unread",
        ai_status: "processing",
      },
    ])
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
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("pipeline timeout")), PIPELINE_TIMEOUT_MS)
  );

  waitUntil(
    Promise.race([runPipeline(supabase, bookmark.id, url), timeout]).catch(async (err) => {
      console.error("[save-bookmark] pipeline error:", err.message);
      await supabase.from("bookmarks").update({ ai_status: "failed" }).eq("id", bookmark.id);
    })
  );

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
