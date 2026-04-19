import { supabase } from "@/shared/api/supabase/client";
import type { BookmarkRow, BookmarkFilter, CreateBookmarkRequest } from "./bookmark.types.db";
import type { Bookmark } from "../model/types";
import { toBookmark } from "../lib/bookmark.mapper";
import { BookmarkRepository, UpdateBookmarkData } from "./bookmark.repository";
import { BookmarkError, BookmarkErrorCode } from "../model/bookmark.error";

type SupabaseDbRow = {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  user_memo: string | null;
  thumbnail_url: string | null;
  ai_status: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  temp_user_id: string | null;
  bookmark_tags?: Array<{ tags: { name: string } | null }>;
};

/**
 * @description Supabase를 사용하는 BookmarkRepository 구현체
 * tags는 tags / bookmark_tags 분리 테이블로 관리됩니다 (docs/015 참조)
 */
export class SupabaseBookmarkRepository implements BookmarkRepository {
  constructor(private userId: string) {}

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
          ai_status: "processing",
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BookmarkError(
        BookmarkErrorCode.DB_INSERT_FAILED,
        `북마크 저장 실패: ${error.message}`,
        error
      );
    }

    return toBookmark(this.toRow(data, []));
  }

  async findAll(filter?: BookmarkFilter): Promise<Bookmark[]> {
    let query = supabase
      .from("bookmarks")
      .select("*, bookmark_tags(tags(id, name))")
      .eq("user_id", this.userId);

    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery;
      query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,url.ilike.%${q}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new BookmarkError(
        BookmarkErrorCode.DB_QUERY_FAILED,
        `목록 조회 실패: ${error.message}`,
        error
      );
    }

    const bookmarks = (data as unknown as SupabaseDbRow[]).map((row) =>
      toBookmark(this.toRow(row, this.extractTags(row)))
    );

    if (filter?.tag) {
      return bookmarks.filter((b) => b.tags.includes(filter.tag!));
    }

    return bookmarks;
  }

  async findById(id: string): Promise<Bookmark | null> {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*, bookmark_tags(tags(id, name))")
      .eq("id", id)
      .single();

    if (error) return null;
    return toBookmark(this.toRow(data, this.extractTags(data)));
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) {
      throw new BookmarkError(
        BookmarkErrorCode.DB_DELETE_FAILED,
        `삭제 실패: ${error.message}`,
        error
      );
    }
  }

  async removeAll(): Promise<void> {
    const { error } = await supabase.from("bookmarks").delete().eq("user_id", this.userId);
    if (error) {
      throw new BookmarkError(
        BookmarkErrorCode.DB_DELETE_FAILED,
        `전체 삭제 실패: ${error.message}`,
        error
      );
    }
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
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.summary !== undefined) updateFields.summary = data.summary;
    if (data.aiStatus !== undefined) updateFields.ai_status = data.aiStatus;
    if (data.status !== undefined) updateFields.status = data.status;

    const { error } = await supabase.from("bookmarks").update(updateFields).eq("id", id);
    if (error) {
      throw new BookmarkError(
        BookmarkErrorCode.DB_UPDATE_FAILED,
        `업데이트 실패: ${error.message}`,
        error
      );
    }

    if (data.tags !== undefined) {
      await this.replaceTags(id, data.tags);
    }
  }

  /**
   * @description 북마크의 태그를 교체합니다 (기존 태그 전체 삭제 후 재삽입)
   */
  private async replaceTags(bookmarkId: string, tagNames: string[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from("bookmark_tags")
      .delete()
      .eq("bookmark_id", bookmarkId);

    if (deleteError) {
      throw new BookmarkError(
        BookmarkErrorCode.TAG_DELETE_FAILED,
        `태그 삭제 실패: ${deleteError.message}`,
        deleteError
      );
    }

    if (tagNames.length > 0) {
      await this.insertTags(bookmarkId, tagNames);
    }
  }

  /**
   * @description 임베딩 벡터를 embeddings 테이블에 저장합니다
   */
  async saveEmbedding(bookmarkId: string, embedding: number[]): Promise<void> {
    const { error } = await supabase
      .from("embeddings")
      .upsert({ bookmark_id: bookmarkId, embedding });

    if (error) {
      throw new BookmarkError(
        BookmarkErrorCode.EMBEDDING_SAVE_FAILED,
        `임베딩 저장 실패: ${error.message}`,
        error
      );
    }
  }

  /**
   * @description 태그 이름 목록을 tags 테이블에 upsert하고 bookmark_tags에 연결합니다
   */
  async insertTags(bookmarkId: string, tagNames: string[]): Promise<void> {
    for (const name of tagNames) {
      const { data: tag, error: upsertError } = await supabase
        .from("tags")
        .upsert({ name }, { onConflict: "name" })
        .select("id")
        .single();

      if (upsertError || !tag) continue;

      await supabase.from("bookmark_tags").upsert({ bookmark_id: bookmarkId, tag_id: tag.id });
    }
  }

  /**
   * @description JOIN 결과에서 태그 이름 배열을 추출합니다
   */
  private extractTags(dbData: SupabaseDbRow): string[] {
    if (!dbData.bookmark_tags) return [];
    return dbData.bookmark_tags.map((bt) => bt.tags?.name).filter((t): t is string => Boolean(t));
  }

  /**
   * @description Supabase DB 스네이크케이스 → BookmarkRow 변환
   */
  private toRow(dbData: SupabaseDbRow, tags: string[]): BookmarkRow {
    return {
      id: dbData.id,
      url: dbData.url,
      title: dbData.title ?? "",
      summary: dbData.summary ?? "",
      content: dbData.content ?? undefined,
      userMemo: dbData.user_memo ?? undefined,
      thumbnailUrl: dbData.thumbnail_url ?? undefined,
      aiStatus: (dbData.ai_status ?? "processing") as
        | "crawling"
        | "processing"
        | "completed"
        | "failed",
      tags,
      status: dbData.status as "unread" | "read",
      createdAt: dbData.created_at,
      userId: dbData.user_id,
      guestId: dbData.temp_user_id ?? undefined,
      updatedAt: dbData.updated_at ?? dbData.created_at,
    };
  }
}
