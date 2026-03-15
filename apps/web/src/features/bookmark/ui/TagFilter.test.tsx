import { render, screen, fireEvent } from "@testing-library/react";
import { TagFilter } from "./TagFilter";

describe("TagFilter", () => {
  it("tags가 비어있으면 null 반환", () => {
    const { container } = render(<TagFilter tags={[]} onRemove={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("태그 뱃지가 개수만큼 렌더링됨", () => {
    render(<TagFilter tags={["React", "Next.js"]} onRemove={vi.fn()} />);
    expect(screen.getByText("#React")).toBeInTheDocument();
    expect(screen.getByText("#Next.js")).toBeInTheDocument();
  });

  it("X 버튼 클릭 → onRemove(tag) 호출", () => {
    const onRemove = vi.fn();
    render(<TagFilter tags={["React"]} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "React 태그 제거" }));
    expect(onRemove).toHaveBeenCalledWith("React");
  });
});
