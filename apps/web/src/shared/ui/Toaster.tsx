"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "@/shared/lib/toast";

type ToastItem = {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
  duration: number;
};

let nextId = 0;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((payload) => {
      const id = nextId++;
      const duration = payload.duration ?? 4000;
      setItems((prev) => [
        ...prev,
        { id, message: payload.message, action: payload.action, duration },
      ]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex max-w-sm min-w-[300px] items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 shadow-xl dark:bg-zinc-100"
        >
          <p className="flex-1 text-sm font-medium text-white dark:text-zinc-900">{item.message}</p>
          {item.action && (
            <button
              type="button"
              onClick={() => {
                item.action!.onClick();
                setItems((prev) => prev.filter((t) => t.id !== item.id));
              }}
              className="shrink-0 rounded-lg bg-white/20 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/30 dark:bg-zinc-900/20 dark:text-zinc-900 dark:hover:bg-zinc-900/30"
            >
              {item.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
            className="shrink-0 text-white/60 transition-colors hover:text-white dark:text-zinc-900/60 dark:hover:text-zinc-900"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
