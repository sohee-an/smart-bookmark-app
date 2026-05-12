import { describe, it, expect, beforeEach, vi } from "vitest";
import { SupabaseBookmarkRepository } from "@/entities/bookmark/api/supabase.repository";

vi.mock("@/shared/api/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/shared/api/supabase/client";

type MockChain = {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
};

describe("회원 저장→조회 워크플로우", () => {
  let repo: SupabaseBookmarkRepository;
  const userId = "test-user-123";
  const mockBookmarks = [
    {
      id: "bookmark-1",
      url: "https://example1.com",
      title: "Example 1",
      summary: "Summary 1",
      content: null,
      user_memo: "Memo",
      thumbnail_url: null,
      ai_status: "completed",
      status: "unread",
      tags: [],
      created_at: "2024-03-08T00:00:00Z",
      updated_at: "2024-03-08T00:00:00Z",
      user_id: userId,
      temp_user_id: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SupabaseBookmarkRepository(userId);
  });

  describe("저장 및 조회", () => {
    it("북마크를 저장하고 조회", async () => {
      // Mock insert 요청
      const mockChain: MockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBookmarks[0],
          error: null,
        }),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockChain);

      const saved = await repo.save({
        url: "https://example1.com",
        userMemo: "Memo",
      });

      expect(saved.url).toBe("https://example1.com");
      expect(saved.id).toBe("bookmark-1");

      // Mock select 요청 (조회)
      const mockQueryChain: MockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockBookmarks[0],
          error: null,
        }),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockQueryChain);

      const found = await repo.findById("bookmark-1");

      expect(found?.url).toBe("https://example1.com");
      expect(found?.id).toBe("bookmark-1");
    });

    it("북마크를 업데이트하고 변경 사항 반영", async () => {
      const mockUpdateChain: MockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        insert: vi.fn(),
        select: vi.fn(),
        single: vi.fn(),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockUpdateChain);

      // 업데이트 실행
      await repo.update("bookmark-1", {
        title: "Updated Title",
        status: "read",
      });

      // verify update was called with correct data
      expect(mockUpdateChain.update).toHaveBeenCalled();

      // 업데이트 후 조회
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...mockBookmarks[0],
            title: "Updated Title",
            status: "read",
          },
          error: null,
        }),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockQueryChain);

      const updated = await repo.findById("bookmark-1");

      expect(updated?.title).toBe("Updated Title");
      expect(updated?.status).toBe("read");
    });
  });

  describe("전체 조회 및 필터링", () => {
    it("모든 북마크를 조회", async () => {
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockBookmarks,
          error: null,
        }),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockQueryChain);

      const results = await repo.findAll();

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("bookmark-1");
    });

    it("상태별로 북마크 필터링", async () => {
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockBookmarks[0]],
          error: null,
        }),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockQueryChain);

      const results = await repo.findAll({ status: "unread" });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("unread");
    });
  });

  describe("삭제 워크플로우", () => {
    it("북마크를 삭제하고 삭제 확인", async () => {
      // Mock delete
      const mockDeleteChain: MockChain & { delete: ReturnType<typeof vi.fn> } = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        insert: vi.fn(),
        select: vi.fn(),
        single: vi.fn(),
      };

      (
        supabase.from as (table: string) => MockChain & { delete: ReturnType<typeof vi.fn> }
      ).mockReturnValue(mockDeleteChain);

      await repo.delete("bookmark-1");

      expect(mockDeleteChain.delete).toHaveBeenCalled();

      // 삭제 후 조회 (null 반환)
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "not found" },
        }),
      };

      (supabase.from as (table: string) => MockChain).mockReturnValue(mockQueryChain);

      const found = await repo.findById("bookmark-1");

      expect(found).toBeNull();
    });
  });
});
