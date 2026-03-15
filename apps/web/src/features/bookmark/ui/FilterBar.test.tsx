import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "./FilterBar";

const defaultProps = {
  selectedTags: [],
  onTagClick: vi.fn(),
  onTagRemove: vi.fn(),
  allTags: ["React", "Next.js", "TypeScript"],
  recentTags: ["React"],
};

describe("FilterBar", () => {
  it("초기: 드롭다운 없음", () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.queryByText("최근 북마크 태그")).not.toBeInTheDocument();
  });

  it("필터 버튼 클릭 → 드롭다운 표시", () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /필터/ }));
    expect(screen.getByText("최근 북마크 태그")).toBeInTheDocument();
  });

  it("태그 클릭 → onTagClick(tag) 호출", () => {
    const onTagClick = vi.fn();
    render(<FilterBar {...defaultProps} onTagClick={onTagClick} />);
    fireEvent.click(screen.getByRole("button", { name: /필터/ }));
    // recentTags에 React가 있으므로 첫 번째 #React 버튼 클릭
    const tagButtons = screen.getAllByRole("button", { name: /#React/ });
    fireEvent.click(tagButtons[0]);
    expect(onTagClick).toHaveBeenCalledWith("React");
  });

  it("selectedTags 있으면 버튼에 숫자 뱃지 표시", () => {
    render(<FilterBar {...defaultProps} selectedTags={["React", "Next.js"]} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("외부 클릭 → 드롭다운 닫힘", () => {
    render(<FilterBar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /필터/ }));
    expect(screen.getByText("최근 북마크 태그")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("최근 북마크 태그")).not.toBeInTheDocument();
  });
});
