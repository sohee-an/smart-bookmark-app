import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { title, summary } = req.body;

    const text = [title, summary].filter(Boolean).join(" ");

    if (!text.trim()) {
      return res.status(400).json({ success: false, message: "임베딩할 텍스트가 없습니다." });
    }

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: "user" },
      taskType: "RETRIEVAL_DOCUMENT",
    });

    return res.status(200).json({
      success: true,
      data: { embedding: result.embedding.values },
    });
  } catch (error: any) {
    console.error("[API Embed] 오류:", error);
    return res.status(500).json({
      success: false,
      message: "임베딩 생성 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
}
