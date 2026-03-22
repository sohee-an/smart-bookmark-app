import { render, screen, fireEvent } from "@testing-library/react";
import { BookmarkList } from "./BookmarkList";
import type { Bookmark } from "@/entities/bookmark/model/types";

vi.mock("@/entities/bookmark/ui/BookmarkCard", () => ({
  BookmarkCard: ({ bookmark, onClick }: { bookmark: Bookmark; onClick: (b: Bookmark) => void }) => (
    <div data-testid="bookmark-card" onClick={() => onClick(bookmark)}>
      {bookmark.title}
    </div>
  ),
}));

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

describe("BookmarkList", () => {
  it("bookmarks 빈 배열 → empty state 텍스트 표시", () => {
    render(<BookmarkList bookmarks={[]} onBookmarkClick={vi.fn()} onTagClick={vi.fn()} />);
    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
  });

  it("bookmarks N개 → BookmarkCard N개 렌더링", () => {
    const bookmarks = [makeBookmark("1"), makeBookmark("2"), makeBookmark("3")];
    render(<BookmarkList bookmarks={bookmarks} onBookmarkClick={vi.fn()} onTagClick={vi.fn()} />);
    expect(screen.getAllByTestId("bookmark-card")).toHaveLength(3);
  });

  it("카드 클릭 → onBookmarkClick 호출", () => {
    const onBookmarkClick = vi.fn();
    const bookmark = makeBookmark("1");
    render(
      <BookmarkList bookmarks={[bookmark]} onBookmarkClick={onBookmarkClick} onTagClick={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("bookmark-card"));
    expect(onBookmarkClick).toHaveBeenCalledWith(bookmark);
  });
});
