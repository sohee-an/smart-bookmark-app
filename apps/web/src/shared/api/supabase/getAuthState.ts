import { cache } from "react";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import { GUEST_COOKIE } from "@/shared/lib/guestCookie";

// 유저/게스트 판정의 단일 소유자 — layout과 page가 같은 요청에서 중복 호출해도 cache()로 1회만 실행된다.
// 클라이언트 컴포넌트는 이 값을 prop으로 받아 그대로 신뢰한다 (클라이언트 재판정 금지).
export const getAuthState = cache(async (): Promise<{ user: User | null; isGuest: boolean }> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const isGuest = !user && cookieStore.get(GUEST_COOKIE)?.value === "true";
  return { user, isGuest };
});
