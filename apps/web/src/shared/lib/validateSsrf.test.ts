import { beforeEach, describe, expect, it, vi } from "vitest";
import { SsrfError, validateSsrf } from "./validateSsrf";

vi.mock("dns/promises", () => ({
  lookup: vi.fn(),
}));

describe("validateSsrf", () => {
  let mockLookup: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dns = await import("dns/promises");
    mockLookup = dns.lookup as ReturnType<typeof vi.fn>;
  });

  describe("URL 파싱", () => {
    it("잘못된 URL 형식이면 SsrfError를 던진다", async () => {
      await expect(validateSsrf("not-a-url")).rejects.toThrow(SsrfError);
      await expect(validateSsrf("not-a-url")).rejects.toThrow("유효하지 않은 URL입니다.");
    });

    it("빈 문자열이면 SsrfError를 던진다", async () => {
      await expect(validateSsrf("")).rejects.toThrow("유효하지 않은 URL입니다.");
    });
  });

  describe("프로토콜 검증", () => {
    it("file:// 프로토콜은 SsrfError를 던진다", async () => {
      await expect(validateSsrf("file:///etc/passwd")).rejects.toThrow(
        "허용되지 않은 프로토콜입니다."
      );
    });

    it("gopher:// 프로토콜은 SsrfError를 던진다", async () => {
      await expect(validateSsrf("gopher://evil.com")).rejects.toThrow(
        "허용되지 않은 프로토콜입니다."
      );
    });

    it("ftp:// 프로토콜은 SsrfError를 던진다", async () => {
      await expect(validateSsrf("ftp://example.com")).rejects.toThrow(
        "허용되지 않은 프로토콜입니다."
      );
    });
  });

  describe("DNS 조회", () => {
    it("DNS 조회 실패 시 SsrfError를 던진다", async () => {
      mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
      await expect(validateSsrf("https://nonexistent.invalid")).rejects.toThrow(
        "URL을 확인할 수 없습니다."
      );
    });
  });

  describe("사설 IP 차단", () => {
    it("127.0.0.1 (loopback)은 SsrfError를 던진다", async () => {
      mockLookup.mockResolvedValue({ address: "127.0.0.1", family: 4 });
      await expect(validateSsrf("https://localhost")).rejects.toThrow("허용되지 않은 주소입니다.");
    });

    it("10.x.x.x 대역은 SsrfError를 던진다", async () => {
      mockLookup.mockResolvedValue({ address: "10.0.0.1", family: 4 });
      await expect(validateSsrf("https://internal.example.com")).rejects.toThrow(
        "허용되지 않은 주소입니다."
      );
    });

    it("172.16.x.x 대역은 SsrfError를 던진다", async () => {
      mockLookup.mockResolvedValue({ address: "172.16.0.1", family: 4 });
      await expect(validateSsrf("https://internal.example.com")).rejects.toThrow(
        "허용되지 않은 주소입니다."
      );
    });

    it("192.168.x.x 대역은 SsrfError를 던진다", async () => {
      mockLookup.mockResolvedValue({ address: "192.168.1.1", family: 4 });
      await expect(validateSsrf("https://internal.example.com")).rejects.toThrow(
        "허용되지 않은 주소입니다."
      );
    });

    it("169.254.169.254 (AWS 메타데이터 서버)는 SsrfError를 던진다", async () => {
      mockLookup.mockResolvedValue({ address: "169.254.169.254", family: 4 });
      await expect(validateSsrf("https://metadata.aws")).rejects.toThrow(
        "허용되지 않은 주소입니다."
      );
    });
  });

  describe("정상 케이스", () => {
    it("공개 IP로 resolve되는 https URL은 통과한다", async () => {
      mockLookup.mockResolvedValue({ address: "140.82.113.4", family: 4 });
      await expect(validateSsrf("https://github.com")).resolves.toBeUndefined();
    });

    it("공개 IP로 resolve되는 http URL은 통과한다", async () => {
      mockLookup.mockResolvedValue({ address: "93.184.216.34", family: 4 });
      await expect(validateSsrf("http://example.com")).resolves.toBeUndefined();
    });
  });
});
