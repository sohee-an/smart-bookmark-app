import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { TagFilter } from "@/features/bookmark/ui/TagFilter";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { SemanticResultSection } from "@/features/bookmark/ui/SemanticResultSection";
import { filterBookmarks } from "@/features/bookmark/model/filterBookmarks";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import { supabase } from "@/shared/api/supabase/client";
import storage from "@/shared/lib/storage";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { X } from "lucide-react";

interface SemanticBookmark extends Bookmark {
  similarity: number;
}

export default function BookmarksPage() {
  const router = useRouter();
  const { bookmarks, setBookmarks, setSelectedBookmarkId, updateBookmark } = useBookmarkStore();

  const [semanticExact, setSemanticExact] = useState<SemanticBookmark[]>([]);
  const [semanticRelated, setSemanticRelated] = useState<SemanticBookmark[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showGuestBanner, setShowGuestBanner] = useState(false);

  const query = (router.query.q as string) ?? "";
  const selectedTags = useMemo(() => {
    const raw = router.query.tag;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }, [router.query.tag]);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const guest = !user && storage.cookie.get("is_guest") === "true";
      setIsGuest(guest);
      if (guest) setShowGuestBanner(true);
    };
    check();
  }, []);

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

  // 시맨틱 검색: 검색어 또는 태그 변경 시 실행
  useEffect(() => {
    if (!query.trim()) return;

    setSemanticExact([]);
    setSemanticRelated([]);
    setSemanticLoading(true);

    const run = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSemanticLoading(false);
          return;
        }

        const res = await fetch("/api/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, userId: user.id, tags: selectedTags }),
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
  }, [query, selectedTags]);

  // 검색어 없으면 시맨틱 결과 초기화
  useEffect(() => {
    if (!query.trim()) {
      setSemanticExact([]);
      setSemanticRelated([]);
    }
  }, [query]);

  const keywordFiltered = useMemo(
    () => filterBookmarks(bookmarks, selectedTags, query),
    [bookmarks, selectedTags, query]
  );

  const handleBookmarkClick = (bookmark: Bookmark) => {
    setSelectedBookmarkId(bookmark.id);
    if (bookmark.status === "unread") {
      bookmarkService.updateBookmark(bookmark.id, { status: "read" });
      updateBookmark(bookmark.id, { status: "read" });
    }
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
    <div className="selection:bg-brand-primary/20 selection:text-brand-primary min-h-screen bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Head>
        <title>북마크 검색 — SmartMark</title>
      </Head>

      <Header />

      {/* 게스트 유저 로그인 유도 배너 */}
      {showGuestBanner && (
        <div className="bg-brand-primary/10 border-brand-primary/20 dark:bg-brand-primary/5 border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              지금은 최대 <span className="text-brand-primary font-bold">5개</span>까지 저장할 수
              있어요. 로그인하면 북마크를 무제한으로 저장하고 AI 검색도 사용할 수 있어요.
            </p>
            <div className="flex flex-none items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="bg-brand-primary hover:bg-brand-primary-hover rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setShowGuestBanner(false)}
                className="text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

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

        {showSemanticSection && (
          <SemanticResultSection
            exact={deduplicatedExact}
            related={deduplicatedRelated}
            isLoading={semanticLoading}
            isGuest={isGuest}
            onBookmarkClick={handleBookmarkClick}
            onTagClick={handleTagClick}
          />
        )}
      </main>
    </div>
  );
}
