import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { TagFilter } from "@/features/bookmark/ui/TagFilter";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { SemanticResultSection } from "@/features/bookmark/ui/SemanticResultSection";
import { filterBookmarks } from "@/features/bookmark/model/filterBookmarks";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import { supabase } from "@/shared/api/supabase/client";
import type { Bookmark } from "@/entities/bookmark/model/types";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

interface SemanticBookmark extends Bookmark {
  similarity: number;
}

export default function BookmarksPage() {
  const router = useRouter();
  const { bookmarks, setBookmarks, setSelectedBookmarkId, updateBookmark } = useBookmarkStore();

  const [semanticExact, setSemanticExact] = useState<SemanticBookmark[]>([]);
  const [semanticRelated, setSemanticRelated] = useState<SemanticBookmark[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const prevQueryRef = useRef("");

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

  // 시맨틱 검색: 검색어 변경 시 실행
  useEffect(() => {
    if (!query.trim() || query === prevQueryRef.current) return;

    prevQueryRef.current = query;
    setSemanticExact([]);
    setSemanticRelated([]);
    setSemanticLoading(true);

    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch("/api/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, userId: user.id }),
        });
        const json = await res.json();

        if (json.success) {
          setSemanticExact(json.data.exact);
          setSemanticRelated(json.data.related);
        }
      } catch (e) {
        console.error("[SemanticSearch] 오류:", e);
      } finally {
        setSemanticLoading(false);
      }
    };

    run();
  }, [query]);

  // 검색어 없으면 시맨틱 결과 초기화
  useEffect(() => {
    if (!query.trim()) {
      setSemanticExact([]);
      setSemanticRelated([]);
      prevQueryRef.current = "";
    }
  }, [query]);

  const keywordFiltered = useMemo(
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

  const keywordFilteredIds = useMemo(
    () => new Set(keywordFiltered.map((b) => b.id)),
    [keywordFiltered]
  );

  const deduplicatedExact = useMemo(
    () => semanticExact.filter((r) => !keywordFilteredIds.has(r.id)),
    [semanticExact, keywordFilteredIds]
  );

  const deduplicatedRelated = useMemo(
    () => semanticRelated.filter((r) => !keywordFilteredIds.has(r.id)),
    [semanticRelated, keywordFilteredIds]
  );

  const showSemanticSection = !!query.trim();

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

        {/* 키워드 검색 섹션 */}
        {query && (
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">키워드 검색 결과</h2>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        )}

        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          {keywordFiltered.length}개의 북마크
        </p>

        <BookmarkList
          bookmarks={keywordFiltered}
          onBookmarkClick={handleBookmarkClick}
          onTagClick={handleTagClick}
        />

        {/* 시맨틱 검색 섹션 */}
        {showSemanticSection && (
          <SemanticResultSection
            exact={deduplicatedExact}
            related={deduplicatedRelated}
            isLoading={semanticLoading}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={handleTagClick}
          />
        )}
      </main>
    </div>
  );
}
