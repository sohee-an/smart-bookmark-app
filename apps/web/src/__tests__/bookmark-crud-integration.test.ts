import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalRepository } from "@/entities/bookmark/api/local.repository";
import type { StorageProvider } from "@/entities/bookmark/api/local.repository";
import type { BookmarkRow } from "@/entities/bookmark/api/bookmark.types.db";

vi.mock("@/shared/lib/guest", () => ({
  default: () => "test-guest-id",
}));

/**
 * 통합 테스트: 북마크 CRUD 전체 생명주기
 *
 * 저장 → 조회 → 수정 → 삭제가 Repository를 통해 일관되게 동작하는지 검증.
 * 단위 테스트는 각 메서드를 개별 검증하지만,
 * 통합 테스트는 메서드 간 데이터가 정확히 연결되는지 확인한다.
 */
describe("북마크 CRUD 생명주기 통합", () => {
  let mockStorage: StorageProvider;
  let storedBookmarks: BookmarkRow[];
  let repo: LocalRepository;
  let uuidCount: number;

  beforeEach(() => {
    uuidCount = 0;
    storedBookmarks = [];
    mockStorage = {
      get: vi.fn(() => storedBookmarks as unknown) as StorageProvider["get"],
      set: vi.fn((_key, value) => {
        storedBookmarks.length = 0;
        storedBookmarks.push(...(value as BookmarkRow[]));
      }) as StorageProvider["set"],
    };

    repo = new LocalRepository(
      mockStorage,
      () => new Date("2024-06-01T10:00:00Z"),
      () => `crud-${++uuidCount}`
    );
  });

  it("저장 → 조회 → 수정 → 조회 → 삭제 → 조회 전체 흐름", async () => {
    // 1. 저장
    const saved = await repo.save({
      url: "https://example.com/article",
      userMemo: "나중에 읽기",
      guestId: "test-guest-id",
    });
    expect(saved.id).toBe("crud-1");
    expect(saved.url).toBe("https://example.com/article");
    expect(saved.aiStatus).toBe("crawling");

    // 2. 단건 조회 — 저장한 데이터와 일치
    const found = await repo.findById(saved.id);
    expect(found).not.toBeNull();
    expect(found?.url).toBe(saved.url);
    expect(found?.id).toBe(saved.id);

    // 3. 목록 조회 — 1개 존재
    const list1 = await repo.findAll();
    expect(list1).toHaveLength(1);

    // 4. 수정 — title, status 변경
    await repo.update(saved.id, {
      title: "수정된 제목",
      status: "read",
    });

    const updated = await repo.findById(saved.id);
    expect(updated?.title).toBe("수정된 제목");
    expect(updated?.status).toBe("read");
    // 수정하지 않은 필드는 유지
    expect(updated?.url).toBe("https://example.com/article");
    expect(updated?.aiStatus).toBe("crawling");

    // 5. 삭제
    await repo.delete(saved.id);

    const deleted = await repo.findById(saved.id);
    expect(deleted).toBeNull();

    const list2 = await repo.findAll();
    expect(list2).toHaveLength(0);
  });

  it("여러 북마크 저장 후 개별 삭제 — 나머지 유지", async () => {
    await repo.save({ url: "https://a.com", guestId: "test-guest-id" });
    const bm2 = await repo.save({ url: "https://b.com", guestId: "test-guest-id" });
    await repo.save({ url: "https://c.com", guestId: "test-guest-id" });

    expect(await repo.count()).toBe(3);

    // 중간 것 삭제
    await repo.delete(bm2.id);

    const remaining = await repo.findAll();
    expect(remaining).toHaveLength(2);
    expect(remaining.map((b) => b.url)).toContain("https://a.com");
    expect(remaining.map((b) => b.url)).toContain("https://c.com");
    expect(remaining.map((b) => b.url)).not.toContain("https://b.com");
  });

  it("전체 삭제(removeAll) 후 빈 상태 확인", async () => {
    await repo.save({ url: "https://a.com", guestId: "test-guest-id" });
    await repo.save({ url: "https://b.com", guestId: "test-guest-id" });
    expect(await repo.count()).toBe(2);

    await repo.removeAll();

    expect(await repo.count()).toBe(0);
    expect(await repo.findAll()).toEqual([]);
  });

  it("존재하지 않는 북마크 수정 시 에러", async () => {
    await expect(repo.update("nonexistent-id", { title: "test" })).rejects.toThrow();
  });

  it("수정 시 updatedAt 갱신 — createdAt은 유지", async () => {
    const earlyRepo = new LocalRepository(
      mockStorage,
      () => new Date("2024-01-01T00:00:00Z"),
      () => `time-${++uuidCount}`
    );
    const bookmark = await earlyRepo.save({
      url: "https://example.com",
      guestId: "test-guest-id",
    });
    const originalCreatedAt = bookmark.createdAt;
    const originalUpdatedAt = bookmark.updatedAt;

    // 시간이 흐른 후 수정
    const laterRepo = new LocalRepository(
      mockStorage,
      () => new Date("2024-06-01T12:00:00Z"),
      () => `time-${++uuidCount}`
    );
    await laterRepo.update(bookmark.id, { title: "Updated" });

    const updated = await laterRepo.findById(bookmark.id);
    expect(updated?.createdAt).toBe(originalCreatedAt);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    );
  });

  it("태그 수정 → 조회 시 수정된 태그 반영", async () => {
    const bookmark = await repo.save({
      url: "https://example.com",
      guestId: "test-guest-id",
    });

    // AI 완료 시뮬레이션
    await repo.update(bookmark.id, {
      aiStatus: "completed",
      tags: ["react", "javascript"],
    });

    // 유저가 태그 수정
    await repo.update(bookmark.id, {
      tags: ["react", "typescript", "nextjs"],
    });

    const result = await repo.findById(bookmark.id);
    expect(result?.tags).toEqual(["react", "typescript", "nextjs"]);
    // aiStatus는 유지
    expect(result?.aiStatus).toBe("completed");
  });

  it("저장 순서 유지 — 최신이 먼저", async () => {
    await repo.save({ url: "https://first.com", guestId: "test-guest-id" });
    await repo.save({ url: "https://second.com", guestId: "test-guest-id" });
    await repo.save({ url: "https://third.com", guestId: "test-guest-id" });

    const all = await repo.findAll();
    // LocalRepository는 새 항목을 앞에 추가 (unshift)
    expect(all[0].url).toBe("https://third.com");
    expect(all[1].url).toBe("https://second.com");
    expect(all[2].url).toBe("https://first.com");
  });
});
