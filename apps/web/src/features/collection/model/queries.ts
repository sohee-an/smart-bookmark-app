import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Collection,
  CollectionDetail,
  CollectionRole,
} from "@/entities/collection/model/types";
import type { Bookmark } from "@/entities/bookmark/model/types";

export const collectionKeys = {
  all: ["collections"] as const,
  list: () => [...collectionKeys.all, "list"] as const,
  detail: (id: string) => [...collectionKeys.all, "detail", id] as const,
  bookmarks: (id: string) => [...collectionKeys.all, "bookmarks", id] as const,
};

// ── 목록 ──────────────────────────────────────────────────────
export function useCollections() {
  return useQuery({
    queryKey: collectionKeys.list(),
    queryFn: async () => {
      const res = await fetch("/api/collections");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as Collection[];
    },
  });
}

// ── 상세 ──────────────────────────────────────────────────────
export function useCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/collections/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as CollectionDetail;
    },
    enabled: !!id,
  });
}

// ── 북마크 목록 ───────────────────────────────────────────────
export function useCollectionBookmarks(collectionId: string) {
  return useQuery({
    queryKey: collectionKeys.bookmarks(collectionId),
    queryFn: async () => {
      const res = await fetch(`/api/collections/${collectionId}/bookmarks`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as Bookmark[];
    },
    enabled: !!collectionId,
  });
}

// ── 생성 ──────────────────────────────────────────────────────
export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as Collection;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.list() }),
  });
}

// ── 수정 ──────────────────────────────────────────────────────
export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string }) => {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: (_d, { id }) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: collectionKeys.list() });
    },
  });
}

// ── 삭제 ──────────────────────────────────────────────────────
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.list() }),
  });
}

// ── 북마크 추가/제거 ──────────────────────────────────────────
export function useAddBookmarkToCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      collectionId,
      bookmarkId,
    }: {
      collectionId: string;
      bookmarkId: string;
    }) => {
      const res = await fetch(`/api/collections/${collectionId}/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: (_d, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.bookmarks(collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(collectionId) });
    },
  });
}

export function useRemoveBookmarkFromCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      collectionId,
      bookmarkId,
    }: {
      collectionId: string;
      bookmarkId: string;
    }) => {
      const res = await fetch(`/api/collections/${collectionId}/bookmarks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: (_d, { collectionId }) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.bookmarks(collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(collectionId) });
    },
  });
}

// ── 멤버 초대 / 역할 변경 / 제거 ──────────────────────────────
export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      collectionId,
      email,
      role,
    }: {
      collectionId: string;
      email: string;
      role: CollectionRole;
    }) => {
      const res = await fetch("/api/collections/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, email, role }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: (_d, { collectionId }) =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(collectionId) }),
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      collectionId,
      userId,
      role,
    }: {
      collectionId: string;
      userId: string;
      role: CollectionRole;
    }) => {
      const res = await fetch(`/api/collections/${collectionId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: (_d, { collectionId }) =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(collectionId) }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionId, userId }: { collectionId: string; userId?: string }) => {
      const res = await fetch(`/api/collections/${collectionId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: (_d, { collectionId }) =>
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(collectionId) }),
  });
}
