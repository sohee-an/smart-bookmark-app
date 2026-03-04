import type { BookmarkRow } from "../api/bookmark.types.db";
import type { Bookmark } from "../model/types";

export function toBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    thumbnailUrl: row.thumbnailUrl,
    aiStatus: row.aiStatus,
    status: row.status,
    tags: row.tags,
    userId: row.userId ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
