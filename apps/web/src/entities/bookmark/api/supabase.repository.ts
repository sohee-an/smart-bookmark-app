import { supabase } from "@/shared/api/supabase/client";
import type { BookmarkRow, BookmarkFilter, CreateBookmarkRequest } from "./bookmark.types.db";
import type { Bookmark } from "../model/types";
import { toBookmark } from "../lib/bookmark.mapper";
import { BookmarkRepository, UpdateBookmarkData } from "./bookmark.repository";

/**
 * @description Supabase를 사용하는 BookmarkRepository 구현체
 */
export class SupabaseBookmarkRepository implements BookmarkRepository {
  constructor(private userId: string) {}

  /**
   * @description 회원은 제한 없이 북마크를 저장합니다.
   */
  async save<T extends CreateBookmarkRequest>(request: T): Promise<Bookmark> {
    const { url, userMemo } = request;

    const { data, error } = await supabase
      .from("bookmarks")
      .insert([
        {
          url,
          user_memo: userMemo,
          user_id: this.userId,
          status: "unread",
          tags: [],
          summary: "",
          ai_status: "processing",
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`북마크 저장 실패: ${error.message}`);

    return toBookmark(this.toRow(data));
  }

  /**
   * @description 필터 조건에 맞는 북마크 목록을 조회합니다.
   */
  async findAll(filter?: BookmarkFilter): Promise<Bookmark[]> {
    let query = supabase.from("bookmarks").select("*");

    if (filter?.tag) {
      query = query.contains("tags", [filter.tag]);
    }
    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery;
      query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,url.ilike.%${q}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(`목록 조회 실패: ${error.message}`);

    return data.map((dbData) => toBookmark(this.toRow(dbData)));
  }

  async findById(id: string): Promise<Bookmark | null> {
    const { data, error } = await supabase.from("bookmarks").select("*").eq("id", id).single();

    if (error) return null;
    return toBookmark(this.toRow(data));
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) throw new Error(`삭제 실패: ${error.message}`);
  }

  async removeAll(): Promise<void> {
    const { error } = await supabase.from("bookmarks").delete().eq("user_id", this.userId);

    if (error) throw new Error(`전체 삭제 실패: ${error.message}`);
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", this.userId);

    if (error) return 0;
    return count ?? 0;
  }

  async update(id: string, data: UpdateBookmarkData): Promise<void> {
    const { error } = await supabase
      .from("bookmarks")
      .update({
        title: data.title,
        summary: data.summary,
        tags: data.tags,
        ai_status: data.aiStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new Error(`업데이트 실패: ${error.message}`);
  }

  /**
   * @description Supabase DB 스네이크케이스 → BookmarkRow 변환
   * 이 레이어에서만 DB 컬럼명을 알고 있어야 해요
   */
  private toRow(dbData: any): BookmarkRow {
    return {
      id: dbData.id,
      url: dbData.url,
      title: dbData.title ?? "",
      summary: dbData.summary ?? "",
      content: dbData.content,
      userMemo: dbData.user_memo,
      thumbnailUrl: dbData.thumbnail_url,
      aiStatus: dbData.ai_status ?? "processing",
      tags: dbData.tags ?? [],
      status: dbData.status,
      createdAt: dbData.created_at,
      userId: dbData.user_id,
      guestId: dbData.temp_user_id,
      updatedAt: dbData.updated_at ?? dbData.created_at,
    };
  }
}
