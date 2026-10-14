import { beforeEach, describe, expect, it, vi } from "vitest";

// 외부 의존(Supabase 세션, 쿠키, Gemini, rate limit)을 가짜로 두고 라우트의 분기만 본다
const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  guestCookie: false,
  rateOk: true,
  rpcRows: [] as Array<Record<string, unknown>>,
  embedCalls: 0,
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async () => ({ data: state.rpcRows, error: null }),
    from: () => ({ select: () => ({ in: async () => ({ data: [] }) }) }),
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      state.guestCookie && name === "is_guest" ? { value: "true" } : undefined,
  }),
}));
vi.mock("@/shared/lib/guestCookie", () => ({ GUEST_COOKIE: "is_guest" }));
vi.mock("@/shared/lib/rateLimit", () => ({
  rateLimit: () => (state.rateOk ? { ok: true } : { ok: false, retryAfterMs: 30_000 }),
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

const call = (body: unknown) =>
  POST(
    new Request("http://localhost/api/semantic-search", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

beforeEach(() => {
  state.user = null;
  state.guestCookie = false;
  state.rateOk = true;
  state.rpcRows = [];
  state.embedCalls = 0;
});

describe("POST /api/semantic-search", () => {
  it("로그인도 비회원 쿠키도 없으면 401이고 임베딩을 부르지 않는다", async () => {
    const res = await call({ query: "리액트" });
    expect(res.status).toBe(401);
    expect(state.embedCalls).toBe(0);
  });

  it("검색어가 비었거나 공백뿐이면 임베딩 호출 없이 400", async () => {
    state.guestCookie = true;
    for (const query of ["", "   ", undefined]) {
      const res = await call({ query });
      expect(res.status).toBe(400);
    }
    expect(state.embedCalls).toBe(0);
  });

  it("검색어가 200자를 넘으면 400", async () => {
    state.guestCookie = true;
    const res = await call({ query: "가".repeat(201) });
    expect(res.status).toBe(400);
    expect(state.embedCalls).toBe(0);
  });

  it("비회원은 검색어 임베딩만 받는다 (북마크는 브라우저에서 비교)", async () => {
    state.guestCookie = true;
    const res = await call({ query: "리액트 상태관리" });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual({ mode: "guest", queryEmbedding: [0.1, 0.2, 0.3] });
  });

  it("비회원이 분당 한도를 넘으면 429이고 임베딩을 부르지 않는다", async () => {
    state.guestCookie = true;
    state.rateOk = false;
    const res = await call({ query: "리액트" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(state.embedCalls).toBe(0);
  });

  it("회원은 0.8 기준으로 정확한 결과와 연관된 결과로 나뉜다", async () => {
    state.user = { id: "u1" };
    const row = (id: string, similarity: number) => ({
      id,
      url: `https://${id}.com`,
      title: id,
      summary: "",
      thumbnail_url: null,
      ai_status: "completed",
      status: "unread",
      created_at: "",
      updated_at: "",
      similarity,
    });
    state.rpcRows = [row("a", 0.9), row("b", 0.8), row("c", 0.79)];
    const json = await (await call({ query: "리액트" })).json();
    expect(json.data.exact.map((r: { id: string }) => r.id)).toEqual(["a", "b"]);
    expect(json.data.related.map((r: { id: string }) => r.id)).toEqual(["c"]);
  });
});
