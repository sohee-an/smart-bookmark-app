"use client";

import { RotateCcw } from "lucide-react";

/**
 * 에러 + 재시도 UI 공용 컴포넌트.
 * 에러 바운더리(error.tsx)와 데이터 로드 실패(isError) 양쪽에서 재사용한다.
 */
export function ErrorState({
  title = "문제가 발생했어요",
  description = "일시적인 오류일 수 있어요. 다시 시도해 주세요.",
  onRetry,
  className = "min-h-[60vh]",
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 px-6 text-center ${className}`}
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex cursor-pointer items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-900"
      >
        <RotateCcw className="h-4 w-4" />
        다시 시도
      </button>
    </div>
  );
}
