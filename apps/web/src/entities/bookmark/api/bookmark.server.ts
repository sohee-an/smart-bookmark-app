/**
 * 서버 전용 북마크 fetch 함수.
 * Server Component / prefetchQuery 에서만 사용. 클라이언트에서 import 금지.
 */
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { toBookmark } from "../lib/bookmark.mapper";
import type { Bookmark } from "../model/types";

export async function fetchBookmarksServer(): Promise<Bookmark[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 비회원은 localStorage 사용 → 서버에서 fetch 불가, 빈 배열 반환하지 않고 null 반환
  // prefetchQuery 호출 측에서 user 체크 후 호출하도록 설계
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*, bookmark_tags(tags(id, name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    const tags = row.bookmark_tags
      ? (row.bookmark_tags as any[]).map((bt: any) => bt.tags?.name).filter(Boolean)
      : [];

    return toBookmark({
      id: row.id,
      url: row.url,
      title: row.title ?? "",
      summary: row.summary ?? "",
      content: row.content,
      userMemo: row.user_memo,
      thumbnailUrl: row.thumbnail_url,
      aiStatus: row.ai_status ?? "processing",
      tags,
      status: row.status,
      createdAt: row.created_at,
      userId: row.user_id,
      guestId: row.temp_user_id,
      updatedAt: row.updated_at ?? row.created_at,
    });
  });
}
