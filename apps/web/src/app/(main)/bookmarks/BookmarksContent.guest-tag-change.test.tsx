import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { encodeEmbedding } from "@/features/bookmark/lib/semantic";

// 검색 주소(태그, 검색어)를 테스트가 바꿀 수 있게 한다. 같은 주소면 같은 객체를 돌려줘야 effect가 안 돈다.
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
    getGuestEmbeddings: vi.fn(async () => ({ a: embedding, b: embedding })),
  },
}));

vi.mock("@/shared/api/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@/shared/lib/toast", () => ({ toast: { show: vi.fn() } }));

// 화면 조각은 제목만 그린다 (이 테스트는 결과 걸러짐과 서버 호출만 본다)
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

function renderPage() {
  const client = new QueryClient();
  // 다시 그릴 때마다 새 요소를 만든다. 같은 요소 객체를 넘기면 React가 다시 그리기를 건너뛰어 바뀐 주소를 읽지 않는다
  const ui = () => (
    <QueryClientProvider client={client}>
      <BookmarksContent isGuest />
    </QueryClientProvider>
  );
  const utils = render(ui());
  return { ...utils, rerenderPage: () => utils.rerender(ui()) };
}

describe("비회원 의미 검색 태그 변경", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    bookmarksData.length = 0;
    bookmarksData.push(make("a", "리액트 글", ["react"]), make("b", "스타일 글", ["css"]));
    currentParams = new URLSearchParams("q=zzzz");
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { mode: "guest", queryEmbedding: [1, 0] } }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("비회원이 검색어는 그대로 두고 태그 필터만 바꾸면 의미 검색 서버를 다시 부르지 않고 남은 횟수도 줄지 않으며, 결과는 바뀐 태그에 맞게 다시 걸러진다", async () => {
    const { rerenderPage } = renderPage();

    // 처음 검색: 서버 1번, 횟수 1회 차감, 결과 두 개
    await waitFor(() => expect(screen.getAllByTestId("semantic-card")).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/오늘 4회 남음/)).toBeInTheDocument();

    // 검색어 그대로, 태그만 css로 변경
    currentParams = new URLSearchParams("q=zzzz&tag=css");
    rerenderPage();

    // 결과는 css 태그에 맞게 다시 걸러진다
    await waitFor(() => {
      const cards = screen.getAllByTestId("semantic-card");
      expect(cards.map((c) => c.textContent)).toEqual(["스타일 글"]);
    });

    // 서버를 다시 부르지 않았고 남은 횟수도 그대로
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("guest_semantic_usage") ?? "{}").count).toBe(1);
    expect(screen.getByText(/오늘 4회 남음/)).toBeInTheDocument();
  });
});
