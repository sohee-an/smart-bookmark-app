import { describe, it, expect } from "vitest";
import { filterBookmarks } from "./filterBookmarks";
import type { Bookmark } from "@/entities/bookmark/model/types";

const base: Omit<Bookmark, "id" | "title" | "tags" | "summary"> = {
  url: "https://example.com",
  aiStatus: "completed",
  status: "unread",
  userId: "user-1",
  createdAt: "",
  updatedAt: "",
};

const bookmarks: Bookmark[] = [
  {
    ...base,
    id: "1",
    title: "React 상태관리 가이드",
    tags: ["React", "Zustand"],
    summary: "Zustand로 전역 상태를 관리하는 방법",
  },
  {
    ...base,
    id: "2",
    title: "Next.js 라우팅",
    tags: ["Next.js", "React"],
    summary: "App Router vs Pages Router 비교",
  },
  {
    ...base,
    id: "3",
    title: "CSS Grid 완벽 정리",
    tags: ["CSS"],
    summary: "그리드 레이아웃 완전 정복",
  },
];

describe("filterBookmarks", () => {
  describe("태그 필터", () => {
    it("선택된 태그가 없으면 전체 반환", () => {
      expect(filterBookmarks(bookmarks, [], "")).toHaveLength(3);
    });

    it("단일 태그 — 해당 태그 포함된 북마크만 반환", () => {
      const result = filterBookmarks(bookmarks, ["CSS"], "");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("3");
    });

    it("복수 태그 — OR 조건: 하나라도 포함되면 반환", () => {
      const result = filterBookmarks(bookmarks, ["Zustand", "CSS"], "");
      expect(result).toHaveLength(2);
      expect(result.map((b) => b.id)).toEqual(expect.arrayContaining(["1", "3"]));
    });

    it("일치하는 태그 없으면 빈 배열 반환", () => {
      expect(filterBookmarks(bookmarks, ["TypeScript"], "")).toHaveLength(0);
    });
  });

  describe("키워드 검색", () => {
    it("제목에 키워드가 포함된 북마크 반환", () => {
      const result = filterBookmarks(bookmarks, [], "Next.js");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("요약(summary)에 키워드가 포함된 북마크 반환", () => {
      const result = filterBookmarks(bookmarks, [], "Zustand");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("대소문자 구분 없이 검색", () => {
      const result = filterBookmarks(bookmarks, [], "react");
      expect(result).toHaveLength(2);
    });

    it("일치하는 키워드 없으면 빈 배열 반환", () => {
      expect(filterBookmarks(bookmarks, [], "Vue")).toHaveLength(0);
    });
  });

  describe("태그 + 키워드 조합", () => {
    it("태그 필터 후 키워드로 추가 필터링", () => {
      // React 태그 중에서 "라우팅" 키워드 검색
      const result = filterBookmarks(bookmarks, ["React"], "라우팅");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("태그는 맞지만 키워드 불일치 → 빈 배열", () => {
      const result = filterBookmarks(bookmarks, ["CSS"], "React");
      expect(result).toHaveLength(0);
    });
  });
});
