import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { ImportView } from "../../components/ImportView";
import "../../assets/globals.css";

const WEB_URL = import.meta.env.VITE_WEB_URL as string;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-extrabold text-zinc-900">SmartMark</h1>
        <p className="text-center text-sm leading-relaxed text-zinc-500">
          브라우저 북마크를 가져오려면 먼저 로그인이 필요합니다.
        </p>
        <button
          className="w-full cursor-pointer rounded-xl border-none bg-zinc-900 py-3 text-sm font-semibold text-white"
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
    <div className="box-border flex min-h-screen flex-col gap-3 p-4 font-sans">
      <h1 className="m-0 text-xl font-extrabold text-zinc-900">SmartMark</h1>
      <ImportView user={user} />
    </div>
  );
}
