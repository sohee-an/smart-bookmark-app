import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalRepository } from "@/entities/bookmark/api/local.repository";
import { BookmarkError, BookmarkErrorCode } from "@/entities/bookmark/model/bookmark.error";
import type { StorageProvider } from "@/entities/bookmark/api/local.repository";

describe("비회원 저장 워크플로우 (5개 제한)", () => {
  let mockStorage: StorageProvider;
  let repo: LocalRepository;
  let uuidCounter = 0;

  beforeEach(() => {
    uuidCounter = 0;
    const storedBookmarks: any[] = [];

    mockStorage = {
      get: vi.fn(() => storedBookmarks),
      set: vi.fn((key, value) => {
        storedBookmarks.length = 0;
        storedBookmarks.push(...value);
      }),
    };

    repo = new LocalRepository(
      mockStorage,
      () => new Date("2024-03-08T10:00:00Z"),
      () => `uuid-${++uuidCounter}`
    );
  });

  it("5개의 북마크를 성공적으로 저장", async () => {
    for (let i = 1; i <= 5; i++) {
      const result = await repo.save({
        url: `https://example${i}.com`,
      });
      expect(result.id).toBe(`uuid-${i}`);
    }

    const count = await repo.count();
    expect(count).toBe(5);
  });

  it("6번째 북마크에서 GUEST_LIMIT_EXCEEDED 에러 발생", async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.save({ url: `https://example${i}.com` });
    }

    await expect(repo.save({ url: "https://example6.com" })).rejects.toThrow(
      BookmarkError
    );

    try {
      await repo.save({ url: "https://example6.com" });
    } catch (e) {
      if (e instanceof BookmarkError) {
        expect(e.code).toBe(BookmarkErrorCode.GUEST_LIMIT_EXCEEDED);
      }
    }
  });

  it("여러 번 시도해도 5개 제한 유지", async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.save({ url: `https://example${i}.com` });
    }

    for (let j = 0; j < 3; j++) {
      await expect(
        repo.save({ url: `https://fail${j}.com` })
      ).rejects.toThrow(BookmarkError);
    }

    const finalCount = await repo.count();
    expect(finalCount).toBe(5);
  });

  it("1개 삭제 후 새로운 북마크 저장 가능", async () => {
    for (let i = 1; i <= 5; i++) {
      await repo.save({ url: `https://example${i}.com` });
    }

    await repo.delete("uuid-1");

    const result = await repo.save({ url: "https://example6.com" });
    expect(result.id).toBe("uuid-6");

    const count = await repo.count();
    expect(count).toBe(5);
  });
});
