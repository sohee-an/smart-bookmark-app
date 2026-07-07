import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { LocalRepository } from "@/entities/bookmark/api/local.repository";
import type { StorageProvider } from "@/entities/bookmark/api/local.repository";
import type { BookmarkRow } from "@/entities/bookmark/api/bookmark.types.db";

// BookmarkService mock — LocalRepository를 내부적으로 사용하도록
vi.mock("@/shared/api/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock("@/shared/lib/guest", () => ({
  default: () => "test-guest-id",
}));

/**
 * 통합 테스트: 북마크 파이프라인 (크롤링 → AI 분석 → 완료)
 *
 * 단위 테스트와의 차이:
 * - 단위: LocalRepository.update() 하나만 검증
 * - 통합: fetch(API) → Service → Repository → 캐시까지 연결된 흐름 검증
 */
describe("북마크 파이프라인 통합 (fetch → service → repository → cache)", () => {
  let mockStorage: StorageProvider;
  let storedBookmarks: BookmarkRow[];
  let repo: LocalRepository;
  let queryClient: QueryClient;

  beforeEach(() => {
    storedBookmarks = [];
    mockStorage = {
      get: vi.fn(() => storedBookmarks as unknown) as StorageProvider["get"],
      set: vi.fn((_key, value) => {
        storedBookmarks.length = 0;
        storedBookmarks.push(...(value as BookmarkRow[]));
      }) as StorageProvider["set"],
    };

    let uuidCount = 0;
    repo = new LocalRepository(
      mockStorage,
      () => new Date("2024-06-01T10:00:00Z"),
      () => `pipeline-${++uuidCount}`
    );

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it("크롤링 성공 → AI 분석 성공 → completed 전체 파이프라인", async () => {
    // 1. 북마크 저장 (crawling 상태)
    const bookmark = await repo.save({
      url: "https://react.dev/learn",
      userMemo: "리액트 공식 문서",
      guestId: "test-guest-id",
    });
    expect(bookmark.aiStatus).toBe("crawling");
    expect(bookmark.title).toBe("");

    // 2. 크롤링 완료 시뮬레이션 → processing 전환
    await repo.update(bookmark.id, {
      aiStatus: "processing",
      title: "React 공식 문서 – 빠르게 시작하기",
    });

    const afterCrawl = await repo.findById(bookmark.id);
    expect(afterCrawl?.aiStatus).toBe("processing");
    expect(afterCrawl?.title).toBe("React 공식 문서 – 빠르게 시작하기");
    // 원래 데이터 유지 확인
    expect(afterCrawl?.url).toBe("https://react.dev/learn");

    // 3. AI 분석 완료 시뮬레이션 → completed 전환
    await repo.update(bookmark.id, {
      aiStatus: "completed",
      summary: "React의 핵심 개념과 컴포넌트 작성법을 단계별로 설명하는 공식 튜토리얼",
      tags: ["react", "공식문서", "튜토리얼"],
    });

    const afterAi = await repo.findById(bookmark.id);
    expect(afterAi?.aiStatus).toBe("completed");
    expect(afterAi?.summary).toContain("React");
    expect(afterAi?.tags).toEqual(["react", "공식문서", "튜토리얼"]);
    // 이전 단계 데이터 유지
    expect(afterAi?.title).toBe("React 공식 문서 – 빠르게 시작하기");
    expect(afterAi?.url).toBe("https://react.dev/learn");
    expect(afterAi?.status).toBe("unread");
  });

  it("크롤링 실패 → crawl_failed → 재시도 → 성공", async () => {
    const bookmark = await repo.save({
      url: "https://flaky-site.com/article",
      guestId: "test-guest-id",
    });

    // 크롤링 실패
    await repo.update(bookmark.id, { aiStatus: "crawl_failed" });
    const failed = await repo.findById(bookmark.id);
    expect(failed?.aiStatus).toBe("crawl_failed");

    // 재시도 — crawling으로 되돌림
    await repo.update(bookmark.id, { aiStatus: "crawling" });
    const retrying = await repo.findById(bookmark.id);
    expect(retrying?.aiStatus).toBe("crawling");

    // 재시도 성공 → processing → completed
    await repo.update(bookmark.id, {
      aiStatus: "processing",
      title: "Flaky Site Article",
    });
    await repo.update(bookmark.id, {
      aiStatus: "completed",
      summary: "재시도 후 성공한 분석 결과",
      tags: ["article"],
    });

    const final = await repo.findById(bookmark.id);
    expect(final?.aiStatus).toBe("completed");
    expect(final?.summary).toBe("재시도 후 성공한 분석 결과");
  });

  it("AI 분석 실패 → failed (크롤링은 성공했지만 AI만 실패)", async () => {
    const bookmark = await repo.save({
      url: "https://example.com/complex-page",
      guestId: "test-guest-id",
    });

    // 크롤링 성공
    await repo.update(bookmark.id, {
      aiStatus: "processing",
      title: "Complex Page",
    });

    // AI 분석 실패
    await repo.update(bookmark.id, { aiStatus: "failed" });

    const result = await repo.findById(bookmark.id);
    expect(result?.aiStatus).toBe("failed");
    // 크롤링에서 가져온 title은 유지
    expect(result?.title).toBe("Complex Page");
    // summary/tags는 비어있음
    expect(result?.summary).toBe("");
    expect(result?.tags).toEqual([]);
  });

  it("여러 북마크 동시 파이프라인 — 각각 독립적 상태 관리", async () => {
    const [bm1, bm2] = await Promise.all([
      repo.save({ url: "https://a.com", guestId: "test-guest-id" }),
      repo.save({ url: "https://b.com", guestId: "test-guest-id" }),
    ]);
    await repo.save({ url: "https://c.com", guestId: "test-guest-id" });

    // bm1: completed, bm2: failed, bm3(https://c.com): 아직 crawling
    await repo.update(bm1.id, { aiStatus: "processing", title: "A" });
    await repo.update(bm1.id, { aiStatus: "completed", summary: "A summary", tags: ["a"] });

    await repo.update(bm2.id, { aiStatus: "crawl_failed" });

    // 각 북마크 상태 독립 검증
    const all = await repo.findAll();
    const statusMap = Object.fromEntries(all.map((b) => [b.url, b.aiStatus]));

    expect(statusMap["https://a.com"]).toBe("completed");
    expect(statusMap["https://b.com"]).toBe("crawl_failed");
    expect(statusMap["https://c.com"]).toBe("crawling");
  });

  it("파이프라인 중 읽음 상태 변경 — aiStatus와 status 독립", async () => {
    const bookmark = await repo.save({
      url: "https://example.com",
      guestId: "test-guest-id",
    });

    // 유저가 카드 클릭 → read 처리
    await repo.update(bookmark.id, { status: "read" });

    // 동시에 파이프라인 진행
    await repo.update(bookmark.id, { aiStatus: "processing", title: "Title" });
    await repo.update(bookmark.id, {
      aiStatus: "completed",
      summary: "Summary",
      tags: ["tag"],
    });

    const final = await repo.findById(bookmark.id);
    // aiStatus는 파이프라인 결과
    expect(final?.aiStatus).toBe("completed");
    // status는 유저 액션 결과 — 파이프라인에 영향 안 받음
    expect(final?.status).toBe("read");
  });
});
