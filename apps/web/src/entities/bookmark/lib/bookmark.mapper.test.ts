import { describe, it, expect } from "vitest";
import { toBookmark } from "./bookmark.mapper";
import type { BookmarkRow } from "../api/bookmark.types.db";

describe("BookmarkMapper", () => {
  describe("toBookmark", () => {
    it("should convert BookmarkRow to Bookmark correctly", () => {
      const row: BookmarkRow = {
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example Page",
        summary: "This is a summary",
        content: "Full content here",
        userMemo: "My notes",
        thumbnailUrl: "https://example.com/thumb.jpg",
        aiStatus: "completed",
        tags: ["react", "typescript"],
        status: "unread",
        createdAt: "2024-03-08T00:00:00Z",
        userId: "user-123",
        updatedAt: "2024-03-08T10:00:00Z",
      };

      const result = toBookmark(row);

      expect(result).toEqual({
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example Page",
        summary: "This is a summary",
        thumbnailUrl: "https://example.com/thumb.jpg",
        aiStatus: "completed",
        tags: ["react", "typescript"],
        status: "unread",
        userId: "user-123",
        createdAt: "2024-03-08T00:00:00Z",
        updatedAt: "2024-03-08T10:00:00Z",
      });
    });

    it("should handle missing userId by converting to empty string", () => {
      const row: BookmarkRow = {
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example",
        summary: "",
        aiStatus: "crawling",
        tags: [],
        status: "unread",
        createdAt: "2024-03-08T00:00:00Z",
        updatedAt: "2024-03-08T00:00:00Z",
        guestId: "guest-123",
      };

      const result = toBookmark(row);

      expect(result.userId).toBe("");
    });

    it("should exclude optional fields not in Bookmark interface", () => {
      const row: BookmarkRow = {
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example",
        summary: "",
        content: "Full content",
        userMemo: "Notes",
        aiStatus: "crawling",
        tags: [],
        status: "unread",
        createdAt: "2024-03-08T00:00:00Z",
        updatedAt: "2024-03-08T00:00:00Z",
        guestId: "guest-123",
      };

      const result = toBookmark(row);

      expect(result).not.toHaveProperty("content");
      expect(result).not.toHaveProperty("userMemo");
      expect(result).not.toHaveProperty("guestId");
    });

    it("should handle all aiStatus types", () => {
      const statuses: Array<"crawling" | "processing" | "completed" | "failed"> = [
        "crawling",
        "processing",
        "completed",
        "failed",
      ];

      statuses.forEach((status) => {
        const row: BookmarkRow = {
          id: "bookmark-1",
          url: "https://example.com",
          title: "Example",
          summary: "",
          aiStatus: status,
          tags: [],
          status: "unread",
          createdAt: "2024-03-08T00:00:00Z",
          updatedAt: "2024-03-08T00:00:00Z",
        };

        const result = toBookmark(row);
        expect(result.aiStatus).toBe(status);
      });
    });

    it("should preserve all tags when converting", () => {
      const tags = ["react", "typescript", "testing", "next.js"];
      const row: BookmarkRow = {
        id: "bookmark-1",
        url: "https://example.com",
        title: "Example",
        summary: "",
        aiStatus: "completed",
        tags,
        status: "unread",
        createdAt: "2024-03-08T00:00:00Z",
        updatedAt: "2024-03-08T00:00:00Z",
      };

      const result = toBookmark(row);

      expect(result.tags).toEqual(tags);
      expect(result.tags.length).toBe(4);
    });
  });
});
