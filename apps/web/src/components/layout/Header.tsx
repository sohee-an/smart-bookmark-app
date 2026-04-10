"use client";

import React, { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { Input } from "@/shared/ui/input/Input";
import { supabase } from "@/shared/api/supabase/client";
import { Avatar } from "@/shared/ui/Avatar";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import storage from "@/shared/lib/storage";
import { SearchIcon, PlusIcon, LogOutIcon } from "@smart-bookmark/ui/icons";
import { Folder } from "lucide-react";
import Link from "next/link";
import { overlay } from "@/shared/lib/overlay/overlay";
import { AddBookmarkOverlay } from "@/features/bookmark/ui/AddBookmarkOverlay";
import { FilterBar } from "@/features/bookmark/ui/FilterBar";
import { SearchDropdown } from "@/features/bookmark/ui/SearchDropdown";
import { MobileSearchOverlay } from "@/features/bookmark/ui/MobileSearchOverlay";
import { useBookmarks } from "@/features/bookmark/model/queries";
import { useAuthStore } from "@/shared/model/useAuthStore";
import { useRecentSearches } from "@/shared/lib/useRecentSearches";
import type { User } from "@supabase/supabase-js";

export const Header = ({ initialUser }: { initialUser: User | null }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, initialized } = useAuthStore();

  // 클라이언트 인증 초기화 전엔 서버에서 받은 initialUser로 표시
  const currentUser = initialized ? user : (initialUser ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const {
    searches: recentSearches,
    add: addRecentSearch,
    remove: removeRecentSearch,
  } = useRecentSearches();

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

  // URL → 검색창 동기화 (외부에서 URL이 바뀔 때만)
  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // /bookmarks 페이지에서 입력 시 debounce로 URL 업데이트
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (pathname === "/bookmarks") {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const sp = new URLSearchParams(searchParams.toString());
        if (value) sp.set("q", value);
        else sp.delete("q");
        router.replace(`/bookmarks${sp.size ? `?${sp.toString()}` : ""}`);
      }, 300);
    }
  };

  // 검색 제출 (엔터 or 드롭다운 "전체 결과 보기")
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigateSearch(searchQuery);
  };

  const navigateSearch = (q: string) => {
    if (q.trim()) addRecentSearch(q.trim());
    const sp = new URLSearchParams(searchParams.toString());
    if (q) sp.set("q", q);
    else sp.delete("q");
    const method = pathname === "/bookmarks" ? router.replace : router.push;
    method(`/bookmarks${sp.size ? `?${sp.toString()}` : ""}`);
    setShowDropdown(false);
  };

  const handleDropdownSearchSelect = (q: string) => {
    setSearchQuery(q);
    navigateSearch(q);
  };

  const handleDropdownTagSelect = (tag: string) => {
    router.push(buildBookmarksUrl([tag]));
    setShowDropdown(false);
  };

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchContainerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogin = () => router.push("/login");

  const handleGuestLogin = () => {
    storage.cookie.remove("is_guest");
    router.push("/login");
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    storage.cookie.remove("is_guest");
    await supabase.auth.signOut();
    router.push("/landing");
  };

  const isGuest = initialized && !user && storage.cookie.get("is_guest") === "true";
  const nickname = currentUser?.email?.split("@")[0] || (isGuest ? "게스트" : "사용자");
  const isOnBookmarks = pathname === "/bookmarks";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Global"
      >
        {/* 왼쪽: 로고 + 데스크톱 검색 */}
        <div className="flex items-center gap-4">
          <Link href="/" className="group flex items-center gap-2">
            <h1 className="text-brand-primary text-2xl font-bold tracking-tight transition-opacity group-hover:opacity-80">
              SmartMark
            </h1>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <div ref={searchContainerRef} className="relative">
              <form role="search" onSubmit={handleSearchSubmit}>
                <Input
                  label="북마크 검색"
                  icon={<SearchIcon />}
                  placeholder="북마크 검색..."
                  className="w-72"
                  type="search"
                  inputSize="md"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (!isOnBookmarks) setShowDropdown(true);
                  }}
                />
              </form>

              {showDropdown && !isOnBookmarks && (
                <SearchDropdown
                  query={searchQuery}
                  bookmarks={bookmarks}
                  recentSearches={recentSearches}
                  frequentTags={frequentTags}
                  onSearchSelect={handleDropdownSearchSelect}
                  onTagSelect={handleDropdownTagSelect}
                  onRecentRemove={removeRecentSearch}
                  onViewAll={() => navigateSearch(searchQuery)}
                />
              )}
            </div>

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

        {/* 오른쪽: 모바일 검색 아이콘 + 컬렉션 + 추가 버튼 + 유저 */}
        <div className="flex items-center gap-3">
          {/* 모바일 전용 검색 아이콘 */}
          <button
            type="button"
            onClick={() => setShowMobileSearch(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="검색"
          >
            <SearchIcon size={18} />
          </button>

          {currentUser && (
            <Link
              href="/collections"
              className={`hidden items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all sm:flex ${
                pathname.startsWith("/collections")
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Folder size={15} />
              컬렉션
            </Link>
          )}

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

          {/* 유저 영역 — initialUser로 즉시 표시, 클라이언트 초기화 후 교체 */}
          {currentUser || isGuest ? (
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
                <Avatar username={nickname} src={currentUser?.user_metadata?.avatar_url} />
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
                      disabled={isLoggingOut}
                      className="text-status-error hover:bg-status-error/5 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogOutIcon />
                      <span>{isLoggingOut ? "로그아웃 중..." : "로그아웃"}</span>
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
          )}
        </div>
      </nav>

      {/* 모바일: /bookmarks 에서만 필터바 표시 */}
      {isOnBookmarks && (
        <div className="border-t border-zinc-100 px-4 py-3 md:hidden dark:border-zinc-800">
          <FilterBar
            selectedTags={selectedTags}
            onTagClick={handleTagClick}
            onTagRemove={handleTagRemove}
            allTags={allTags}
            recentTags={recentTags}
            frequentTags={frequentTags}
          />
        </div>
      )}

      {/* 모바일 전체화면 검색 오버레이 */}
      <MobileSearchOverlay
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        onSearch={(q) => {
          addRecentSearch(q);
          router.push(buildBookmarksUrl(selectedTags, q));
        }}
        onTagSelect={(tag) => router.push(buildBookmarksUrl([tag]))}
        bookmarks={bookmarks}
        recentSearches={recentSearches}
        onRecentRemove={removeRecentSearch}
        frequentTags={frequentTags}
      />
    </header>
  );
};
