import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBookmarkStore } from "./useBookmarkStore";

describe("useBookmarkStore", () => {
  beforeEach(() => {
    // 각 테스트 전에 상태를 초기화
    useBookmarkStore.setState({ selectedBookmarkId: null });
  });

  describe("초기 상태", () => {
    it("should have null selectedBookmarkId initially", () => {
      const state = useBookmarkStore.getState();
      expect(state.selectedBookmarkId).toBeNull();
    });

    it("should have setSelectedBookmarkId function", () => {
      const state = useBookmarkStore.getState();
      expect(typeof state.setSelectedBookmarkId).toBe("function");
    });
  });

  describe("selectedBookmarkId 설정", () => {
    it("should set selectedBookmarkId", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");

      const state = useBookmarkStore.getState();
      expect(state.selectedBookmarkId).toBe("bookmark-1");
    });

    it("should update selectedBookmarkId to different value", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");

      setSelectedBookmarkId("bookmark-2");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-2");
    });

    it("should set selectedBookmarkId to null", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");

      setSelectedBookmarkId(null);
      expect(useBookmarkStore.getState().selectedBookmarkId).toBeNull();
    });

    it("should handle empty string as valid id", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("");
    });

    it("should handle numeric string id", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("123");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("123");
    });

    it("should handle UUID format id", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();
      const uuid = "550e8400-e29b-41d4-a716-446655440000";

      setSelectedBookmarkId(uuid);
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe(uuid);
    });

    it("should handle very long id string", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();
      const longId = "a".repeat(1000);

      setSelectedBookmarkId(longId);
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe(longId);
    });
  });

  describe("구독 (subscription)", () => {
    it("should notify subscribers when state changes", () => {
      const listener = vi.fn();
      const unsubscribe = useBookmarkStore.subscribe(
        (state) => state.selectedBookmarkId,
        listener
      );

      const { setSelectedBookmarkId } = useBookmarkStore.getState();
      setSelectedBookmarkId("bookmark-1");

      expect(listener).toHaveBeenCalledWith("bookmark-1");

      unsubscribe();
    });

    it("should not notify after unsubscribe", () => {
      const listener = vi.fn();
      const unsubscribe = useBookmarkStore.subscribe(
        (state) => state.selectedBookmarkId,
        listener
      );

      const { setSelectedBookmarkId } = useBookmarkStore.getState();
      setSelectedBookmarkId("bookmark-1");
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      setSelectedBookmarkId("bookmark-2");
      expect(listener).toHaveBeenCalledTimes(1); // 여전히 1번
    });

    it("should notify multiple subscribers", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = useBookmarkStore.subscribe(
        (state) => state.selectedBookmarkId,
        listener1
      );
      const unsubscribe2 = useBookmarkStore.subscribe(
        (state) => state.selectedBookmarkId,
        listener2
      );

      const { setSelectedBookmarkId } = useBookmarkStore.getState();
      setSelectedBookmarkId("bookmark-1");

      expect(listener1).toHaveBeenCalledWith("bookmark-1");
      expect(listener2).toHaveBeenCalledWith("bookmark-1");

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe("상태 독립성", () => {
    it("should maintain separate state for multiple hook calls", () => {
      const state1 = useBookmarkStore.getState();
      const state2 = useBookmarkStore.getState();

      // Zustand는 싱글톤이므로 같은 인스턴스
      expect(state1).toBe(state2);
    });

    it("should persist state across multiple operations", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");

      // 다른 곳에서 접근해도 값이 유지됨
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");

      setSelectedBookmarkId("bookmark-2");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-2");
    });
  });

  describe("엣지 케이스", () => {
    it("should handle setting same id twice", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");
      setSelectedBookmarkId("bookmark-1");

      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");
    });

    it("should handle rapid state changes", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");
      setSelectedBookmarkId("bookmark-2");
      setSelectedBookmarkId("bookmark-3");
      setSelectedBookmarkId("bookmark-4");

      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-4");
    });

    it("should handle toggling between ids", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();

      setSelectedBookmarkId("bookmark-1");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");

      setSelectedBookmarkId(null);
      expect(useBookmarkStore.getState().selectedBookmarkId).toBeNull();

      setSelectedBookmarkId("bookmark-1");
      expect(useBookmarkStore.getState().selectedBookmarkId).toBe("bookmark-1");
    });
  });

  describe("함수 반환 타입", () => {
    it("setSelectedBookmarkId should return void", () => {
      const { setSelectedBookmarkId } = useBookmarkStore.getState();
      const result = setSelectedBookmarkId("bookmark-1");

      expect(result).toBeUndefined();
    });
  });
});
