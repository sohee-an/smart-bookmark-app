import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalRepository } from "@/entities/bookmark/api/local.repository";
import type { StorageProvider } from "@/entities/bookmark/api/local.repository";
import type { BookmarkRow } from "@/entities/bookmark/api/bookmark.types.db";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { toBookmark } from "@/entities/bookmark/lib/bookmark.mapper";

describe("URL → AI 파이프라인 상태 변화", () => {
  describe("북마크 저장 후 aiStatus 진행", () => {
    let mockStorage: StorageProvider;
    let storedBookmarks: BookmarkRow[];
    let repo: LocalRepository;

    beforeEach(() => {
      storedBookmarks = [];

      mockStorage = {
        get: vi.fn(() => storedBookmarks),
        set: vi.fn((key, value) => {
          storedBookmarks.length = 0;
          storedBookmarks.push(...value);
        }),
      };

      repo = new LocalRepository(
        mockStorage,
        () => new Date("2024-03-08T12:00:00Z"),
        () => "fixed-uuid-pipeline"
      );
    });

    it("저장 후 aiStatus='crawling'으로 초기화", async () => {
      const bookmark = await repo.save({
        url: "https://example.com",
        userMemo: "test article",
        guestId: "guest-1",
      });

      expect(bookmark.aiStatus).toBe("crawling");
    });

    it("crawling에서 processing으로 전환", async () => {
      // 1. Save bookmark (aiStatus: crawling)
      const bookmark = await repo.save({
        url: "https://example.com/article",
        userMemo: "interesting read",
        guestId: "guest-1",
      });

      expect(bookmark.aiStatus).toBe("crawling");

      // 2. Simulate crawler completing and transitioning to processing
      await repo.update(bookmark.id, {
        aiStatus: "processing",
        title: "Article Title",
      });

      // 3. Verify state changed
      const updatedBookmark = await repo.findById(bookmark.id);
      expect(updatedBookmark?.aiStatus).toBe("processing");
      expect(updatedBookmark?.title).toBe("Article Title");
    });

    it("processing에서 completed로 전환", async () => {
      // 1. Save bookmark
      const bookmark = await repo.save({
        url: "https://blog.example.com/post",
        guestId: "guest-1",
      });

      // 2. Transition: crawling → processing
      await repo.update(bookmark.id, {
        aiStatus: "processing",
        title: "Blog Post Title",
      });

      // 3. Transition: processing → completed
      await repo.update(bookmark.id, {
        aiStatus: "completed",
        summary: "This is an AI-generated summary",
        tags: ["javascript", "react"],
      });

      // 4. Verify final state
      const finalBookmark = await repo.findById(bookmark.id);
      expect(finalBookmark?.aiStatus).toBe("completed");
      expect(finalBookmark?.summary).toBe("This is an AI-generated summary");
      expect(finalBookmark?.tags).toEqual(["javascript", "react"]);
    });

    it("실패한 파이프라인 전환 처리", async () => {
      // 1. Save bookmark
      const bookmark = await repo.save({
        url: "https://broken-link.com",
        guestId: "guest-1",
      });

      expect(bookmark.aiStatus).toBe("crawling");

      // 2. Simulate crawler failure
      await repo.update(bookmark.id, {
        aiStatus: "failed",
        summary: "Failed to process URL",
      });

      // 3. Verify failed state
      const failedBookmark = await repo.findById(bookmark.id);
      expect(failedBookmark?.aiStatus).toBe("failed");
      expect(failedBookmark?.summary).toBe("Failed to process URL");
    });

    it("파이프라인 전환 중 상태 유지", async () => {
      // 1. Save and verify initial state
      const bookmark = await repo.save({
        url: "https://example.com/react-perf",
        userMemo: "Important article",
        guestId: "guest-1",
      });

      expect(bookmark.url).toBe("https://example.com/react-perf");
      expect(bookmark.aiStatus).toBe("crawling");

      // 2. Through processing state
      await repo.update(bookmark.id, {
        aiStatus: "processing",
        title: "React Performance Optimization",
      });

      const processing = await repo.findById(bookmark.id);
      expect(processing?.url).toBe("https://example.com/react-perf");
      expect(processing?.aiStatus).toBe("processing");
      expect(processing?.title).toBe("React Performance Optimization");

      // 3. To completed state
      await repo.update(bookmark.id, {
        aiStatus: "completed",
        summary: "Advanced techniques for optimizing React components",
        tags: ["react", "performance", "javascript"],
      });

      const completed = await repo.findById(bookmark.id);
      expect(completed?.url).toBe("https://example.com/react-perf");
      expect(completed?.aiStatus).toBe("completed");
      expect(completed?.tags).toContain("react");
    });

    it("여러 북마크가 동시에 다른 파이프라인 상태에 있음", async () => {
      // Use different UUID providers for each save
      const repo1 = new LocalRepository(mockStorage, () => new Date("2024-03-08T12:00:00Z"), () => "uuid-1");
      const repo2 = new LocalRepository(mockStorage, () => new Date("2024-03-08T12:00:00Z"), () => "uuid-2");
      const repo3 = new LocalRepository(mockStorage, () => new Date("2024-03-08T12:00:00Z"), () => "uuid-3");

      // Create 3 bookmarks at different stages
      const bm1 = await repo1.save({
        url: "https://example.com/1",
        guestId: "guest-1",
      });
      expect(bm1.aiStatus).toBe("crawling");

      const bm2 = await repo2.save({
        url: "https://example.com/2",
        guestId: "guest-1",
      });
      expect(bm2.aiStatus).toBe("crawling");

      const bm3 = await repo3.save({
        url: "https://example.com/3",
        guestId: "guest-1",
      });
      expect(bm3.aiStatus).toBe("crawling");

      // Update first one to processing
      await repo1.update(bm1.id, {
        aiStatus: "processing",
        title: "Title 1",
      });

      // Update second to completed
      await repo2.update(bm2.id, {
        aiStatus: "completed",
        title: "Title 2",
        summary: "Summary 2",
      });

      // Verify each in different state
      const all = await repo1.findAll();
      const states = all.map((b) => ({
        id: b.id,
        aiStatus: b.aiStatus,
      }));

      expect(states).toContainEqual({ id: bm1.id, aiStatus: "processing" });
      expect(states).toContainEqual({ id: bm2.id, aiStatus: "completed" });
      expect(states).toContainEqual({ id: bm3.id, aiStatus: "crawling" });
    });

    it("aiStatus 업데이트 시 status는 변경되지 않음", async () => {
      const bookmark = await repo.save({
        url: "https://example.com",
        guestId: "guest-1",
      });

      expect(bookmark.status).toBe("unread");

      // Update aiStatus through pipeline
      await repo.update(bookmark.id, {
        aiStatus: "completed",
        title: "Title",
      });

      // Status should remain unchanged
      const updated = await repo.findById(bookmark.id);
      expect(updated?.status).toBe("unread");
    });

    it("aiStatus 변경 시 updatedAt 타임스탬프 추적", async () => {
      const initialDate = new Date("2024-03-08T12:00:00Z");
      const processingDate = new Date("2024-03-08T12:05:00Z");
      const completedDate = new Date("2024-03-08T12:10:00Z");

      const repo1 = new LocalRepository(
        mockStorage,
        () => initialDate,
        () => "uuid-1"
      );

      const bookmark = await repo1.save({
        url: "https://example.com",
        guestId: "guest-1",
      });

      const initialUpdatedAt = bookmark.updatedAt;

      // Move time forward and update
      const repo2 = new LocalRepository(
        mockStorage,
        () => processingDate,
        () => "uuid-2"
      );

      await repo2.update(bookmark.id, {
        aiStatus: "processing",
      });

      const processingBookmark = await repo2.findById(bookmark.id);
      expect(processingBookmark?.updatedAt).not.toBe(initialUpdatedAt);
      expect(
        new Date(processingBookmark?.updatedAt || "").getTime()
      ).toBeGreaterThan(new Date(initialUpdatedAt).getTime());
    });

    it("빠른 파이프라인 상태 전환 처리", async () => {
      const bookmark = await repo.save({
        url: "https://example.com",
        guestId: "guest-1",
      });

      // Rapid transitions
      await repo.update(bookmark.id, { aiStatus: "processing" });
      await repo.update(bookmark.id, { aiStatus: "processing" });
      await repo.update(bookmark.id, { aiStatus: "completed", title: "Fast" });

      const final = await repo.findById(bookmark.id);
      expect(final?.aiStatus).toBe("completed");
      expect(final?.title).toBe("Fast");
    });
  });

  describe("파이프라인 실패 및 복구", () => {
    let mockStorage: StorageProvider;
    let storedBookmarks: BookmarkRow[];
    let repo: LocalRepository;

    beforeEach(() => {
      storedBookmarks = [];
      mockStorage = {
        get: vi.fn(() => storedBookmarks),
        set: vi.fn((key, value) => {
          storedBookmarks.length = 0;
          storedBookmarks.push(...value);
        }),
      };
      repo = new LocalRepository(mockStorage);
    });

    it("에러 발생 시 crawling → failed 전환", async () => {
      const bookmark = await repo.save({
        url: "https://invalid-domain.com",
        guestId: "guest-1",
      });

      await repo.update(bookmark.id, {
        aiStatus: "failed",
        summary: "Network error during crawl",
      });

      const failed = await repo.findById(bookmark.id);
      expect(failed?.aiStatus).toBe("failed");
    });

    it("재시도를 위해 failed → processing 전환", async () => {
      const bookmark = await repo.save({
        url: "https://example.com",
        guestId: "guest-1",
      });

      // First attempt fails
      await repo.update(bookmark.id, {
        aiStatus: "failed",
        summary: "Initial error",
      });

      // Retry
      await repo.update(bookmark.id, {
        aiStatus: "processing",
        summary: "Retrying...",
      });

      const retrying = await repo.findById(bookmark.id);
      expect(retrying?.aiStatus).toBe("processing");
    });
  });
});
