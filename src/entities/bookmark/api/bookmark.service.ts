import { supabase } from "@/shared/api/supabase";
import { BookmarkRepository } from "./bookmark.repository";
import { LocalRepository } from "./local.repository";
import { SupabaseBookmarkRepository } from "./supabase.repository";
import getGuestId from "@/shared/lib/guest";
import { Bookmark, BookmarkFilter } from "../model/types";

/**
 * @description 로그인 상태에 따라 Local 또는 Supabase Repository를 동적으로 선택하는 서비스 (Factory Pattern)
 */
export class BookmarkService {
  /**
   * @description 현재 사용자 세션을 확인하여 적절한 저장소 인스턴스를 반환합니다.
   */
  private async getRepository(): Promise<BookmarkRepository> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return new SupabaseBookmarkRepository(user.id);
    }
    return new LocalRepository();
  }

  /**
   * @description 북마크 목록을 가져옵니다.
   */
  async getBookmarks(filter?: BookmarkFilter): Promise<Bookmark[]> {
    const repo = await this.getRepository();
    return repo.findAll(filter);
  }

  /**
   * @description 새로운 북마크를 추가합니다.
   */
  async addBookmark(url: string, userMemo?: string): Promise<Bookmark> {
    const repo = await this.getRepository();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return repo.save({
      url,
      userMemo,
      userId: session?.user?.id,
      guestId: session?.user ? undefined : getGuestId(),
    });
  }

  /**
   * @description 북마크를 상세 조회합니다.
   */
  async getBookmarkById(id: string): Promise<Bookmark | null> {
    const repo = await this.getRepository();
    return repo.findById(id);
  }

  /**
   * @description 북마크를 삭제합니다.
   */
  async deleteBookmark(id: string): Promise<void> {
    const repo = await this.getRepository();
    return repo.delete(id);
  }

  /**
   * @description 북마크 정보를 업데이트합니다.
   */
  async updateBookmark(id: string, data: any): Promise<void> {
    const repo = await this.getRepository();
    return repo.update(id, data);
  }

  /**
   * @description 현재 저장된 북마크 개수를 확인합니다.
   */
  async getBookmarkCount(): Promise<number> {
    const repo = await this.getRepository();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const id = session?.user?.id || getGuestId();
    return repo.count(id);
  }

  /**
   * @description 모든 북마크를 삭제합니다.
   */
  async removeAllBookmarks(): Promise<void> {
    const repo = await this.getRepository();
    return repo.removeAll();
  }
}

export const bookmarkService = new BookmarkService();
