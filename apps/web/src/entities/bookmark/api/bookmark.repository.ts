import type { Bookmark } from "../model/types";
import type { BookmarkFilter, CreateBookmarkRequest } from "./bookmark.types.db";

export type UpdateBookmarkData = Partial<
  Pick<Bookmark, "title" | "summary" | "tags" | "aiStatus" | "status">
>;

/**
 * @description 북마크 데이터에 접근하는 추상화된 인터페이스 (Repository)
 * 나중에 백엔드를 갈아끼울 때, 이 인터페이스의 구현체만 교체하면 됩니다.
 */
export interface BookmarkRepository {
  save(request: CreateBookmarkRequest): Promise<Bookmark>;
  findAll(filter?: BookmarkFilter): Promise<Bookmark[]>;
  findById(id: string): Promise<Bookmark | null>;
  delete(id: string): Promise<void>;
  removeAll(): Promise<void>;
  count(userIdOrTempId?: string): Promise<number>;
  update(id: string, data: UpdateBookmarkData): Promise<void>;
}
