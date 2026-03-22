import { describe, it, expect } from "vitest";

// TagGroup의 hiddenCount 계산 로직
function calcHiddenCount(tagsLength: number, maxVisible?: number): number {
  return maxVisible ? Math.max(0, tagsLength - maxVisible) : 0;
}

describe("TagGroup hiddenCount (+N 뱃지)", () => {
  it("maxVisible 없으면 hiddenCount는 0", () => {
    expect(calcHiddenCount(5)).toBe(0);
  });

  it("태그 수가 maxVisible 이하면 0", () => {
    expect(calcHiddenCount(2, 2)).toBe(0);
    expect(calcHiddenCount(1, 2)).toBe(0);
  });

  it("태그 수가 maxVisible 초과하면 차이만큼 반환", () => {
    expect(calcHiddenCount(5, 2)).toBe(3);
    expect(calcHiddenCount(3, 2)).toBe(1);
  });

  it("태그가 없으면 0", () => {
    expect(calcHiddenCount(0, 2)).toBe(0);
  });
});
