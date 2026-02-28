import { supabase } from "@/shared/api/supabase";
import { Bookmark, BookmarkFilter, CreateBookmarkRequest } from "../model/types";
import { BookmarkRepository } from "./bookmark.repository";

/**
 * @description Supabase를 사용하는 BookmarkRepository 구현체
 */
export class SupabaseBookmarkRepository implements BookmarkRepository {
  async save(request: CreateBookmarkRequest): Promise<Bookmark> {
    const { url, userMemo, tempUserId } = request;

    const { data, error } = await supabase
      .from("bookmarks")
      .insert([
        {
          url,
          user_memo: userMemo,
          temp_user_id: tempUserId,
          status: "unread",
          tags: [],
          summary: "", // 초기 생성 시 빈 문자열
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`북마크 저장 실패: ${error.message}`);
    
    return this.mapToDomain(data);
  }

  async findAll(filter?: BookmarkFilter): Promise<Bookmark[]> {
    let query = supabase.from("bookmarks").select("*");

    if (filter?.tag) {
      query = query.contains("tags", [filter.tag]);
    }

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new Error(`목록 조회 실패: ${error.message}`);
    
    return data.map(this.mapToDomain);
  }

  async findById(id: string): Promise<Bookmark | null> {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return this.mapToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) throw new Error(`삭제 실패: ${error.message}`);
  }

  async count(userIdOrTempId: string): Promise<number> {
    const { count, error } = await supabase
      .from("bookmarks")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${userIdOrTempId},temp_user_id.eq.${userIdOrTempId}`);

    if (error) return 0;
    return count || 0;
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
      tags: dbData.tags || [],
      status: dbData.status,
      createdAt: dbData.created_at,
      userId: dbData.user_id,
      tempUserId: dbData.temp_user_id,
    };
  }
}

/**
 * @description 싱글톤 인스턴스 생성 및 배포
 */
export const bookmarkRepository = new SupabaseBookmarkRepository();
