import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalRepository, type StorageProvider } from "./local.repository";
import { BookmarkError, BookmarkErrorCode } from "../model/bookmark.error";

vi.mock("@/shared/lib/guest", () => ({ default: () => "guest-fixed" }));

/** 인메모리 StorageProvider — 실제 localStorage 없이 저장 로직만 검증 */
class FakeStorage implements StorageProvider {
  private store = new Map<string, unknown>();
  get<T>(key: string): T | null {
    return this.store.has(key) ? (this.store.get(key) as T) : null;
  }
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }
}

function makeRepo() {
  const storage = new FakeStorage();
  let seq = 0;
  const repo = new LocalRepository(
    storage,
    () => new Date("2026-01-01T00:00:00.000Z"),
    () => `id-${++seq}`
  );
  return { repo, storage };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LocalRepository — 비회원 저장", () => {
  it("저장하면 Bookmark를 반환하고 목록에 쌓인다", async () => {
    const { repo } = makeRepo();

    const saved = await repo.save({ url: "https://a.com" });

    expect(saved.id).toBe("id-1");
    expect(saved.url).toBe("https://a.com");
    expect(saved.aiStatus).toBe("crawling");
    expect(await repo.count()).toBe(1);
  });

  it("최신 저장이 목록 맨 앞에 온다", async () => {
    const { repo } = makeRepo();
    await repo.save({ url: "https://1.com" });
    await repo.save({ url: "https://2.com" });

    const all = await repo.findAll();
    expect(all.map((b) => b.url)).toEqual(["https://2.com", "https://1.com"]);
  });

  describe("5개 제한 (핵심 비즈니스 규칙)", () => {
    it("5개까지는 저장되고 6번째는 GUEST_LIMIT_EXCEEDED를 던진다", async () => {
      const { repo } = makeRepo();
      for (let i = 0; i < 5; i++) {
        await repo.save({ url: `https://${i}.com` });
      }
      expect(await repo.count()).toBe(5);

      await expect(repo.save({ url: "https://6.com" })).rejects.toBeInstanceOf(BookmarkError);
      await expect(repo.save({ url: "https://6.com" })).rejects.toMatchObject({
        code: BookmarkErrorCode.GUEST_LIMIT_EXCEEDED,
      });
      // 한도 초과 시 실제로 저장되지 않아야 함
      expect(await repo.count()).toBe(5);
    });
  });
});

describe("LocalRepository — 조회/수정/삭제", () => {
  it("findById는 존재하면 반환, 없으면 null", async () => {
    const { repo } = makeRepo();
    await repo.save({ url: "https://a.com" });

    expect((await repo.findById("id-1"))?.url).toBe("https://a.com");
    expect(await repo.findById("nope")).toBeNull();
  });

  it("update는 필드를 갱신한다", async () => {
    const { repo } = makeRepo();
    await repo.save({ url: "https://a.com" });

    await repo.update("id-1", { title: "새 제목", status: "read" });

    const found = await repo.findById("id-1");
    expect(found?.title).toBe("새 제목");
    expect(found?.status).toBe("read");
  });

  it("존재하지 않는 id update 시 BOOKMARK_NOT_FOUND를 던진다", async () => {
    const { repo } = makeRepo();
    await expect(repo.update("nope", { title: "x" })).rejects.toMatchObject({
      code: BookmarkErrorCode.BOOKMARK_NOT_FOUND,
    });
  });

  it("delete는 해당 항목만 제거한다", async () => {
    const { repo } = makeRepo();
    await repo.save({ url: "https://1.com" }); // id-1
    await repo.save({ url: "https://2.com" }); // id-2

    await repo.delete("id-1");

    const all = await repo.findAll();
    expect(all.map((b) => b.id)).toEqual(["id-2"]);
  });

  it("removeAll은 전체를 비운다", async () => {
    const { repo } = makeRepo();
    await repo.save({ url: "https://1.com" });
    await repo.save({ url: "https://2.com" });

    await repo.removeAll();

    expect(await repo.count()).toBe(0);
  });
});
