import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { cookies } from "next/headers";
import { getErrorMessage } from "@/shared/lib/error";
import { rateLimit, getClientIp } from "@/shared/lib/rateLimit";
import { GUEST_COOKIE } from "@/shared/lib/guestCookie";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    const rl = rateLimit(`embed:${getClientIp(request)}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { title, summary } = await request.json();

    const text = [title, summary].filter(Boolean).join(" ");

    if (!text.trim()) {
      return NextResponse.json(
        { success: false, message: "임베딩할 텍스트가 없습니다." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: "user" },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 3072,
    } as Parameters<typeof model.embedContent>[0]);

    return NextResponse.json({
      success: true,
      data: { embedding: result.embedding.values },
    });
  } catch (error: unknown) {
    console.error("[API Embed] 오류:", error);
    return NextResponse.json(
      {
        success: false,
        message: "임베딩 생성 중 오류가 발생했습니다.",
        details: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
