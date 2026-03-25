"use client";

import { useState } from "react";
import { X, Folder } from "lucide-react";
import { useCreateCollection } from "../model/queries";

interface Props {
  onClose: () => void;
}

export const CreateCollectionModal = ({ onClose }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { mutateAsync, isPending } = useCreateCollection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 text-brand-primary flex h-10 w-10 items-center justify-center rounded-2xl">
              <Folder size={20} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">새 컬렉션 만들기</h3>
              <p className="text-sm text-zinc-500">북마크를 묶고 팀과 공유하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-widest text-zinc-400 uppercase">
              이름 *
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: React 아티클 모음"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold tracking-widest text-zinc-400 uppercase">
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 컬렉션에 대한 설명..."
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border-2 border-zinc-100 bg-white py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-[1.5] rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isPending ? "만드는 중..." : "만들기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
