import Link from "next/link";

/**
 * 매칭되는 라우트가 없거나 notFound()가 호출될 때 렌더되는 404 페이지.
 * 서버 컴포넌트 — 루트 레이아웃 안에서 렌더되므로 폰트/스타일을 그대로 상속한다.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-5xl font-black text-zinc-300 dark:text-zinc-700">404</p>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-900"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
