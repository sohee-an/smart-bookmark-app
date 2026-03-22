import { render, screen, fireEvent } from "@testing-library/react";
import { BookmarkCard } from "./BookmarkCard";
import type { Bookmark } from "../model/types";

const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: "1",
  url: "https://example.com/article",
  title: "Test Article",
  summary: "This is a summary",
  aiStatus: "completed",
  status: "unread",
  tags: ["React", "Next.js", "TypeScript"],
  userId: "user1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("BookmarkCard", () => {
  it("aiStatus='crawling' → 크롤링 중 텍스트, 클릭 불가", () => {
    const onClick = vi.fn();
    render(<BookmarkCard bookmark={makeBookmark({ aiStatus: "crawling" })} onClick={onClick} />);
    expect(screen.getByText("크롤링 중...")).toBeInTheDocument();
    // isPending일 때 onClick 호출 안 됨
    fireEvent.click(screen.getByText("크롤링 중..."));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("aiStatus='processing' → AI 분석 중 오버레이", () => {
    render(<BookmarkCard bookmark={makeBookmark({ aiStatus: "processing" })} />);
    expect(screen.getByText("AI 분석 중...")).toBeInTheDocument();
  });

  it("aiStatus='failed' → 에러 메시지", () => {
    render(<BookmarkCard bookmark={makeBookmark({ aiStatus: "failed" })} />);
    expect(screen.getByText("AI 요약에 실패했습니다.")).toBeInTheDocument();
  });

  it("aiStatus='completed' → 제목, 요약, 태그 렌더링", () => {
    render(<BookmarkCard bookmark={makeBookmark({ aiStatus: "completed" })} />);
    expect(screen.getByText("Test Article")).toBeInTheDocument();
    expect(screen.getByText("This is a summary")).toBeInTheDocument();
    expect(screen.getByText("#React")).toBeInTheDocument();
  });

  it("태그 클릭 → onTagClick 호출 (카드 클릭 이벤트 버블링 없음)", () => {
    const onClick = vi.fn();
    const onTagClick = vi.fn();
    render(
      <BookmarkCard
        bookmark={makeBookmark({ aiStatus: "completed" })}
        onClick={onClick}
        onTagClick={onTagClick}
      />
    );
    fireEvent.click(screen.getByText("#React"));
    expect(onTagClick).toHaveBeenCalledWith("React");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("+N 클릭 → onMoreClick(=카드 클릭) 호출", () => {
    const onClick = vi.fn();
    const bookmark = makeBookmark({ aiStatus: "completed" });
    render(<BookmarkCard bookmark={bookmark} onClick={onClick} />);
    // tags 3개, maxVisible=2 → +1 뱃지
    fireEvent.click(screen.getByText("+1"));
    expect(onClick).toHaveBeenCalledWith(bookmark);
  });
});
