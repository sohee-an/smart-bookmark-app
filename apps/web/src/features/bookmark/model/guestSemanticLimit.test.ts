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
