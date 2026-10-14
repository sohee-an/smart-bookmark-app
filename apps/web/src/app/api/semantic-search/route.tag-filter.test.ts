import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rpcArgs: null as null | Record<string, unknown>,
  rpcRows: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    rpc: async (_name: string, args: Record<string, unknown>) => {
      state.rpcArgs = args;
      return { data: state.rpcRows, error: null };
    },
    from: (table: string) => {
      if (table === "feature_usage") {
        const q: Record<string, unknown> = {};
        q.eq = () => q;
        q.gte = () => q;
        q.then = (resolve: (v: { count: number; error: null }) => void) =>
          resolve({ count: 0, error: null });
        return { select: () => q, insert: async () => ({ error: null }) };
      }
      return { select: () => ({ in: async () => ({ data: [] }) }) };
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
      return { embedContent: async () => ({ embedding: { values: [0.1, 0.2, 0.3] } }) };
    }
  },
}));

const { POST } = await import("./route");

const call = (body: unknown) =>
  POST(
    new Request("http://localhost/api/semantic-search", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  state.rpcArgs = null;
  state.rpcRows = [];
});

describe("search.semantic.tag-filter (서버)", () => {
  it("태그 필터를 켠 채 의미 검색하면 회원은 서버가 선택한 태그를 검색 조건(p_tags)으로 넘긴다", async () => {
    const res = await call({ query: "리액트", tags: ["react", "css"] });
    expect(res.status).toBe(200);
    expect(state.rpcArgs?.p_tags).toEqual(["react", "css"]);
  });

  it("태그를 고르지 않으면 태그 조건 없이(null) 검색한다", async () => {
    await call({ query: "리액트", tags: [] });
    expect(state.rpcArgs?.p_tags).toBeNull();
  });
});
