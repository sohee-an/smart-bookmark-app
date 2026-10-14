import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bookmark } from "@/entities/bookmark/model/types";

let currentParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => currentParams,
}));

vi.mock("@/features/bookmark/model/queries", () => ({
  useBookmarks: () => ({ data: [], isError: false, refetch: vi.fn() }),
  useUpdateBookmark: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteBookmark: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/features/bookmark/model/bookmark.service", () => ({
  bookmarkService: { getGuestEmbeddings: vi.fn(async () => ({})) },
}));
vi.mock("@/shared/api/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "u1" } } } })) },
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

const result = (title: string) =>
  ({
    id: title,
    url: `https://example.com/${title}`,
    title,
    summary: "",
    userId: "u1",
    tags: [],
    aiStatus: "completed",
    status: "unread",
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
    similarity: 0.9,
  }) as Bookmark & { similarity: number };

const ok = (title: string) => ({
  status: 200,
  json: async () => ({ success: true, data: { exact: [result(title)], related: [] } }),
});

const CLAIM =
  "검색어를 빠르게 바꾸면 이전 검색어의 의미 검색 결과가 아니라 마지막 검색어의 결과만 화면에 남는다";

describe(CLAIM, () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    currentParams = new URLSearchParams("q=first");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const tree = () => (
    <QueryClientProvider client={new QueryClient()}>
      <BookmarksContent isGuest={false} />
    </QueryClientProvider>
  );

  it("이전 검색어 응답이 마지막 검색어 응답보다 늦게 도착해도 마지막 검색어의 결과만 남는다", async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    fetchMock.mockImplementation((_url: string, init: { body: string }) => {
      const { query } = JSON.parse(init.body);
      if (query === "first") {
        // 느린 응답. 취소 신호와 무관하게 나중에 도착하는 경우(이미 응답 헤더를 받은 뒤 등)
        return new Promise((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(ok("B-second"));
    });

    const { rerender } = render(tree());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    currentParams = new URLSearchParams("q=second");
    rerender(tree());
    await waitFor(() =>
      expect(screen.getAllByTestId("semantic-card").map((c) => c.textContent)).toEqual(["B-second"])
    );

    await act(async () => {
      resolveFirst(ok("A-first"));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(screen.getAllByTestId("semantic-card").map((c) => c.textContent)).toEqual(["B-second"]);
  });

  it("이전 검색어 요청이 취소(abort)되면 그 결과는 화면에 나타나지 않는다", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { body: string; signal: AbortSignal }) =>
        new Promise((resolve, reject) => {
          const { query } = JSON.parse(init.body);
          if (query === "first") {
            init.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError"))
            );
            return;
          }
          resolve(ok("B-second"));
        })
    );

    const { rerender } = render(tree());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    currentParams = new URLSearchParams("q=second");
    rerender(tree());

    await waitFor(() =>
      expect(screen.getAllByTestId("semantic-card").map((c) => c.textContent)).toEqual(["B-second"])
    );
    expect(screen.queryByText("A-first")).not.toBeInTheDocument();
  });
});
