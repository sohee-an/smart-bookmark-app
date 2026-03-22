import { renderHook, act } from "@testing-library/react";
import { useBookmarkStore } from "./useBookmarkStore";
import type { Bookmark } from "./types";

const makeBookmark = (id: string): Bookmark => ({
  id,
  url: "https://example.com",
  title: `Bookmark ${id}`,
  aiStatus: "completed",
  status: "unread",
  tags: [],
  userId: "user1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

beforeEach(() => {
  useBookmarkStore.setState({ bookmarks: [], selectedBookmarkId: null });
});

describe("useBookmarkStore", () => {
  it("setBookmarks → bookmarks 배열 교체", () => {
    const { result } = renderHook(() => useBookmarkStore());
    const bookmarks = [makeBookmark("1"), makeBookmark("2")];

    act(() => {
      result.current.setBookmarks(bookmarks);
    });

    expect(result.current.bookmarks).toEqual(bookmarks);
  });

  it("addBookmark → 배열 앞에 추가", () => {
    const { result } = renderHook(() => useBookmarkStore());
    const b1 = makeBookmark("1");
    const b2 = makeBookmark("2");

    act(() => {
      result.current.addBookmark(b1);
    });
    act(() => {
      result.current.addBookmark(b2);
    });

    expect(result.current.bookmarks[0]).toEqual(b2);
    expect(result.current.bookmarks[1]).toEqual(b1);
  });

  it("updateBookmark → id 일치 항목 부분 업데이트", () => {
    const { result } = renderHook(() => useBookmarkStore());
    const bookmark = makeBookmark("1");

    act(() => {
      result.current.setBookmarks([bookmark]);
    });
    act(() => {
      result.current.updateBookmark("1", { title: "Updated" });
    });

    expect(result.current.bookmarks[0].title).toBe("Updated");
    expect(result.current.bookmarks[0].url).toBe("https://example.com");
  });

  it("setSelectedBookmarkId → id 설정", () => {
    const { result } = renderHook(() => useBookmarkStore());

    act(() => {
      result.current.setSelectedBookmarkId("bookmark-42");
    });

    expect(result.current.selectedBookmarkId).toBe("bookmark-42");
  });

  it("setSelectedBookmarkId → null 설정", () => {
    const { result } = renderHook(() => useBookmarkStore());

    act(() => {
      result.current.setSelectedBookmarkId("abc");
    });
    act(() => {
      result.current.setSelectedBookmarkId(null);
    });

    expect(result.current.selectedBookmarkId).toBeNull();
  });
});
