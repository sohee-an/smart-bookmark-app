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
    // 초기 유저 정보 가져오기 (보안 권장: getUser)
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error) setUser(user);
      setLoading(false);
    };

    checkUser();

    // 인증 상태 변경 감지
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
    storage.remove("is_guest");
    await supabase.auth.signOut();
    router.push("/landing");
  };

  const isGuest = !user && !loading && storage.get("is_guest");
  // 닉네임 추출 (이메일 앞부분)
  const nickname = user?.email?.split("@")[0] || (isGuest ? "게스트" : "사용자");

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-8">
          <a href="/" className="group flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-indigo-600 transition-opacity group-hover:opacity-80 dark:text-indigo-400">
              SmartMark
            </h1>
          </a>

          {/* Search Area - Desktop */}
          <form role="search" className="hidden md:block" onSubmit={(e) => e.preventDefault()}>
            <Input
              label="북마크 검색"
              icon={<SearchIcon />}
              placeholder="북마크 검색..."
              className="w-80"
              type="search"
            />
          </form>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400"
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
                  {/* 로그아웃 버튼 (간단한 드롭다운 효과) */}
                  <div className="absolute top-full right-0 mt-2 hidden pt-2 group-hover:block">
                    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                      {isGuest && (
                        <button
                          onClick={handleLogin}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        >
                          <PlusIcon />
                          <span>로그인하기</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOutIcon />
                        <span>{isGuest ? "로그아웃" : "로그아웃"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="cursor-pointer text-sm font-semibold text-zinc-600 transition-colors hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
              >
                로그인
              </button>
            ))}
        </div>
      </nav>

      {/* Search Area - Mobile */}
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
