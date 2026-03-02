import React, { useEffect, useState } from "react";
import { Input } from "../ui/Input";
import { supabase } from "@/shared/api/supabase";
import { Avatar } from "@/shared/ui/Avatar";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import storage from "@/shared/lib/storage";
import { SearchIcon, PlusIcon, LogOutIcon } from "@/shared/ui/icons";

export const Header = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error) setUser(user);
      setLoading(false);
    };
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    router.push("/login");
  };

  const handleLogout = async () => {
    storage.cookie.remove("is_guest");
    await supabase.auth.signOut();
    router.push("/landing");
  };

  const isGuest = !user && !loading && storage.cookie.get("is_guest") === "true";
  const nickname = user?.email?.split("@")[0] || (isGuest ? "게스트" : "사용자");

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-8">
          <a href="/" className="group flex items-center gap-2">
            <h1 className="text-brand-primary text-2xl font-bold tracking-tight transition-opacity group-hover:opacity-80">
              SmartMark
            </h1>
          </a>

          <form role="search" className="hidden md:block" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="북마크 검색"
              icon={<SearchIcon />}
              placeholder="북마크 검색..."
              className="w-80"
              type="search"
              inputSize="md"
            />
          </form>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="bg-brand-primary hover:bg-brand-primary-hover focus:ring-brand-primary/20 flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all focus:ring-4 focus:outline-none active:scale-95"
          >
            <PlusIcon />
            <span className="hidden sm:inline">북마크 추가</span>
          </button>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

          {!loading &&
            (user || isGuest ? (
              <div className="flex items-center gap-3">
                <div className="hidden flex-col items-end lg:flex">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isGuest ? "환영합니다!" : "반가워요!"}
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {nickname}님
                  </span>
                </div>
                <div className="group relative cursor-pointer">
                  <Avatar username={nickname} src={user?.user_metadata?.avatar_url} />
                  <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 mt-2 hidden pt-2 duration-200 group-hover:block">
                    <div className="bg-surface-card dark:bg-surface-card-dark flex min-w-[140px] flex-col gap-1 rounded-2xl border border-zinc-200 p-1.5 shadow-xl dark:border-zinc-800">
                      {isGuest && (
                        <button
                          onClick={handleLogin}
                          className="text-brand-primary hover:bg-brand-primary/5 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                        >
                          <PlusIcon />
                          <span>로그인하기</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="text-status-error hover:bg-status-error/5 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                      >
                        <LogOutIcon />
                        <span>로그아웃</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="hover:text-brand-primary dark:hover:text-brand-primary cursor-pointer text-sm font-semibold text-zinc-600 transition-colors dark:text-zinc-400"
              >
                로그인
              </button>
            ))}
        </div>
      </nav>

      <div className="border-t border-zinc-100 p-4 md:hidden dark:border-zinc-800">
        <form role="search" onSubmit={(e) => e.preventDefault()}>
          <Input
            label="북마크 검색"
            icon={<SearchIcon />}
            placeholder="북마크 검색..."
            type="search"
          />
        </form>
      </div>
    </header>
  );
};
