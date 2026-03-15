import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { TagFilter } from "@/features/bookmark/ui/TagFilter";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { filterBookmarks } from "@/features/bookmark/model/filterBookmarks";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import type { Bookmark } from "@/entities/bookmark/model/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function BookmarksPage() {
  const router = useRouter();
  const { bookmarks, setBookmarks, setSelectedBookmarkId, updateBookmark } = useBookmarkStore();

  // URL 쿼리 파싱
  const query = (router.query.q as string) ?? "";
  const selectedTags = useMemo(() => {
    const raw = router.query.tag;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }, [router.query.tag]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const data = await bookmarkService.getBookmarks();
        setBookmarks(data);
      } catch (error) {
        console.error("북마크 로드 실패:", error);
      }
    };
    fetchBookmarks();
  }, [setBookmarks]);

  const filtered = useMemo(
    () => filterBookmarks(bookmarks, selectedTags, query),
    [bookmarks, selectedTags, query]
  );

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmarkId(bookmark.id);
  };

  const handlePanelSave = async (id: string, data: Pick<Bookmark, "title" | "tags">) => {
    await bookmarkService.updateBookmark(id, data);
    updateBookmark(id, data);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) return;
    setSelectedBookmarkId(null);
    const next = [...selectedTags, tag];
    router.push({ pathname: "/bookmarks", query: { ...router.query, tag: next } });
  };

  const handleTagRemove = (tag: string) => {
    const next = selectedTags.filter((t) => t !== tag);
    router.replace({
      pathname: "/bookmarks",
      query: { ...router.query, tag: next.length ? next : undefined },
    });
  };

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} selection:bg-brand-primary/20 selection:text-brand-primary min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100`}
    >
      <Head>
        <title>북마크 검색 — SmartMark</title>
      </Head>

      <Header />

      <BookmarkDetailPanel onSave={handlePanelSave} onTagClick={handleTagClick} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-3 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
          북마크 검색
        </h1>

        {selectedTags.length > 0 && (
          <div className="mb-4">
            <TagFilter tags={selectedTags} onRemove={handleTagRemove} />
          </div>
        )}

        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          {filtered.length}개의 북마크
        </p>

        <BookmarkList
          bookmarks={filtered}
          onBookmarkClick={handleBookmarkClick}
          onTagClick={handleTagClick}
        />
      </main>
    </div>
  );
}
