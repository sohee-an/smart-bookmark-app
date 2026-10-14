import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/shared/api/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));
vi.mock("@/shared/lib/guest", () => ({ default: () => "guest-fixed" }));

import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkPipeline } from "@/features/bookmark/model/useBookmarkPipeline";
import { decodeEmbedding } from "@/features/bookmark/lib/semantic";

const VECTOR = [0.25, -0.5, 1];

function mockApis() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = (data: unknown) => ({ json: async () => ({ success: true, data }) }) as Response;
    if (url.endsWith("/api/crawl")) {
      return body({ title: "원제목", thumbnailUrl: null, description: "d", bodyChunks: [] });
    }
    if (url.endsWith("/api/ai-analyze")) {
      return body({ title: "AI 제목", summary: "AI 요약", tags: ["a"] });
    }
    if (url.endsWith("/api/embed")) {
      return body({ embedding: VECTOR });
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBookmarkPipeline(), { wrapper });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", mockApis());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("비회원이 저장한 북마크는 AI 처리가 끝나면 임베딩이 브라우저에 남고, 그 북마크를 지우면 임베딩도 같이 지워진다", () => {
  it("비회원이 저장한 북마크는 AI 처리가 끝나면 임베딩이 브라우저에 남는다", async () => {
    const saved = await bookmarkService.addBookmark("https://a.com");
    const { result } = setup();

    await result.current.runPipeline(saved.id, "https://a.com");

    await waitFor(async () => {
      const embeddings = await bookmarkService.getGuestEmbeddings();
      expect(Object.keys(embeddings)).toEqual([saved.id]);
    });
    const stored = (await bookmarkService.getGuestEmbeddings())[saved.id];
    expect(Array.from(decodeEmbedding(stored))).toEqual(VECTOR);
    expect((await bookmarkService.getBookmarkById(saved.id))?.aiStatus).toBe("completed");
  });

  it("그 북마크를 지우면 임베딩도 같이 지워지고 다른 북마크의 임베딩은 남는다", async () => {
    const a = await bookmarkService.addBookmark("https://a.com");
    const b = await bookmarkService.addBookmark("https://b.com");
    const { result } = setup();
    await result.current.runPipeline(a.id, "https://a.com");
    await result.current.runPipeline(b.id, "https://b.com");
    await waitFor(async () => {
      expect(Object.keys(await bookmarkService.getGuestEmbeddings()).sort()).toEqual(
        [a.id, b.id].sort()
      );
    });

    await bookmarkService.deleteBookmark(a.id);

    expect(Object.keys(await bookmarkService.getGuestEmbeddings())).toEqual([b.id]);
  });
});
