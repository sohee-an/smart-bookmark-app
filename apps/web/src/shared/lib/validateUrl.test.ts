import { describe, it, expect } from "vitest";
import { validateUrl } from "./validateUrl";

describe("validateUrl", () => {
  it('빈 문자열이면 "URL을 입력해주세요" 반환', () => {
    expect(validateUrl("")).toBe("URL을 입력해주세요");
    expect(validateUrl("   ")).toBe("URL을 입력해주세요");
  });

  it('형식이 잘못된 URL이면 "올바른 URL 형식이 아닙니다" 반환', () => {
    expect(validateUrl("abc")).toBe("올바른 URL 형식이 아닙니다");
    expect(validateUrl("hello world")).toBe("올바른 URL 형식이 아닙니다");
  });

  it("유효한 URL이면 null 반환", () => {
    expect(validateUrl("https://example.com")).toBeNull();
    expect(validateUrl("http://localhost:3000")).toBeNull();
  });
});
