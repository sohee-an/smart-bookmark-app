import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { cookies } from "next/headers";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    } as any);

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
        details: error.message,
      },
      { status: 500 }
    );
  }
}
