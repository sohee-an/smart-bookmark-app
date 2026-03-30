"use client";

import { useAuthStore } from "@/shared/model/useAuthStore";
import { BookmarkRealtimeSync } from "./BookmarkRealtimeSync";

/**
 * 인증된 유저에게만 BookmarkRealtimeSync를 마운트한다.
 * /landing, /login 등 비인증 페이지에서 불필요한 WebSocket 연결을 막는다.
 */
export function ConditionalRealtimeSync() {
  const { user, initialized } = useAuthStore();

  if (!initialized || !user) return null;

  return <BookmarkRealtimeSync />;
}
