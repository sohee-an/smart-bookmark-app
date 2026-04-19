import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { toBookmark } from "@/entities/bookmark/lib/bookmark.mapper";
import type { SupabaseClient } from "@supabase/supabase-js";

type CollectionBookmarkRow = {
  bookmarks: {
    id: string;
    url: string;
    title: string | null;
    summary: string | null;
    thumbnail_url: string | null;
    ai_status: string | null;
    status: string;
    user_id: string;
    user_memo: string | null;
    created_at: string;
    updated_at: string | null;
    bookmark_tags: Array<{ tags: { id: string; name: string } | null }>;
  } | null;
};

async function assertEditorOrAbove(supabase: SupabaseClient, collectionId: string, userId: string) {
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

  // TODO: 컬렉션 북마크 기능 구현 시 Supabase 조인 반환 타입과 CollectionBookmarkRow 타입 재검토 필요
  const bookmarks = ((data ?? []) as unknown as CollectionBookmarkRow[])
    .filter((row) => row.bookmarks)
    .map((row) => {
      const b = row.bookmarks!;
      const tags = (b.bookmark_tags ?? [])
        .map((bt) => bt.tags?.name)
        .filter((t): t is string => Boolean(t));
      return toBookmark({
        id: b.id,
        url: b.url,
        title: b.title ?? "",
        summary: b.summary ?? "",
        content: undefined,
        userMemo: b.user_memo ?? undefined,
        thumbnailUrl: b.thumbnail_url ?? undefined,
        aiStatus: (b.ai_status ?? "processing") as
          | "crawling"
          | "processing"
          | "completed"
          | "failed",
        tags,
        status: b.status as "unread" | "read",
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
