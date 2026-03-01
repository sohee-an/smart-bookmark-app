import storage from "@/shared/lib/storage";
import { Bookmark, BookmarkFilter, CreateBookmarkRequest } from "../model/types";

import { BookmarkRepository, UpdateBookmarkData } from "./bookmark.repository";
import getGuestId from "@/shared/lib/guest";

const GUEST_KEY = "GUEST_BOOKMARK";

export class LocalRepository implements BookmarkRepository {
  /**
   * @description 북마크를 저장합니다.
   * 비회원인 경우 guestId 사용하며, 5개 제한 로직이 포함됩니다.
   */
  async save<T extends CreateBookmarkRequest>(request: T): Promise<Bookmark> {
    const guestId = getGuestId();
    const currentBookmarks = await this.findAll();
    const count = await this.count();
    if (count >= 5) {
      throw new Error("무료 체험 한도(5개)를 초과했습니다. 로그인이 필요합니다.");
    }

    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      url: request.url,
      userMemo: request.userMemo,
      aiStatus: "processing",
      guestId: guestId,
      createdAt: new Date().toISOString(),
      status: "unread",
      title: "",
      summary: "",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    const bookmarks = [newBookmark, ...currentBookmarks];
    storage.set(GUEST_KEY, bookmarks);

    return newBookmark;
  }

  /**
   * @description 필터 조건에 맞는 북마크 목록을 조회합니다.
   */
  async findAll(filter?: BookmarkFilter): Promise<Bookmark[]> {
    const currentBookmarks = storage.get<Bookmark[]>(GUEST_KEY) ?? [];

    return currentBookmarks;
  }

  /**
   * @description 특정 북마크의 상세 정보를 조회합니다.
   */
  async findById(id: string): Promise<Bookmark | null> {
    const currentBookmarks = await this.findAll();
    const findOneBookmart = currentBookmarks.find((item) => item.id == id);
    return findOneBookmart ?? null;
  }

  /**
   * @description 북마크를 삭제합니다.
   */
  async delete(id: string): Promise<void> {
    const currentBookmarks = await this.findAll();
    const updatedBookmarks = currentBookmarks.filter((item) => item.id != id);
    storage.set(GUEST_KEY, updatedBookmarks);
  }

  /**
   * @description 북마크 전체를 삭제합니다.
   */
  async removeAll(): Promise<void> {
    storage.set(GUEST_KEY, []);
  }

  /**
   * @description 특정 사용자의 현재 북마크 개수를 조회합니다. (5개 제한 체크용)
   */
  async count(): Promise<number> {
    const currentBookmarks = await this.findAll();

    return currentBookmarks.length;
  }

  async update(id: string, data: UpdateBookmarkData): Promise<void> {
    const existingBookmark = await this.findById(id);

    if (!existingBookmark) {
      throw new Error(`ID가 ${id}인 북마크를 찾을 수 없습니다.`);
    }

    const updatedBookmark: Bookmark = {
      ...existingBookmark,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const allBookmarks = await this.findAll();
    const updatedList = allBookmarks.map((bookmark) =>
      bookmark.id === id ? updatedBookmark : bookmark
    );

    storage.set(GUEST_KEY, updatedList);
  }
}
