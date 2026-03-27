"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Trash2, Pencil, Check, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { InviteMemberModal } from "@/features/collection/ui/InviteMemberModal";
import {
  useCollection,
  useCollectionBookmarks,
  useUpdateCollection,
  useDeleteCollection,
  useRemoveBookmarkFromCollection,
} from "@/features/collection/model/queries";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { useUpdateBookmark } from "@/features/bookmark/model/queries";
import { supabase } from "@/shared/api/supabase/client";
import { useEffect } from "react";
import type { Bookmark } from "@/entities/bookmark/model/types";

interface Props {
  id: string;
}

export function CollectionDetailContent({ id }: Props) {
  const router = useRouter();
  const { data: collection, isLoading: colLoading } = useCollection(id);
  const { data: bookmarks = [], isLoading: bkLoading } = useCollectionBookmarks(id);
  const { mutateAsync: updateCollection } = useUpdateCollection();
  const { mutateAsync: deleteCollection } = useDeleteCollection();
  const { mutate: removeBookmark } = useRemoveBookmarkFromCollection();
  const { mutateAsync: updateBookmarkAsync } = useUpdateBookmark();
  const { selectedBookmarkId, setSelectedBookmarkId } = useBookmarkStore();

  const [showInvite, setShowInvite] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const selectedBookmark = bookmarks.find((b) => b.id === selectedBookmarkId) ?? null;
  const canEdit = collection?.role === "owner" || collection?.role === "editor";

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmarkId(bookmark.id);
    if (bookmark.status === "unread") {
      updateBookmarkAsync({ id: bookmark.id, data: { status: "read" } });
    }
  };

  const handlePanelSave = async (bmId: string, data: Pick<Bookmark, "title" | "tags">) => {
    await updateBookmarkAsync({ id: bmId, data });
  };

  const handleSaveName = async () => {
    if (!editName.trim() || !collection) return;
    await updateCollection({ id, name: editName.trim() });
    setIsEditingName(false);
  };

  const handleDelete = async () => {
    if (!confirm("컬렉션을 삭제할까요? 북마크는 삭제되지 않습니다.")) return;
    await deleteCollection(id);
    router.push("/collections");
  };

  if (colLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="font-bold text-zinc-700 dark:text-zinc-300">컬렉션을 찾을 수 없어요</p>
          <button
            onClick={() => router.push("/collections")}
            className="mt-4 text-sm text-zinc-500 underline"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header />

      <BookmarkDetailPanel
        bookmark={selectedBookmark}
        onSave={canEdit ? handlePanelSave : undefined}
        onTagClick={() => {}}
      />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.push("/collections")}
          className="mb-6 flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <ArrowLeft size={15} />
          컬렉션 목록
        </button>

        {/* 헤더 */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-2xl font-black text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={handleSaveName}
                  className="rounded-xl p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight">{collection.name}</h1>
                {collection.role === "owner" && (
                  <button
                    onClick={() => {
                      setEditName(collection.name);
                      setIsEditingName(true);
                    }}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            )}

            {collection.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {collection.description}
              </p>
            )}

            <p className="mt-2 text-sm text-zinc-400">
              북마크 {collection.bookmarkCount}개 · 멤버 {collection.memberCount}명
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Users size={15} />
              멤버 관리
            </button>
            {collection.role === "owner" && (
              <button
                onClick={handleDelete}
                className="rounded-2xl border border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 dark:border-red-900/30 dark:bg-zinc-900 dark:hover:bg-red-900/20"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* 북마크 목록 */}
        {bkLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : (
          <BookmarkList
            bookmarks={bookmarks}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={() => {}}
            emptyMessage={
              canEdit
                ? "아직 북마크가 없어요. 북마크 페이지에서 추가해보세요."
                : "아직 북마크가 없어요."
            }
          />
        )}
      </main>

      {showInvite && currentUserId && (
        <InviteMemberModal
          collection={collection}
          currentUserId={currentUserId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
