"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/shared/api/supabase/client";
import { useBookmarkRealtime } from "@/features/bookmark/model/useBookmarkRealtime";

export function BookmarkRealtimeSync() {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useBookmarkRealtime(userId);

  return null;
}
