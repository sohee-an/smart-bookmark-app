import { describe, it, expect, beforeEach, vi } from "vitest";
import { GUEST_BOOKMARK_LIMIT, LocalRepository } from "@/entities/bookmark/api/local.repository";
import type { StorageProvider } from "@/entities/bookmark/api/local.repository";

describe(`비회원 저장 워크플로우 (${GUEST_BOOKMARK_LIMIT}개 제한)`, () => {
  let mockStorage: StorageProvider;
  let repo: LocalRepository;
  let uuidCounter = 0;

  beforeEach(() => {
    uuidCounter = 0;
    const storedBookmarks: Record<string, string>[] = [];

    mockStorage = {
      get: vi.fn(() => storedBookmarks as unknown) as StorageProvider["get"],
      set: vi.fn((key, value) => {
        storedBookmarks.length = 0;
        storedBookmarks.push(...(value as typeof storedBookmarks));
      }) as StorageProvider["set"],
    };

    repo = new LocalRepository(
      mockStorage,
      () => new Date("2024-03-08T10:00:00Z"),
      () => `uuid-${++uuidCounter}`
    );
  });

  const fillToLimit = async () => {
    for (let i = 1; i <= GUEST_BOOKMARK_LIMIT; i++) {
      await repo.save({ url: `https://example${i}.com` });
    }
  };

  it("한도까지 북마크를 성공적으로 저장", async () => {
    await fillToLimit();
    expect(await repo.count()).toBe(GUEST_BOOKMARK_LIMIT);
  });

  it("한도 초과 시 GUEST_LIMIT_EXCEEDED 에러 발생", async () => {
    await fillToLimit();

    await expect(repo.save({ url: "https://over.com" })).rejects.toThrow(Error);

    try {
      await repo.save({ url: "https://over.com" });
    } catch (e: unknown) {
      if (e instanceof Error) {
        expect(e.message).toContain("무료 체험 한도");
      }
    }
  });

  it("여러 번 시도해도 한도 유지", async () => {
    await fillToLimit();

    for (let j = 0; j < 3; j++) {
      await expect(repo.save({ url: `https://fail${j}.com` })).rejects.toThrow(Error);
    }

    expect(await repo.count()).toBe(GUEST_BOOKMARK_LIMIT);
  });

  it("1개 삭제 후 새로운 북마크 저장 가능", async () => {
    await fillToLimit();

    await repo.delete("uuid-1");

    const result = await repo.save({ url: "https://new.com" });
    expect(result.id).toBe(`uuid-${GUEST_BOOKMARK_LIMIT + 1}`);
    expect(await repo.count()).toBe(GUEST_BOOKMARK_LIMIT);
  });
});
