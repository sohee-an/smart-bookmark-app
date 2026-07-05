"use client";

import { useEffect } from "react";
import "@/styles/globals.css";
import { captureError } from "@/shared/lib/monitoring";

/**
 * 루트 layout.tsx 자체가 렌더 중 throw될 때의 최후 방어선.
 * 루트 레이아웃을 통째로 대체하므로 자체 <html>/<body>를 직접 렌더해야 한다.
 * (이때는 루트 레이아웃의 폰트/Provider가 없으므로 최소한의 스타일만)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "global" });
  }, [error]);

  return (
    <html lang="ko" style={{ colorScheme: "dark light" }}>
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">문제가 발생했어요</h1>
            <p className="text-zinc-500 dark:text-zinc-400">페이지를 새로고침해 주세요.</p>
          </div>
          <button
            onClick={reset}
            className="cursor-pointer rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-900"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
