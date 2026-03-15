import { useState, useEffect } from "react";
import { X, ExternalLink, Pencil, Check, XCircle } from "lucide-react";
import { useBookmarkStore } from "../model/useBookmarkStore";
import { TagGroup } from "@/shared/ui/tag/Tag";
import type { Bookmark } from "../model/types";

interface BookmarkDetailPanelProps {
  onSave?: (id: string, data: Pick<Bookmark, "title" | "tags">) => Promise<void>;
  onTagClick?: (tag: string) => void;
}

export const BookmarkDetailPanel = ({ onSave, onTagClick }: BookmarkDetailPanelProps) => {
  const { bookmarks, selectedBookmarkId, setSelectedBookmarkId } = useBookmarkStore();

  const bookmark = bookmarks.find((b) => b.id === selectedBookmarkId) ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleClose = () => {
    setSelectedBookmarkId(null);
    setIsEditing(false);
    setTagInput("");
  };

  const isOpen = !!selectedBookmarkId;

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
          <div className="flex flex-1 flex-col overflow-y-auto">
            {bookmark.thumbnailUrl && (
              <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={bookmark.thumbnailUrl}
                  alt={bookmark.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col gap-6 p-6">
              <div>
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

              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                  URL
                </label>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary flex items-center gap-1.5 truncate text-sm font-medium hover:underline"
                >
                  <ExternalLink size={14} />
                  {bookmark.url}
                </a>
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
        )}

        {isEditing && (
          <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
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
          </div>
        )}
      </div>
    </>
  );
};
