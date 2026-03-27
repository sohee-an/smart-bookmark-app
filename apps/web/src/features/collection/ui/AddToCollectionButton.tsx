"use client";

import { useState } from "react";
import { FolderPlus, Check } from "lucide-react";
import {
  useCollections,
  useAddBookmarkToCollection,
  useRemoveBookmarkFromCollection,
  useCollectionBookmarks,
} from "../model/queries";

interface Props {
  bookmarkId: string;
}

export const AddToCollectionButton = ({ bookmarkId }: Props) => {
  const [open, setOpen] = useState(false);
  const { data: collections = [] } = useCollections();
  const { mutate: addBookmark } = useAddBookmarkToCollection();
  const { mutate: removeBookmark } = useRemoveBookmarkFromCollection();

  const editableCollections = collections.filter((c) => ["owner", "editor"].includes(c.role));

  if (editableCollections.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <FolderPlus size={14} />
        컬렉션에 추가
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-50 mt-1 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <p className="border-b border-zinc-100 px-4 py-2.5 text-xs font-bold tracking-widest text-zinc-400 uppercase dark:border-zinc-800">
              컬렉션 선택
            </p>
            <ul>
              {editableCollections.map((col) => (
                <CollectionItem
                  key={col.id}
                  collectionId={col.id}
                  name={col.name}
                  bookmarkId={bookmarkId}
                  onAdd={() => {
                    addBookmark({ collectionId: col.id, bookmarkId });
                    setOpen(false);
                  }}
                  onRemove={() => {
                    removeBookmark({ collectionId: col.id, bookmarkId });
                  }}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

function CollectionItem({
  collectionId,
  name,
  bookmarkId,
  onAdd,
  onRemove,
}: {
  collectionId: string;
  name: string;
  bookmarkId: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { data: bookmarks = [] } = useCollectionBookmarks(collectionId);
  const isAdded = bookmarks.some((b) => b.id === bookmarkId);

  return (
    <li>
      <button
        onClick={isAdded ? onRemove : onAdd}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded ${isAdded ? "bg-zinc-900 dark:bg-zinc-100" : "border-2 border-zinc-300 dark:border-zinc-600"}`}
        >
          {isAdded && <Check size={10} className="text-white dark:text-zinc-900" />}
        </span>
        <span className="flex-1 truncate text-left text-zinc-700 dark:text-zinc-300">{name}</span>
      </button>
    </li>
  );
}
