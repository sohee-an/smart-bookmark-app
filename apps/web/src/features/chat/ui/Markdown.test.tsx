import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown 경량 렌더러", () => {
  it("**볼드**를 strong으로 렌더한다", () => {
    render(<Markdown text="이건 **중요**해요" />);
    const strong = screen.getByText("중요");
    expect(strong.tagName).toBe("STRONG");
  });

  it("`코드`를 code로 렌더한다", () => {
    render(<Markdown text="`useState` 훅" />);
    expect(screen.getByText("useState").tagName).toBe("CODE");
  });

  it("- 항목들을 ul/li로 묶는다", () => {
    const { container } = render(<Markdown text={"- 하나\n- 둘"} />);
    expect(container.querySelectorAll("ul")).toHaveLength(1);
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("1. 항목들을 ol로 묶는다", () => {
    const { container } = render(<Markdown text={"1. 첫째\n2. 둘째"} />);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("[텍스트](url)를 새 탭 링크로 렌더한다", () => {
    render(<Markdown text="[구글](https://google.com) 참고" />);
    const link = screen.getByText("구글") as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://google.com");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("스트리밍 중 미완성 볼드(**닫히기 전)도 깨지지 않고 텍스트로 남는다", () => {
    const { container } = render(<Markdown text="답변 **중요" />);
    // strong 없이 원문 텍스트가 그대로 렌더 (throw 없이)
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toContain("**중요");
  });

  it("인용 표기 [1]은 그대로 텍스트로 둔다", () => {
    render(<Markdown text="Zustand가 좋아요[1]" />);
    expect(screen.getByText(/Zustand가 좋아요\[1\]/)).toBeInTheDocument();
  });
});
