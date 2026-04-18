import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { ImportView } from "../../components/ImportView";
import { BookmarkManager } from "../../components/BookmarkManager";
import "../../assets/globals.css";

const WEB_URL = import.meta.env.VITE_WEB_URL as string;

type Tab = "import" | "organize";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("organize");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base dark:bg-surface-base-dark">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-base px-4 dark:bg-surface-base-dark">
        <h1 className="text-2xl font-extrabold text-brand-primary">SmartMark</h1>
        <p className="text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          브라우저 북마크를 가져오려면 먼저 로그인이 필요합니다.
        </p>
        <button
          className="w-full cursor-pointer rounded-xl border-none bg-brand-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          onClick={() => {
            chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
              if (tab?.id) chrome.storage.local.set({ returnToTabId: tab.id });
              chrome.tabs.create({ url: `${WEB_URL}/login?from=extension` });
            });
          }}
        >
          로그인하기
        </button>
      </div>
    );
  }

  return (
    <div className="box-border flex h-screen flex-col bg-surface-base font-sans dark:bg-surface-base-dark">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-surface-base px-4 pt-4 dark:border-zinc-800 dark:bg-surface-base-dark">
        <h1 className="mb-3 text-xl font-extrabold text-brand-primary">SmartMark</h1>

        {/* 탭 */}
        <div className="flex gap-1">
          {(["organize", "import"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`cursor-pointer rounded-t-lg border-none px-4 py-2 text-xs font-semibold transition-colors ${
                tab === t
                  ? "bg-surface-base text-brand-primary dark:bg-surface-base-dark"
                  : "bg-transparent text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "import" ? "가져오기" : "북마크 정리"}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        {tab === "import" ? <ImportView user={user} /> : <BookmarkManager />}
      </div>
    </div>
  );
}
