import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ExternalLink, Pencil, Check, XCircle, Trash2, Copy, CopyCheck } from "lucide-react";
import { useBookmarkStore } from "../model/useBookmarkStore";
import { TagGroup } from "@/shared/ui/tag/Tag";
import { toast } from "@/shared/lib/toast";
import type { Bookmark } from "../model/types";

interface BookmarkDetailPanelProps {
  bookmark: Bookmark | null;
  onSave?: (id: string, data: Pick<Bookmark, "title" | "tags">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  actions?: React.ReactNode;
}

export const BookmarkDetailPanel = ({
  bookmark,
  onSave,
  onDelete,
  onTagClick,
  actions,
}: BookmarkDetailPanelProps) => {
  const { setSelectedBookmarkId } = useBookmarkStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleEditStart = () => {
    if (!bookmark) return;
    setEditTitle(bookmark.title);
    setEditTags([...bookmark.tags]);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setTagInput("");
  };

  const handleTagAdd = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || editTags.includes(trimmed)) return;
    setEditTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const handleTagRemove = (tag: string) => {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!bookmark) return;
    setIsSaving(true);
    try {
      await onSave?.(bookmark.id, { title: editTitle, tags: editTags });
      setIsEditing(false);
    } catch (err) {
      console.error("[BookmarkDetailPanel] 저장 실패:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!bookmark) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete?.(bookmark.id);
      handleClose();
      toast.show({ message: "북마크가 삭제됐어요" });
    } catch (err) {
      console.error("[BookmarkDetailPanel] 삭제 실패:", err);
      setDeleteError("삭제하지 못했어요. 다시 시도해주세요.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setSelectedBookmarkId(null);
    setIsEditing(false);
    setTagInput("");
    setIsConfirmingDelete(false);
    setDeleteError(null);
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleCopyUrl = async () => {
    if (!bookmark) return;
    await navigator.clipboard.writeText(bookmark.url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isOpen = !!bookmark;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm" onClick={handleClose} />
      )}

      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-zinc-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">북마크 상세</span>
          <div className="flex items-center gap-2">
            {!isEditing && actions}
            {!isEditing ? (
              <button
                onClick={handleEditStart}
                className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Pencil size={18} />
              </button>
            ) : (
              <button
                onClick={handleEditCancel}
                className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
              >
                <XCircle size={18} />
              </button>
            )}
            <button
              onClick={handleClose}
              className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {bookmark && (
          <>
            {/* 스크롤 영역 */}
            <div
              className={`flex-1 overflow-y-auto transition-opacity duration-200 ${isConfirmingDelete ? "pointer-events-none opacity-40" : "opacity-100"}`}
            >
              {/* sticky: 썸네일 + 제목 */}
              <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
                {bookmark.thumbnailUrl && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    <Image
                      src={bookmark.thumbnailUrl}
                      alt={bookmark.title}
                      fill
                      sizes="448px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="border-b border-zinc-100 px-6 pt-4 pb-4 dark:border-zinc-800">
                  <label className="mb-1.5 block text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                    제목
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  ) : (
                    <p className="text-lg leading-snug font-black text-zinc-900 dark:text-zinc-100">
                      {bookmark.title || bookmark.url}
                    </p>
                  )}
                </div>
              </div>

              {/* 스크롤되는 본문 */}
              <div className="flex flex-col gap-6 p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                    URL
                  </label>
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="URL 복사"
                    >
                      {isCopied ? (
                        <CopyCheck size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-primary flex min-w-0 items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      <ExternalLink size={14} className="shrink-0" />
                      <span className="truncate">{bookmark.url}</span>
                    </a>
                  </div>
                </div>

                {bookmark.summary && (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                      AI 요약
                    </label>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {bookmark.summary}
                    </p>
                  </div>
                )}

                <TagGroup
                  tags={isEditing ? editTags : bookmark.tags}
                  editable={isEditing}
                  tagInput={tagInput}
                  onTagInputChange={setTagInput}
                  onTagAdd={handleTagAdd}
                  onTagRemove={handleTagRemove}
                  onTagClick={!isEditing ? onTagClick : undefined}
                />
              </div>
            </div>

            {/* 고정 footer */}
            <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleEditCancel}
                    className="flex-1 rounded-2xl border-2 border-zinc-100 bg-white py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="dark:bg-brand-primary flex flex-[1.5] items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-900"
                  >
                    <Check size={16} />
                    {isSaving ? "저장 중..." : "저장"}
                  </button>
                </div>
              ) : isConfirmingDelete ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      삭제할까요?
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      AI 요약, 태그, 메모가 모두 함께 사라져요.
                    </p>
                    {deleteError && (
                      <p className="mt-1.5 text-xs font-medium text-red-500">{deleteError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsConfirmingDelete(false);
                        setDeleteError(null);
                      }}
                      disabled={isDeleting}
                      className="flex flex-[1.5] items-center justify-center rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-white py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/30 dark:bg-zinc-900 dark:hover:bg-red-950/30"
                    >
                      {isDeleting ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={!onDelete}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/30 dark:bg-zinc-900 dark:hover:bg-red-950/30"
                >
                  <Trash2 size={16} />
                  삭제하기
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
