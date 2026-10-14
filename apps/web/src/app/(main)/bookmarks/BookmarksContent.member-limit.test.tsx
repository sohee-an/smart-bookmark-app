import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/shared/lib/toast";

// 회원 하루 20회 제한의 화면 쪽: 서버가 429(DAILY_LIMIT_EXCEEDED)로 막으면 안내가 뜬다
// 실제 Next.js처럼 같은 주소 객체를 돌려준다 (매번 새로 만들면 검색 effect가 끝없이 다시 돈다)
const params = new URLSearchParams("q=리액트");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => params,
}));
vi.mock("@/features/bookmark/model/queries", () => ({
  useBookmarks: () => ({ data: [], isError: false, refetch: vi.fn() }),
  useUpdateBookmark: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteBookmark: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/features/bookmark/model/bookmark.service", () => ({
  bookmarkService: { getGuestEmbeddings: vi.fn(async () => ({})) },
}));
vi.mock("@/shared/api/supabase/client", () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: "u1" } } } })) },
  },
}));
vi.mock("@/shared/lib/toast", () => ({ toast: { show: vi.fn() } }));
vi.mock("@/entities/bookmark/ui/BookmarkDetailPanel", () => ({ BookmarkDetailPanel: () => null }));
vi.mock("@/features/bookmark/ui/BookmarkList", () => ({ BookmarkList: () => null }));
vi.mock("@/features/bookmark/ui/TagFilter", () => ({ TagFilter: () => null }));
vi.mock("@/features/collection/ui/AddToCollectionButton", () => ({
  AddToCollectionButton: () => null,
}));

import { BookmarksContent } from "./BookmarksContent";

describe("search.semantic.member.limit-20 (화면)", () => {
  beforeEach(() => {
    vi.mocked(toast.show).mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 429,
        json: async () => ({
          success: false,
          code: "DAILY_LIMIT_EXCEEDED",
          message: "오늘 AI 의미 검색 20회를 모두 썼어요. 내일 다시 쓸 수 있어요.",
        }),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("회원이 하루 20회를 넘기면 '오늘 AI 의미 검색 20회를 모두 썼어요' 안내가 뜬다", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <BookmarksContent isGuest={false} />
      </QueryClientProvider>
    );
    await waitFor(() =>
      expect(toast.show).toHaveBeenCalledWith({
        message: expect.stringContaining("오늘 AI 의미 검색 20회를 모두 썼어요"),
      })
    );
    // 일반 실패 안내와 섞이지 않는다
    expect(toast.show).toHaveBeenCalledTimes(1);
  });
});
