import type { Bookmark } from "@/entities/bookmark/model/types";

export function filterBookmarks(
  bookmarks: Bookmark[],
  selectedTags: string[],
  query: string
): Bookmark[] {
  const byTag =
    selectedTags.length === 0
      ? bookmarks
      : bookmarks.filter((b) => selectedTags.some((t) => b.tags.includes(t)));

  return query
    ? byTag.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.summary?.toLowerCase().includes(query.toLowerCase()) ||
          b.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : byTag;
}
