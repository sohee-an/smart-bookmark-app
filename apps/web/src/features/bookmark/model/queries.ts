import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookmarkFilter } from "@/entities/bookmark/api/bookmark.types.db";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { bookmarkService } from "./bookmark.service";

export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  list: (filter?: BookmarkFilter) =>
    filter
      ? ([...bookmarkKeys.all, "list", filter] as const)
      : ([...bookmarkKeys.all, "list"] as const),
};

export function useBookmarks(filter?: BookmarkFilter) {
  return useQuery({
    queryKey: bookmarkKeys.list(filter),
    queryFn: () => bookmarkService.getBookmarks(filter),
    // crawling/processing 중인 북마크가 있으면 3초마다 자동 갱신
    refetchInterval: (query) => {
      const data = query.state.data as Bookmark[] | undefined;
      const hasPending = data?.some(
        (b) => b.aiStatus === "processing" || b.aiStatus === "crawling"
      );
      return hasPending ? 3000 : false;
    },
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

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookmarkService.deleteBookmark(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.all });
      const previousData = queryClient.getQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all });
      queryClient.setQueriesData<Bookmark[]>({ queryKey: bookmarkKeys.all }, (old = []) =>
        old.filter((b) => b.id !== id)
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
