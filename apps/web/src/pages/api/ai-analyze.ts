import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { title, description, bodyChunks } = req.body;
    const bodyText = bodyChunks ? bodyChunks.join(" ") : "";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
당신은 전문적인 지식 큐레이터입니다. 다음 정보를 분석해 한국어 JSON 형식으로 응답하세요.

제목: ${title || "(없음)"}
설명: ${description || "(없음)"}
본문: ${bodyText.slice(0, 2000)}

[요구사항]
- 반드시 JSON 형식으로만 응답하세요.
- title이 "(없음)"이면 본문을 보고 적절한 제목을 생성하고, 있으면 null을 반환하세요.
- 형식: { "title": "생성된제목 또는 null", "summary": "3줄요약", "tags": ["태그1", "태그2"] }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return res.status(200).json({
      success: true,
      data: {
        title: data.title ?? null,
        summary: data.summary ?? "",
        tags: data.tags ?? [],
      },
    });
  } catch (error: any) {
    console.error("[API AI Analyze] 오류:", error);
    return res.status(500).json({
      success: false,
      message: "AI 분석 중 예기치 않은 오류가 발생했습니다.",
      details: error.message,
    });
  }
}
