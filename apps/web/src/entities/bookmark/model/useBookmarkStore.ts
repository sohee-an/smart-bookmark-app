import { create } from "zustand";
import type { Bookmark } from "./types";

interface BookmarkStore {
  bookmarks: Bookmark[];
  setBookmarks: (bookmarks: Bookmark[]) => void;
  addBookmark: (bookmark: Bookmark) => void;
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  bookmarks: [],
  setBookmarks: (bookmarks) => set({ bookmarks }),
  addBookmark: (bookmark) =>
    set((state) => ({
      bookmarks: [bookmark, ...state.bookmarks],
    })),
}));
