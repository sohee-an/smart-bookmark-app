import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 회원 하루 20회 제한: feature_usage를 한국 자정(UTC 15:00) 이후로 센다고 가정하고 supabase를 가짜로 둔다
const state = vi.hoisted(() => ({
  user: { id: "u1" } as null | { id: string },
  usedAt: [] as string[], // feature_usage에 쌓인 사용 시각(ISO)
  inserts: [] as Array<Record<string, unknown>>,
  embedCalls: 0,
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async () => ({ data: [], error: null }),
    from: (table: string) => {
      if (table !== "feature_usage") {
        return { select: () => ({ in: async () => ({ data: [] }) }) };
      }
      let gte: string | null = null;
      const q: Record<string, unknown> = {};
      q.eq = () => q;
      q.gte = (_col: string, value: string) => {
        gte = value;
        return q;
      };
      // await 하면 gte 이후 행 수를 count로 돌려준다
      q.then = (resolve: (v: { count: number; error: null }) => void) =>
        resolve({
          count: state.usedAt.filter((t) => gte === null || t >= gte).length,
          error: null,
        });
      return {
        select: () => q,
        insert: async (row: Record<string, unknown>) => {
          state.inserts.push(row);
          return { error: null };
        },
      };
    },
  }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/shared/lib/guestCookie", () => ({ GUEST_COOKIE: "is_guest" }));
vi.mock("@/shared/lib/rateLimit", () => ({
  rateLimit: () => ({ ok: true }),
  getClientIp: () => "1.2.3.4",
}));
vi.mock("@google/generative-ai", () => ({
  TaskType: { RETRIEVAL_QUERY: "RETRIEVAL_QUERY" },
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        embedContent: async () => {
          state.embedCalls++;
          return { embedding: { values: [0.1, 0.2, 0.3] } };
        },
      };
    }
  },
}));

const { POST } = await import("./route");

const call = () =>
  POST(
    new Request("http://localhost/api/semantic-search", {
      method: "POST",
      body: JSON.stringify({ query: "리액트" }),
    })
  );

/** 한국 시간 같은 날 안에서 n번 쓴 기록 (UTC 2026-03-10 00:00 ~ 14:59 = KST 3/10) */
const usedTimes = (n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 2, 10, 0, i)).toISOString());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  state.user = { id: "u1" };
  state.usedAt = [];
  state.inserts = [];
  state.embedCalls = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("search.semantic.member.limit-20", () => {
  it("회원은 하루(한국 시간 자정 기준) 20번까지 AI 의미 검색을 쓴다", async () => {
    vi.setSystemTime(new Date("2026-03-10T10:00:00Z"));
    state.usedAt = usedTimes(19);
    const res = await call();
    expect(res.status).toBe(200);
    expect(state.embedCalls).toBe(1);
  });

  it("21번째 요청은 서버가 임베딩을 부르지 않고 429(code DAILY_LIMIT_EXCEEDED)로 막는다", async () => {
    vi.setSystemTime(new Date("2026-03-10T10:00:00Z"));
    state.usedAt = usedTimes(20);
    const res = await call();
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.code).toBe("DAILY_LIMIT_EXCEEDED");
    expect(state.embedCalls).toBe(0);
  });

  it("한국 자정 직전(UTC 14:59)에는 그날 20회를 이미 썼으면 막힌다", async () => {
    vi.setSystemTime(new Date("2026-03-10T14:59:30Z"));
    state.usedAt = usedTimes(20);
    const res = await call();
    expect(res.status).toBe(429);
    expect(state.embedCalls).toBe(0);
  });

  it("한국 자정이 지나면(UTC 15:00) 전날 20회 기록은 세지 않고 다시 쓸 수 있다", async () => {
    vi.setSystemTime(new Date("2026-03-10T15:00:30Z"));
    state.usedAt = usedTimes(20);
    const res = await call();
    expect(res.status).toBe(200);
    expect(state.embedCalls).toBe(1);
  });
});
