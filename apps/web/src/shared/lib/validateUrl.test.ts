import { describe, it, expect } from "vitest";
import { validateUrl } from "./validateUrl";

describe("validateUrl", () => {
  describe("유효한 URL", () => {
    it("유효한 HTTPS URL이면 null 반환", () => {
      const result = validateUrl("https://example.com");
      expect(result).toBeNull();
    });

    it("유효한 HTTP URL이면 null 반환", () => {
      const result = validateUrl("http://example.com");
      expect(result).toBeNull();
    });

    it("경로가 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://example.com/path/to/page");
      expect(result).toBeNull();
    });

    it("쿼리 파라미터가 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://example.com?foo=bar&baz=qux");
      expect(result).toBeNull();
    });

    it("프래그먼트가 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://example.com#section");
      expect(result).toBeNull();
    });

    it("포트가 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://example.com:8080/path");
      expect(result).toBeNull();
    });

    it("localhost URL이면 null 반환", () => {
      const result = validateUrl("http://localhost:3000");
      expect(result).toBeNull();
    });

    it("IP 주소 URL이면 null 반환", () => {
      const result = validateUrl("http://192.168.1.1");
      expect(result).toBeNull();
    });

    it("인증 정보가 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://user:pass@example.com");
      expect(result).toBeNull();
    });

    it("서브도메인이 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://blog.example.com");
      expect(result).toBeNull();
    });

    it("쿼리에 특수문자가 있는 URL이면 null 반환", () => {
      const result = validateUrl("https://example.com/search?q=react%20testing");
      expect(result).toBeNull();
    });
  });

  describe("빈 입력", () => {
    it("빈 문자열이면 에러 메시지 반환", () => {
      const result = validateUrl("");
      expect(result).toBe("URL을 입력해주세요");
    });

    it("공백만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("   ");
      expect(result).toBe("URL을 입력해주세요");
    });

    it("탭 문자만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("\t");
      expect(result).toBe("URL을 입력해주세요");
    });

    it("줄바꿈만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("\n");
      expect(result).toBe("URL을 입력해주세요");
    });

    it("혼합 공백만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("  \t  \n  ");
      expect(result).toBe("URL을 입력해주세요");
    });
  });

  describe("잘못된 URL 형식", () => {
    it("평문이면 에러 메시지 반환", () => {
      const result = validateUrl("not a url");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("프로토콜 없는 도메인이면 에러 메시지 반환", () => {
      const result = validateUrl("example.com");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("잘못된 프로토콜이면 에러 메시지 반환", () => {
      const result = validateUrl("htp://example.com");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("프로토콜만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("https://");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("URL에 공백이 있으면 에러 메시지 반환", () => {
      const result = validateUrl("https://exam ple.com");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("특수문자만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("@#$%^&*()");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("숫자만 있으면 에러 메시지 반환", () => {
      const result = validateUrl("12345");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });
  });

  describe("기타 프로토콜", () => {
    it("FTP URL이면 null 반환", () => {
      const result = validateUrl("ftp://ftp.example.com");
      expect(result).toBeNull();
    });

    it("data URL이면 null 반환", () => {
      const result = validateUrl("data:text/html,<h1>Hello</h1>");
      expect(result).toBeNull();
    });

    it("file 프로토콜이면 null 반환", () => {
      const result = validateUrl("file:///home/user/file.txt");
      expect(result).toBeNull();
    });
  });

  describe("엣지 케이스", () => {
    it("URL 앞뒤 공백을 제거하고 검증", () => {
      const result = validateUrl("  https://example.com  ");
      expect(result).toBeNull();
    });

    it("경로에 유니코드 문자가 있으면 처리", () => {
      const result = validateUrl("https://example.com/한글");
      expect(result).toBeNull();
    });

    it("경로에 이모지가 있으면 처리", () => {
      const result = validateUrl("https://example.com/😀");
      expect(result).toBeNull();
    });

    it("상대 경로이면 에러 반환", () => {
      const result = validateUrl("/path/to/page");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("상대 URL 형식이면 에러 반환", () => {
      const result = validateUrl("../path/file.html");
      expect(result).toBe("올바른 URL 형식이 아닙니다");
    });

    it("매우 긴 URL 처리", () => {
      const longPath = "a".repeat(500);
      const result = validateUrl(`https://example.com/${longPath}`);
      expect(result).toBeNull();
    });

    it("인코딩된 사용자명이 있는 URL 처리", () => {
      const result = validateUrl("https://user%40example.com:pass@host.com");
      expect(result).toBeNull();
    });

    it("여러 쿼리 파라미터 처리", () => {
      const result = validateUrl(
        "https://example.com?key1=value1&key2=value2&key3=value3"
      );
      expect(result).toBeNull();
    });
  });

  describe("반환값 타입 검증", () => {
    it("유효한 URL이면 null 반환 (undefined나 false 아님)", () => {
      const result = validateUrl("https://example.com");
      expect(result).toBe(null);
      expect(result).not.toBeUndefined();
      expect(result).not.toBeFalsy();
    });

    it("잘못된 URL이면 문자열 반환", () => {
      const result = validateUrl("invalid");
      expect(typeof result).toBe("string");
      expect(result).toBeTruthy();
    });

    it("항상 null 또는 두 가지 에러 메시지 중 하나 반환", () => {
      const testCases = [
        "https://example.com",
        "http://localhost",
        "",
        "   ",
        "invalid",
        "not a url",
      ];

      testCases.forEach((url) => {
        const result = validateUrl(url);
        if (result === null) {
          expect(result).toBeNull();
        } else {
          expect(["URL을 입력해주세요", "올바른 URL 형식이 아닙니다"]).toContain(
            result
          );
        }
      });
    });
  });
});
