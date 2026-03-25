"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/shared/ui/input/Input";
import { supabase } from "@/shared/api/supabase/client";
import { Avatar } from "@/shared/ui/Avatar";
import { User } from "@supabase/supabase-js";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import storage from "@/shared/lib/storage";
import { SearchIcon, PlusIcon, LogOutIcon } from "@smart-bookmark/ui/icons";
import Link from "next/link";
import { overlay } from "@/shared/lib/overlay/overlay";
import { AddBookmarkOverlay } from "@/features/bookmark/ui/AddBookmarkOverlay";
import { FilterBar } from "@/features/bookmark/ui/FilterBar";
import { useBookmarks } from "@/features/bookmark/model/queries";

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: bookmarks = [] } = useBookmarks();

  const selectedTags = useMemo(() => searchParams.getAll("tag"), [searchParams]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.forEach((b) => b.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [bookmarks]);

  const recentTags = useMemo(() => {
    const set = new Set<string>();
    bookmarks.slice(0, 5).forEach((b) => b.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [bookmarks]);

  const frequentTags = useMemo(() => {
    const count: Record<string, number> = {};
    bookmarks.forEach((b) =>
      b.tags.forEach((t) => {
        count[t] = (count[t] ?? 0) + 1;
      })
    );
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [bookmarks]);

  const buildBookmarksUrl = (tags: string[], q?: string) => {
    const sp = new URLSearchParams();
    tags.forEach((t) => sp.append("tag", t));
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return `/bookmarks${qs ? `?${qs}` : ""}`;
  };

  const handleTagClick = (tag: string) => {
    const next = [...selectedTags, tag];
    router.push(buildBookmarksUrl(next, searchParams.get("q") ?? undefined));
  };

  const handleTagRemove = (tag: string) => {
    const next = selectedTags.filter((t) => t !== tag);
    router.replace(buildBookmarksUrl(next, searchParams.get("q") ?? undefined));
  };

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

  const handleGuestLogin = () => {
    storage.cookie.remove("is_guest");
    router.push("/login");
  };

  const handleLogout = async () => {
    storage.cookie.remove("is_guest");
    await supabase.auth.signOut();
    router.push("/landing");
  };

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSearchFocus = () => {
    if (pathname !== "/bookmarks") {
      const sp = new URLSearchParams(searchParams.toString());
      router.push(`/bookmarks${sp.size ? `?${sp.toString()}` : ""}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      sp.set("q", searchQuery);
    } else {
      sp.delete("q");
    }
    router.push(`/bookmarks${sp.size ? `?${sp.toString()}` : ""}`);
  };

  const isGuest = !user && !loading && storage.cookie.get("is_guest") === "true";
  const nickname = user?.email?.split("@")[0] || (isGuest ? "게스트" : "사용자");

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="group flex items-center gap-2">
            <h1 className="text-brand-primary text-2xl font-bold tracking-tight transition-opacity group-hover:opacity-80">
              SmartMark
            </h1>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <form role="search" onSubmit={handleSearchSubmit}>
              <Input
                label="북마크 검색"
                icon={<SearchIcon />}
                placeholder="북마크 검색..."
                className="w-72"
                type="search"
                inputSize="md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
              />
            </form>
            <FilterBar
              selectedTags={selectedTags}
              onTagClick={handleTagClick}
              onTagRemove={handleTagRemove}
              allTags={allTags}
              recentTags={recentTags}
              frequentTags={frequentTags}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              overlay.open(({ isOpen, close }) => (
                <AddBookmarkOverlay isOpen={isOpen} onClose={close} />
              ))
            }
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
                  <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 hidden pt-2 duration-200 group-hover:block">
                    <div className="bg-surface-card dark:bg-surface-card-dark flex min-w-[140px] flex-col gap-1 rounded-2xl border border-zinc-200 p-1.5 shadow-xl dark:border-zinc-800">
                      {isGuest && (
                        <button
                          onClick={handleGuestLogin}
                          className="text-brand-primary hover:bg-brand-primary/5 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
                        >
                          <PlusIcon />
                          <span>로그인/회원가입</span>
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

      {/* 모바일 검색 + 필터 */}
      <div className="border-t border-zinc-100 p-4 md:hidden dark:border-zinc-800">
        <div className="flex gap-2">
          <form role="search" onSubmit={handleSearchSubmit} className="flex-1">
            <Input
              label="북마크 검색"
              icon={<SearchIcon />}
              placeholder="북마크 검색..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleSearchFocus}
            />
          </form>
          <FilterBar
            selectedTags={selectedTags}
            onTagClick={handleTagClick}
            onTagRemove={handleTagRemove}
            allTags={allTags}
            recentTags={recentTags}
            frequentTags={frequentTags}
          />
        </div>
      </div>
    </header>
  );
};
