import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { cookies } from "next/headers";
import { getErrorMessage } from "@/shared/lib/error";
import { analyzeBookmark } from "@/server/services/ai-analysis.service";
import { rateLimit, getClientIp } from "@/shared/lib/rateLimit";
import { GUEST_COOKIE } from "@/shared/lib/guestCookie";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const isGuest = cookieStore.get(GUEST_COOKIE)?.value === "true";

    if (!user && !isGuest) {
      return NextResponse.json({ success: false, message: "인증이 필요합니다." }, { status: 401 });
    }

    // IP 단위 rate limit — 비인증 남용을 통한 Gemini 과금 DoS 방어
    const rl = rateLimit(`ai-analyze:${getClientIp(request)}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const data = await analyzeBookmark(await request.json());

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("[API AI Analyze] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: "AI 분석 중 예기치 않은 오류가 발생했습니다.",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
