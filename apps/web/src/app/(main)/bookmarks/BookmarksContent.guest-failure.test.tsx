import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { encodeEmbedding } from "@/features/bookmark/lib/semantic";

let currentParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => currentParams,
}));

const bookmarksData: Bookmark[] = [];
vi.mock("@/features/bookmark/model/queries", () => ({
  useBookmarks: () => ({ data: bookmarksData, isError: false, refetch: vi.fn() }),
  useUpdateBookmark: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteBookmark: () => ({ mutateAsync: vi.fn() }),
}));

const embedding = encodeEmbedding([1, 0]);
vi.mock("@/features/bookmark/model/bookmark.service", () => ({
  bookmarkService: {
    getGuestEmbeddings: vi.fn(async () => ({ a: embedding })),
  },
}));

vi.mock("@/shared/api/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
const toastShow = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/toast", () => ({ toast: { show: toastShow } }));

vi.mock("@/entities/bookmark/ui/BookmarkCard", () => ({
  BookmarkCard: ({ bookmark }: { bookmark: Bookmark }) => (
    <div data-testid="semantic-card">{bookmark.title}</div>
  ),
}));
vi.mock("@/entities/bookmark/ui/BookmarkDetailPanel", () => ({ BookmarkDetailPanel: () => null }));
vi.mock("@/features/bookmark/ui/BookmarkList", () => ({ BookmarkList: () => null }));
vi.mock("@/features/bookmark/ui/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/features/collection/ui/AddToCollectionButton", () => ({
  AddToCollectionButton: () => null,
}));

import { BookmarksContent } from "./BookmarksContent";

const bookmark = {
  id: "a",
  url: "https://example.com/a",
  title: "리액트 글",
  summary: "",
  tags: ["react"],
  aiStatus: "completed",
  status: "unread",
  createdAt: "2026-10-14T00:00:00Z",
  updatedAt: "2026-10-14T00:00:00Z",
} as Bookmark;

const CLAIM =
  "비회원 의미 검색 요청이 실패(서버 오류 500, 분당 한도 429, 네트워크 오류)하면 안내 토스트가 뜨고 남은 횟수는 줄지 않는다";

describe(CLAIM, () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    bookmarksData.length = 0;
    bookmarksData.push(bookmark);
    currentParams = new URLSearchParams("q=zzzz");
    fetchMock.mockReset();
    toastShow.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookmarksContent isGuest />
      </QueryClientProvider>
    );

  const expectNoCharge = () => {
    const usage = JSON.parse(localStorage.getItem("guest_semantic_usage") ?? "{}");
    expect(usage.count ?? 0).toBe(0);
    expect(screen.getByText(/오늘 5회 남음/)).toBeInTheDocument();
  };

  it("서버 오류 500이면 토스트가 뜨고 남은 횟수는 줄지 않는다", async () => {
    fetchMock.mockResolvedValue({
      status: 500,
      json: async () => ({ success: false, error: { code: "INTERNAL" } }),
    });
    renderPage();

    await waitFor(() => expect(toastShow).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectNoCharge();
  });

  it("분당 한도 429이면 토스트가 뜨고 남은 횟수는 줄지 않는다", async () => {
    fetchMock.mockResolvedValue({
      status: 429,
      json: async () => ({ success: false, error: { code: "RATE_LIMITED" } }),
    });
    renderPage();

    await waitFor(() => expect(toastShow).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectNoCharge();
  });

  it("네트워크 오류이면 토스트가 뜨고 남은 횟수는 줄지 않는다", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderPage();

    await waitFor(() => expect(toastShow).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expectNoCharge();
  });
});
