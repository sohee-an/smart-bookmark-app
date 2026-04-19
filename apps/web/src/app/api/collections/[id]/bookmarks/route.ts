import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { toBookmark } from "@/entities/bookmark/lib/bookmark.mapper";

async function assertEditorOrAbove(supabase: unknown, collectionId: string, userId: string) {
  const { data } = await supabase
    .from("collection_members")
    .select("role")
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .single();
  if (!data || !["owner", "editor"].includes(data.role)) return false;
  return true;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const { data: member } = await supabase
    .from("collection_members")
    .select("role")
    .eq("collection_id", id)
    .eq("user_id", user.id)
    .single();

  if (!member)
    return NextResponse.json({ success: false, message: "접근 권한이 없습니다." }, { status: 403 });

  const { data, error } = await supabase
    .from("collection_bookmarks")
    .select(
      `
      added_at,
      bookmarks (
        id, url, title, summary, thumbnail_url, ai_status, status,
        user_id, user_memo, created_at, updated_at,
        bookmark_tags (tags (id, name))
      )
    `
    )
    .eq("collection_id", id)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  const bookmarks = (data ?? [])
    .filter((row: unknown) => row.bookmarks)
    .map((row: unknown) => {
      const b = row.bookmarks;
      const tags = (b.bookmark_tags ?? []).map((bt: unknown) => bt.tags?.name).filter(Boolean);
      return toBookmark({
        id: b.id,
        url: b.url,
        title: b.title ?? "",
        summary: b.summary ?? "",
        content: undefined,
        userMemo: b.user_memo,
        thumbnailUrl: b.thumbnail_url,
        aiStatus: b.ai_status ?? "processing",
        tags,
        status: b.status,
        createdAt: b.created_at,
        updatedAt: b.updated_at ?? b.created_at,
        userId: b.user_id,
        guestId: undefined,
      });
    });

  return NextResponse.json({ success: true, data: bookmarks });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const canEdit = await assertEditorOrAbove(supabase, id, user.id);
  if (!canEdit)
    return NextResponse.json({ success: false, message: "편집 권한이 없습니다." }, { status: 403 });

  const { bookmarkId } = await request.json();
  if (!bookmarkId)
    return NextResponse.json(
      { success: false, message: "bookmarkId가 필요합니다." },
      { status: 400 }
    );

  const { error } = await supabase
    .from("collection_bookmarks")
    .insert({ collection_id: id, bookmark_id: bookmarkId, added_by: user.id });

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });

  const canEdit = await assertEditorOrAbove(supabase, id, user.id);
  if (!canEdit)
    return NextResponse.json({ success: false, message: "편집 권한이 없습니다." }, { status: 403 });

  const { bookmarkId } = await request.json();
  const { error } = await supabase
    .from("collection_bookmarks")
    .delete()
    .eq("collection_id", id)
    .eq("bookmark_id", bookmarkId);

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
