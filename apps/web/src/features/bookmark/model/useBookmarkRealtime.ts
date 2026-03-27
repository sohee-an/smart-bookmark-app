"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/shared/api/supabase/client";
import { bookmarkKeys } from "./queries";

/**
 * Supabase Realtime으로 bookmarks 테이블 변경을 구독.
 * ai_status가 바뀌면 (익스텐션 저장 후 파이프라인 완료 등) TanStack Query 캐시를 자동 갱신.
 */
export function useBookmarkRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("bookmark-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // 변경된 row로 캐시 즉시 업데이트
          queryClient.setQueriesData<any[]>({ queryKey: bookmarkKeys.all }, (old = []) =>
            old.map((b) =>
              b.id === payload.new.id
                ? {
                    ...b,
                    title: payload.new.title ?? b.title,
                    summary: payload.new.summary ?? b.summary,
                    aiStatus: payload.new.ai_status ?? b.aiStatus,
                    thumbnailUrl: payload.new.thumbnail_url ?? b.thumbnailUrl,
                  }
                : b
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // 다른 기기/익스텐션에서 새 북마크 추가 시 전체 갱신
          queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
