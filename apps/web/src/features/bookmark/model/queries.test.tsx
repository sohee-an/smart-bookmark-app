import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Bookmark } from "@/entities/bookmark/model/types";

vi.mock("./bookmark.service", () => ({
  bookmarkService: {
    updateBookmark: vi.fn(),
    deleteBookmark: vi.fn(),
    getBookmarks: vi.fn(),
  },
}));

import { bookmarkService } from "./bookmark.service";
import { bookmarkKeys, useDeleteBookmark, useUpdateBookmark } from "./queries";

const mockService = bookmarkService as unknown as {
  updateBookmark: ReturnType<typeof vi.fn>;
  deleteBookmark: ReturnType<typeof vi.fn>;
};

function makeBookmark(id: string, over: Partial<Bookmark> = {}): Bookmark {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `title-${id}`,
    summary: "",
    tags: [],
    aiStatus: "completed",
    status: "unread",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  } as Bookmark;
}

function setup(initial: Bookmark[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(bookmarkKeys.list(), initial);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const cache = () => queryClient.getQueryData<Bookmark[]>(bookmarkKeys.list()) ?? [];
  return { queryClient, wrapper, cache };
}

/** 외부에서 resolve/reject를 제어할 수 있는 deferred promise */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUpdateBookmark — 낙관적 업데이트 & 롤백", () => {
  it("mutate 즉시 캐시에 반영하고(낙관적), 서버 실패 시 이전 상태로 롤백한다", async () => {
    const { wrapper, cache } = setup([makeBookmark("b1", { title: "원래 제목" })]);
    const d = deferred<void>();
    mockService.updateBookmark.mockReturnValue(d.promise);

    const { result } = renderHook(() => useUpdateBookmark(), { wrapper });
    result.current.mutate({ id: "b1", data: { title: "바뀐 제목" } });

    // 서버 응답 전에 화면(캐시)은 이미 바뀐 값 — 낙관적 업데이트
    await waitFor(() => expect(cache()[0].title).toBe("바뀐 제목"));

    // 서버가 실패하면 원래 값으로 롤백 (화면상 저장된 듯 보였지만 실제로는 아님)
    d.reject(new Error("DB 저장 실패"));
    await waitFor(() => expect(cache()[0].title).toBe("원래 제목"));
    expect(mockService.updateBookmark).toHaveBeenCalledWith("b1", { title: "바뀐 제목" });
  });

  it("서버 성공 시 낙관적 업데이트가 유지된다", async () => {
    const { wrapper, cache } = setup([makeBookmark("b1", { title: "원래 제목" })]);
    mockService.updateBookmark.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateBookmark(), { wrapper });
    result.current.mutate({ id: "b1", data: { title: "바뀐 제목" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cache()[0].title).toBe("바뀐 제목");
  });
});

describe("useDeleteBookmark — 낙관적 삭제 & 롤백", () => {
  it("mutate 즉시 목록에서 제거하고, 서버 실패 시 복원한다", async () => {
    const { wrapper, cache } = setup([makeBookmark("b1"), makeBookmark("b2")]);
    const d = deferred<void>();
    mockService.deleteBookmark.mockReturnValue(d.promise);

    const { result } = renderHook(() => useDeleteBookmark(), { wrapper });
    result.current.mutate("b1");

    await waitFor(() => expect(cache().map((b) => b.id)).toEqual(["b2"]));

    d.reject(new Error("삭제 실패"));
    await waitFor(() => expect(cache().map((b) => b.id)).toEqual(["b1", "b2"]));
  });

  it("서버 성공 시 삭제가 유지된다", async () => {
    const { wrapper, cache } = setup([makeBookmark("b1"), makeBookmark("b2")]);
    mockService.deleteBookmark.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteBookmark(), { wrapper });
    result.current.mutate("b1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cache().map((b) => b.id)).toEqual(["b2"]);
  });
});
