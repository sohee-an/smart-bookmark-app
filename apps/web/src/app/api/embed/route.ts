import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
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
  } catch (error: any) {
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
