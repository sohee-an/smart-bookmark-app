import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { validateSsrf } from "@/shared/lib/validateSsrf";
import { getUserFromBearer, CORS_HEADERS } from "../_lib/auth";
import { runPipeline } from "../_lib/pipeline";

type BulkImportItem = { url: string; title: string };

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

  const { items }: { items: BulkImportItem[] } = await request.json();
  if (!items?.length) {
    return NextResponse.json(
      { success: false, message: "items가 필요합니다." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // 2. SSRF 방어 — 유효하지 않은 URL 필터링 (전체 실패 X, 개별 스킵)
  const validItems: BulkImportItem[] = [];
  await Promise.all(
    items.map(async (item) => {
      try {
        await validateSsrf(item.url);
        validItems.push(item);
      } catch {
        // 스킵
      }
    })
  );

  if (validItems.length === 0) {
    return NextResponse.json(
      { success: true, saved: 0, skipped: 0, failed: items.length },
      { headers: CORS_HEADERS }
    );
  }

  // 3. 기존 URL 조회 — 1번 쿼리로 중복 확인
  const urls = validItems.map((i) => i.url);
  const { data: existingRows } = await supabase
    .from("bookmarks")
    .select("url")
    .eq("user_id", user.id)
    .in("url", urls);

  const existingUrls = new Set((existingRows ?? []).map((r: { url: string }) => r.url));

  // 4. 중복 제거
  const newItems = validItems.filter((i) => !existingUrls.has(i.url));
  const skipped = validItems.length - newItems.length;

  if (newItems.length === 0) {
    return NextResponse.json(
      { success: true, saved: 0, skipped, failed: 0 },
      { headers: CORS_HEADERS }
    );
  }

  // 5. Bulk INSERT — ai_status: "pending" (AI는 즉시 실행 안 함)
  const { data: inserted, error: insertError } = await supabase
    .from("bookmarks")
    .insert(
      newItems.map((item) => ({
        url: item.url,
        title: item.title || null,
        user_id: user.id,
        status: "unread",
        ai_status: "pending",
      }))
    )
    .select("id, url");

  if (insertError || !inserted) {
    console.error("[bulk-import] insert error:", insertError);
    return NextResponse.json(
      { success: false, message: "저장 실패", detail: insertError?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const saved = inserted.length;
  const failed = newItems.length - saved;

  // 6. AI 파이프라인 순차 처리
  // TODO: QStash 큐로 교체 예정
  waitUntil(
    (async () => {
      for (const bookmark of inserted) {
        try {
          await runPipeline(supabase, bookmark.id, bookmark.url);
        } catch (e) {
          console.error("[bulk-import] pipeline error:", bookmark.id, e);
          await supabase.from("bookmarks").update({ ai_status: "failed" }).eq("id", bookmark.id);
        }
        // Gemini rate limit 버퍼
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    })()
  );

  return NextResponse.json({ success: true, saved, skipped, failed }, { headers: CORS_HEADERS });
}
