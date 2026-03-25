import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookmarkFilter } from "@/entities/bookmark/api/bookmark.types.db";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { bookmarkService } from "./bookmark.service";

export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  list: (filter?: BookmarkFilter) => [...bookmarkKeys.all, "list", filter] as const,
};

export function useBookmarks(filter?: BookmarkFilter) {
  return useQuery({
    queryKey: bookmarkKeys.list(filter),
    queryFn: () => bookmarkService.getBookmarks(filter),
  });
}

export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bookmark> }) =>
      bookmarkService.updateBookmark(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.all });
      const previousData = queryClient.getQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all });
      queryClient.setQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all }, (old = []) =>
        old.map((b) => (b.id === id ? { ...b, ...data } : b))
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}
