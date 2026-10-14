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

// 세 북마크 모두 검색어와 똑같이 가까운 임베딩을 가진다 (태그만이 결과를 가르게 한다)
const embedding = encodeEmbedding([1, 0]);
vi.mock("@/features/bookmark/model/bookmark.service", () => ({
  bookmarkService: {
    getGuestEmbeddings: vi.fn(async () => ({ a: embedding, b: embedding, c: embedding })),
  },
}));

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string } } }));
vi.mock("@/shared/api/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: session.current } })) },
  },
}));
vi.mock("@/shared/lib/toast", () => ({ toast: { show: vi.fn() } }));

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

const make = (id: string, title: string, tags: string[]): Bookmark =>
  ({
    id,
    url: `https://example.com/${id}`,
    title,
    summary: "",
    tags,
    aiStatus: "completed",
    status: "unread",
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
  }) as Bookmark;

function renderPage(isGuest: boolean) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <BookmarksContent isGuest={isGuest} />
    </QueryClientProvider>
  );
}

describe("search.semantic.tag-filter (화면)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    session.current = null;
    bookmarksData.length = 0;
    bookmarksData.push(
      make("a", "리액트 글", ["react"]),
      make("b", "스타일 글", ["css"]),
      make("c", "파이썬 글", ["python"])
    );
    currentParams = new URLSearchParams("q=zzzz&tag=react&tag=css");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("태그 필터를 켠 채 의미 검색하면 선택한 태그 중 하나라도 가진 북마크만 결과에 나온다 (비회원)", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { mode: "guest", queryEmbedding: [1, 0] } }),
    });
    renderPage(true);

    await waitFor(() => expect(screen.getAllByTestId("semantic-card").length).toBeGreaterThan(0));
    const titles = screen.getAllByTestId("semantic-card").map((c) => c.textContent);
    expect(titles.sort()).toEqual(["리액트 글", "스타일 글"]);
  });

  it("태그 필터를 켠 채 의미 검색하면 회원은 서버에 선택한 태그를 검색 조건으로 넘긴다", async () => {
    session.current = { user: { id: "u1" } };
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { exact: [], related: [] } }),
    });
    renderPage(false);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toBe("zzzz");
    expect(body.tags).toEqual(["react", "css"]);
  });
});
