// 페이지 전환 시 Suspense fallback으로 사용하는 스켈레톤

function HeaderSkeleton() {
  return (
    <div className="sticky top-0 z-50 h-[65px] border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80" />
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 h-36 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="mb-2 h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <HeaderSkeleton />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LoginLoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm animate-pulse">
        <div className="mb-6 h-8 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-4 rounded-2xl border border-zinc-100 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-11 rounded-xl bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}
