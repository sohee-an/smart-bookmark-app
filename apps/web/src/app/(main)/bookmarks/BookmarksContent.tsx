"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkDetailPanel } from "@/entities/bookmark/ui/BookmarkDetailPanel";
import { AddToCollectionButton } from "@/features/collection/ui/AddToCollectionButton";
import { FEATURES } from "@/shared/config/features";
import { TagFilter } from "@/features/bookmark/ui/TagFilter";
import { BookmarkList } from "@/features/bookmark/ui/BookmarkList";
import { SemanticResultSection } from "@/features/bookmark/ui/SemanticResultSection";
import { filterBookmarks } from "@/features/bookmark/model/filterBookmarks";
import { bookmarkService } from "@/features/bookmark/model/bookmark.service";
import { rankBySimilarity } from "@/features/bookmark/lib/semantic";
import {
  getGuestSemanticRemaining,
  recordGuestSemantic,
} from "@/features/bookmark/model/guestSemanticLimit";
import {
  useBookmarks,
  useUpdateBookmark,
  useDeleteBookmark,
} from "@/features/bookmark/model/queries";
import { useBookmarkStore } from "@/entities/bookmark/model/useBookmarkStore";
import { supabase } from "@/shared/api/supabase/client";
import { ErrorState } from "@/shared/ui/ErrorState";
import { toast } from "@/shared/lib/toast";
import type { Bookmark } from "@/entities/bookmark/model/types";
import { X } from "lucide-react";

interface SemanticBookmark extends Bookmark {
  similarity: number;
}

function buildBookmarksUrl(tags: string[], q?: string): string {
  const sp = new URLSearchParams();
  tags.forEach((t) => sp.append("tag", t));
  if (q) sp.set("q", q);
  const qs = sp.toString();
  return `/bookmarks${qs ? `?${qs}` : ""}`;
}

// isGuest는 서버(page)에서 판정해 내려받는다 — 클라이언트 재판정 금지
export function BookmarksContent({ isGuest }: { isGuest: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedBookmarkId, setSelectedBookmarkId } = useBookmarkStore();
  const { data: bookmarks = [], isError, refetch } = useBookmarks();
  const { mutate: updateBookmark, mutateAsync: updateBookmarkAsync } = useUpdateBookmark();
  const { mutateAsync: deleteBookmarkAsync } = useDeleteBookmark();

  const [semanticExact, setSemanticExact] = useState<SemanticBookmark[]>([]);
  const [semanticRelated, setSemanticRelated] = useState<SemanticBookmark[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [showGuestBanner, setShowGuestBanner] = useState(isGuest);
  // 비회원 AI 의미 검색: 하루 남은 횟수, 한도 도달, 임베딩이 빠진 북마크 수(이 기능 전에 저장한 것)
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [guestMissingCount, setGuestMissingCount] = useState(0);
  const [backfilling, setBackfilling] = useState(false);
  // 임베딩을 채운 뒤 같은 검색어로 다시 비교하기 위한 신호
  const [guestIndexVersion, setGuestIndexVersion] = useState(0);
  // 검색 effect가 목록 변경마다 다시 돌지 않도록 최신 목록은 ref로 읽는다
  const bookmarksRef = useRef<Bookmark[]>([]);
  // 비회원: 마지막 검색어의 임베딩. 같은 검색어로 태그만 바꾸거나 다시 비교할 때 서버를 다시 부르지 않는다 (횟수도 안 깎임)
  const guestQueryRef = useRef<{ query: string; embedding: number[] } | null>(null);

  const query = searchParams.get("q") ?? "";
  const selectedTags = useMemo(() => searchParams.getAll("tag"), [searchParams]);
  // 비회원은 목록이 늦게 읽혀도 다시 비교할 수 있게 개수를 effect 조건에 넣는다 (서버 호출은 검색어가 같으면 없다)
  const guestBookmarkCount = isGuest ? bookmarks.length : 0;

  const selectedBookmark = bookmarks.find((b) => b.id === selectedBookmarkId) ?? null;

  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  useEffect(() => {
    if (isGuest) setGuestRemaining(getGuestSemanticRemaining());
  }, [isGuest]);

  useEffect(() => {
    if (!query.trim()) return;

    setSemanticExact([]);
    setSemanticRelated([]);
    setSemanticLoading(true);

    const controller = new AbortController();
    const aborted = () => controller.signal.aborted;

    // 비회원: 서버는 검색어 임베딩만 주고, 브라우저에 저장된 임베딩과 유사도를 여기서 계산한다
    const runGuest = async () => {
      const embeddings = await bookmarkService.getGuestEmbeddings();
      if (aborted()) return;
      const missing = bookmarksRef.current.filter(
        (b) => b.aiStatus === "completed" && !embeddings[b.id]
      ).length;
      setGuestMissingCount(missing);
      // 비교할 임베딩이 하나도 없으면 서버를 부르지 않는다 (횟수도 안 깎는다). 화면은 채우기 버튼을 보여 준다
      if (Object.keys(embeddings).length === 0) return;

      let queryEmbedding =
        guestQueryRef.current?.query === query ? guestQueryRef.current.embedding : null;
      if (!queryEmbedding) {
        if (getGuestSemanticRemaining() <= 0) {
          setGuestLimitReached(true);
          return;
        }
        const res = await fetch("/api/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (aborted()) return;
        if (!json.success || json.data?.mode !== "guest") {
          toast.show({
            message:
              res.status === 429
                ? "AI 검색 요청이 많아요. 잠시 후 다시 시도해주세요."
                : "AI 검색에 실패했어요. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        // 성공했을 때만 한 번 쓴 것으로 센다
        recordGuestSemantic();
        setGuestRemaining(getGuestSemanticRemaining());
        queryEmbedding = json.data.queryEmbedding as number[];
        guestQueryRef.current = { query, embedding: queryEmbedding };
      }

      // 회원과 같은 태그 조건: 선택한 태그 중 하나라도 가진 북마크만
      const candidates =
        selectedTags.length > 0
          ? bookmarksRef.current.filter((b) => b.tags.some((t) => selectedTags.includes(t)))
          : bookmarksRef.current;
      const { exact, related } = rankBySimilarity(candidates, embeddings, queryEmbedding);
      setSemanticExact(exact);
      setSemanticRelated(related);
    };

    const run = async () => {
      try {
        // 게이트 용도라 로컬 세션 확인으로 충분 (네트워크 왕복 없음) — 실제 인증은 API Route가 getUser()로 검증
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (aborted()) return;
        if (!session) {
          if (isGuest) await runGuest();
          return;
        }

        const res = await fetch("/api/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, tags: selectedTags }),
          signal: controller.signal,
        });
        const json = await res.json();
        // 늦게 도착한 이전 검색어의 응답은 버린다 (취소 신호와 상관없이 응답이 오는 경우)
        if (aborted()) return;

        if (json.success) {
          setSemanticExact(json.data.exact);
          setSemanticRelated(json.data.related);
        } else if (res.status === 429 && json.code === "DAILY_LIMIT_EXCEEDED") {
          toast.show({ message: json.message ?? "오늘 AI 의미 검색 20회를 모두 썼어요." });
        } else if (res.status !== 401) {
          toast.show({ message: "AI 검색에 실패했어요. 잠시 후 다시 시도해주세요." });
        }
      } catch (e) {
        if (aborted()) return;
        console.error("[SemanticSearch] 오류:", e);
        toast.show({ message: "AI 검색에 실패했어요. 잠시 후 다시 시도해주세요." });
      } finally {
        if (!aborted()) setSemanticLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [query, selectedTags, isGuest, guestIndexVersion, guestBookmarkCount]);

  // 비회원: 임베딩이 빠진 북마크를 제목과 요약으로 채운다. 하루 검색 횟수는 쓰지 않는다
  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const embeddings = await bookmarkService.getGuestEmbeddings();
      const targets = bookmarksRef.current.filter(
        (b) => b.aiStatus === "completed" && !embeddings[b.id]
      );
      let failed = 0;
      // 비회원은 최대 20개라 하나씩 보낸다 (임베딩 API는 IP당 분당 30회 제한)
      for (const b of targets) {
        try {
          const res = await fetch("/api/embed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: b.title, summary: b.summary }),
          });
          const json = await res.json();
          if (json.success) await bookmarkService.saveEmbedding(b.id, json.data.embedding);
          else failed++;
        } catch {
          failed++;
        }
      }
      if (failed > 0)
        toast.show({
          message: `북마크 ${failed}개는 준비하지 못했어요. 잠시 후 다시 시도해주세요.`,
        });
    } finally {
      setBackfilling(false);
      setGuestIndexVersion((v) => v + 1);
    }
  };

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
      updateBookmark({ id: bookmark.id, data: { status: "read" } });
    }
  };

  const handlePanelSave = async (id: string, data: Pick<Bookmark, "title" | "tags">) => {
    await updateBookmarkAsync({ id, data });
  };

  const handlePanelDelete = async (id: string) => {
    await deleteBookmarkAsync(id);
    setSelectedBookmarkId(null);
  };

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) return;
    setSelectedBookmarkId(null);
    const next = [...selectedTags, tag];
    router.push(buildBookmarksUrl(next, query || undefined));
  };

  const handleTagRemove = (tag: string) => {
    const next = selectedTags.filter((t) => t !== tag);
    router.replace(buildBookmarksUrl(next, query || undefined));
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
      {showGuestBanner && (
        <div className="bg-brand-primary/10 border-brand-primary/20 dark:bg-brand-primary/5 border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              지금은 최대 <span className="text-brand-primary font-bold">20개</span>까지 저장할 수
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

      <BookmarkDetailPanel
        bookmark={selectedBookmark}
        onSave={handlePanelSave}
        onDelete={handlePanelDelete}
        onTagClick={handleTagClick}
        actions={
          FEATURES.collections && selectedBookmark ? (
            <AddToCollectionButton bookmarkId={selectedBookmark.id} />
          ) : undefined
        }
      />

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

        {isError ? (
          <ErrorState
            title="북마크를 불러오지 못했어요"
            description="네트워크 문제일 수 있어요. 다시 시도해 주세요."
            onRetry={() => refetch()}
            className="py-20"
          />
        ) : (
          <>
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
                guestRemaining={guestRemaining}
                guestLimitReached={guestLimitReached}
                guestMissingCount={guestMissingCount}
                onBackfill={handleBackfill}
                backfilling={backfilling}
                onBookmarkClick={handleBookmarkClick}
                onTagClick={handleTagClick}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
