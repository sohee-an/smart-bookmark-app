import { supabase } from "@/shared/api/supabase";
import { Bookmark, BookmarkFilter, CreateBookmarkRequest } from "../model/types";
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

    return this.mapToDomain(data);
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
      // 제목, 요약, URL 중 하나라도 검색어를 포함하는 경우
      query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,url.ilike.%${q}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(`목록 조회 실패: ${error.message}`);

    return data.map((dbData) => this.mapToDomain(dbData));
  }

  async findById(id: string): Promise<Bookmark | null> {
    const { data, error } = await supabase.from("bookmarks").select("*").eq("id", id).single();

    if (error) return null;
    return this.mapToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) throw new Error(`삭제 실패: ${error.message}`);
  }

  /**
   * @description 로그인한 사용자의 모든 북마크를 삭제합니다.
   */
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
    return count || 0;
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
   * @description Supabase DB 데이터를 우리 앱의 표준 도메인 모델(Bookmark)로 변환 (Mapper)
   */
  private mapToDomain(dbData: any): Bookmark {
    return {
      id: dbData.id,
      url: dbData.url,
      title: dbData.title || "",
      summary: dbData.summary || "",
      content: dbData.content,
      userMemo: dbData.user_memo,
      thumbnailUrl: dbData.thumbnail_url,
      aiStatus: dbData.ai_status || "processing",
      tags: dbData.tags || [],
      status: dbData.status,
      createdAt: dbData.created_at,
      userId: dbData.user_id,
      guestId: dbData.temp_user_id, // 표준 모델의 guestId로 매핑
      updatedAt: dbData.updated_at || dbData.created_at,
    };
  }
}
