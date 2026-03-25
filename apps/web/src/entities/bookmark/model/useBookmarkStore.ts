import { create } from "zustand";

interface BookmarkStore {
  selectedBookmarkId: string | null;
  setSelectedBookmarkId: (id: string | null) => void;
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  selectedBookmarkId: null,
  setSelectedBookmarkId: (id) => set({ selectedBookmarkId: id }),
}));
