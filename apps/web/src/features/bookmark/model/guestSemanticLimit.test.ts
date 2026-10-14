import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_SEMANTIC_DAILY_LIMIT,
  getGuestSemanticRemaining,
  recordGuestSemantic,
} from "./guestSemanticLimit";

describe("비회원 AI 의미 검색 하루 제한", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T09:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it(`하루 ${GUEST_SEMANTIC_DAILY_LIMIT}회까지 쓰고 그 뒤로는 0이다`, () => {
    expect(getGuestSemanticRemaining()).toBe(GUEST_SEMANTIC_DAILY_LIMIT);
    for (let i = 0; i < GUEST_SEMANTIC_DAILY_LIMIT + 2; i++) recordGuestSemantic();
    expect(getGuestSemanticRemaining()).toBe(0);
  });

  it("날짜가 바뀌면 다시 채워진다", () => {
    recordGuestSemantic();
    recordGuestSemantic();
    expect(getGuestSemanticRemaining()).toBe(GUEST_SEMANTIC_DAILY_LIMIT - 2);

    vi.setSystemTime(new Date("2026-10-15T09:00:00.000Z"));
    expect(getGuestSemanticRemaining()).toBe(GUEST_SEMANTIC_DAILY_LIMIT);
  });
});

describe("비회원 AI 의미 검색 한도는 한국 시간 자정에 5회로 다시 채워진다 (한국 시간 오전 9시가 아니다)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("한국 자정 직전(UTC 14:59:59)에는 아직 채워지지 않는다", () => {
    vi.setSystemTime(new Date("2026-10-14T10:00:00.000Z")); // KST 19:00
    for (let i = 0; i < GUEST_SEMANTIC_DAILY_LIMIT; i++) recordGuestSemantic();
    expect(getGuestSemanticRemaining()).toBe(0);

    vi.setSystemTime(new Date("2026-10-14T14:59:59.000Z")); // KST 23:59:59
    expect(getGuestSemanticRemaining()).toBe(0);
  });

  it("한국 자정(UTC 15:00)이 되면 5회로 다시 채워진다", () => {
    vi.setSystemTime(new Date("2026-10-14T10:00:00.000Z"));
    for (let i = 0; i < GUEST_SEMANTIC_DAILY_LIMIT; i++) recordGuestSemantic();
    expect(getGuestSemanticRemaining()).toBe(0);

    vi.setSystemTime(new Date("2026-10-14T15:00:00.000Z")); // KST 00:00
    expect(getGuestSemanticRemaining()).toBe(GUEST_SEMANTIC_DAILY_LIMIT);
  });

  it("한국 오전 9시(UTC 자정)에는 채워지지 않는다", () => {
    vi.setSystemTime(new Date("2026-10-14T14:00:00.000Z")); // KST 23:00
    for (let i = 0; i < GUEST_SEMANTIC_DAILY_LIMIT; i++) recordGuestSemantic();

    vi.setSystemTime(new Date("2026-10-14T23:59:00.000Z")); // KST 08:59 (다음 날)
    expect(getGuestSemanticRemaining()).toBe(GUEST_SEMANTIC_DAILY_LIMIT);

    // 반대로: KST 같은 날 안에서 UTC 날짜만 바뀌는 시각(KST 09:00)은 리셋 시각이 아니다
    localStorage.clear();
    vi.setSystemTime(new Date("2026-10-14T23:00:00.000Z")); // KST 10-15 08:00
    for (let i = 0; i < GUEST_SEMANTIC_DAILY_LIMIT; i++) recordGuestSemantic();
    vi.setSystemTime(new Date("2026-10-15T00:00:00.000Z")); // KST 10-15 09:00
    expect(getGuestSemanticRemaining()).toBe(0);
  });
});
