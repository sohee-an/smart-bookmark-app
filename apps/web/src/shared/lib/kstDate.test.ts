import { describe, expect, it } from "vitest";
import { kstDate, kstDayStart } from "./kstDate";

describe("kstDate", () => {
  it("UTC 14:59는 한국 시간으로 같은 날 23:59다", () => {
    expect(kstDate(new Date("2026-10-14T14:59:59Z"))).toBe("2026-10-14");
  });

  it("UTC 15:00은 한국 시간으로 다음 날 0시다", () => {
    expect(kstDate(new Date("2026-10-14T15:00:00Z"))).toBe("2026-10-15");
  });

  it("한국 오전 9시(UTC 0시)에는 날짜가 바뀌지 않는다", () => {
    expect(kstDate(new Date("2026-10-14T23:59:00Z"))).toBe("2026-10-15");
    expect(kstDate(new Date("2026-10-15T00:00:00Z"))).toBe("2026-10-15");
  });
});

describe("kstDayStart", () => {
  it("한국 시간 오늘 0시를 UTC로 돌려준다 (전날 15:00 UTC)", () => {
    expect(kstDayStart(new Date("2026-10-14T10:00:00Z")).toISOString()).toBe(
      "2026-10-13T15:00:00.000Z"
    );
  });
});
