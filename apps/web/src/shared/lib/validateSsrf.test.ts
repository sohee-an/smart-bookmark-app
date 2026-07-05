import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPrivateAddress, SsrfError, validateSsrf } from "./validateSsrf";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

describe("validateSsrf", () => {
  let mockLookup: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dns = await import("node:dns/promises");
    mockLookup = dns.lookup as unknown as ReturnType<typeof vi.fn>;
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
    it.each(["file:///etc/passwd", "gopher://evil.com", "ftp://example.com"])(
      "%s 는 SsrfError를 던진다",
      async (url) => {
        await expect(validateSsrf(url)).rejects.toThrow("허용되지 않은 프로토콜입니다.");
      }
    );
  });

  describe("DNS 조회", () => {
    it("DNS 조회 실패 시 SsrfError를 던진다", async () => {
      mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
      await expect(validateSsrf("https://nonexistent.invalid")).rejects.toThrow(
        "URL을 확인할 수 없습니다."
      );
    });
  });

  describe("사설 IPv4 차단 (도메인 → DNS)", () => {
    it.each([
      ["127.0.0.1", "loopback"],
      ["10.0.0.1", "사설망"],
      ["172.16.0.1", "사설망"],
      ["192.168.1.1", "사설망"],
      ["169.254.169.254", "클라우드 메타데이터"],
      ["0.0.0.0", "unspecified"],
      ["100.64.0.1", "CGNAT"],
    ])("%s (%s)로 resolve되면 차단한다", async (address) => {
      mockLookup.mockResolvedValue([{ address, family: 4 }]);
      await expect(validateSsrf("https://internal.example.com")).rejects.toThrow(
        "허용되지 않은 주소입니다."
      );
    });

    it("resolve된 여러 주소 중 하나라도 사설이면 차단한다", async () => {
      mockLookup.mockResolvedValue([
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]);
      await expect(validateSsrf("https://rebind.example.com")).rejects.toThrow(
        "허용되지 않은 주소입니다."
      );
    });
  });

  describe("사설 IPv6 / IPv4-mapped 차단 (IP 리터럴, DNS 없음)", () => {
    it.each([
      "http://[::1]/", // loopback
      "http://[::ffff:169.254.169.254]/", // IPv4-mapped 메타데이터
      "http://[::ffff:127.0.0.1]/", // IPv4-mapped loopback
      "http://[fe80::1]/", // link-local
      "http://[fc00::1]/", // unique local
      "http://[fd12:3456::1]/", // unique local
    ])("%s 는 차단한다", async (url) => {
      await expect(validateSsrf(url)).rejects.toThrow("허용되지 않은 주소입니다.");
      expect(mockLookup).not.toHaveBeenCalled();
    });
  });

  describe("IP 리터럴 정상 케이스", () => {
    it("공개 IPv4 리터럴은 DNS 없이 통과한다", async () => {
      await expect(validateSsrf("https://93.184.216.34/")).resolves.toBeUndefined();
      expect(mockLookup).not.toHaveBeenCalled();
    });
  });

  describe("도메인 정상 케이스", () => {
    it("공개 IP로 resolve되는 https URL은 통과한다", async () => {
      mockLookup.mockResolvedValue([{ address: "140.82.113.4", family: 4 }]);
      await expect(validateSsrf("https://github.com")).resolves.toBeUndefined();
    });

    it("공개 IP로 resolve되는 http URL은 통과한다", async () => {
      mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
      await expect(validateSsrf("http://example.com")).resolves.toBeUndefined();
    });
  });

  describe("isPrivateAddress 단위", () => {
    it("공개 주소는 false, 사설/비정상은 true", () => {
      expect(isPrivateAddress("8.8.8.8")).toBe(false);
      expect(isPrivateAddress("140.82.113.4")).toBe(false);
      expect(isPrivateAddress("10.1.2.3")).toBe(true);
      expect(isPrivateAddress("::1")).toBe(true);
      expect(isPrivateAddress("::ffff:10.0.0.1")).toBe(true);
      expect(isPrivateAddress("not-an-ip")).toBe(true); // 파싱 불가 → 보수적 차단
    });
  });
});
