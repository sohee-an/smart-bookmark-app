import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { cookies } from "next/headers";
import { getErrorMessage } from "@/shared/lib/error";
import { analyzeBookmark } from "@/server/services/ai-analysis.service";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const isGuest = cookieStore.get("is_guest")?.value === "true";

    if (!user && !isGuest) {
      return NextResponse.json({ success: false, message: "인증이 필요합니다." }, { status: 401 });
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
