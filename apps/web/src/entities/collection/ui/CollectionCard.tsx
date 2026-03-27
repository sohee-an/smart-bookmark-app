"use client";

import { Folder, Users, Bookmark, Crown, Pencil, Eye } from "lucide-react";
import type { Collection, CollectionRole } from "../model/types";

const ROLE_BADGE: Record<
  CollectionRole,
  { label: string; icon: React.ReactNode; className: string }
> = {
  owner: {
    label: "소유자",
    icon: <Crown size={11} />,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  editor: {
    label: "편집자",
    icon: <Pencil size={11} />,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  viewer: {
    label: "뷰어",
    icon: <Eye size={11} />,
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

interface CollectionCardProps {
  collection: Collection;
  onClick: () => void;
}

export const CollectionCard = ({ collection, onClick }: CollectionCardProps) => {
  const badge = ROLE_BADGE[collection.role];

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Folder size={20} />
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
        >
          {badge.icon}
          {badge.label}
        </span>
      </div>

      <div className="flex-1">
        <p className="line-clamp-1 font-bold text-zinc-900 dark:text-zinc-100">{collection.name}</p>
        {collection.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {collection.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="flex items-center gap-1">
          <Bookmark size={12} />
          {collection.bookmarkCount}개
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {collection.memberCount}명
        </span>
      </div>
    </button>
  );
};
