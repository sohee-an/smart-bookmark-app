"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen } from "lucide-react";
import { CollectionCard } from "@/entities/collection/ui/CollectionCard";
import { CreateCollectionModal } from "@/features/collection/ui/CreateCollectionModal";
import { useCollections } from "@/features/collection/model/queries";

export function CollectionsContent() {
  const router = useRouter();
  const { data: collections = [], isLoading } = useCollections();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              컬렉션
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              북마크를 묶고 팀과 함께 관리하세요
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus size={16} />새 컬렉션
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <FolderOpen size={28} className="text-zinc-400" />
            </div>
            <p className="font-bold text-zinc-700 dark:text-zinc-300">아직 컬렉션이 없어요</p>
            <p className="mt-1 text-sm text-zinc-400">북마크를 묶어서 팀과 공유해보세요</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              <Plus size={16} />첫 컬렉션 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onClick={() => router.push(`/collections/${col.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateCollectionModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
