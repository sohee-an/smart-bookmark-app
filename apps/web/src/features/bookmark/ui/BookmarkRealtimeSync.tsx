"use client";

import { useBookmarkRealtime } from "@/features/bookmark/model/useBookmarkRealtime";

export function BookmarkRealtimeSync({ userId }: { userId: string }) {
  useBookmarkRealtime(userId);

  return null;
}
