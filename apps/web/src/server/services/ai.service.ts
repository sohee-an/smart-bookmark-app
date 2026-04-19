import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";

// 1. 클라이언트 초기화 (v1 api를 명시적으로 호출하여 404 방지)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { title, description, bodyChunks } = req.body;
    const bodyText = bodyChunks ? bodyChunks.join(" ") : "";

    // 2. 모델 설정 (하드코딩된 경로와 apiVersion으로 안정성 확보)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

    const prompt = `
당신은 전문적인 지식 큐레이터입니다. 다음 정보를 분석해 한국어 JSON 형식으로 응답하세요.

제목: ${title || "(없음)"}
설명: ${description || "(없음)"}
본문: ${bodyText.slice(0, 2000)}

[요구사항]
- 반드시 JSON 형식으로만 응답하세요.
- 형식: { "title": "생성된제목", "summary": "3줄요약", "tags": ["태그1", "태그2"] }
    `;

    // 3. 콘텐츠 생성
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 4. JSON 추출 (마크다운 기호 제거 및 파싱)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "JSON 파싱 실패" };

    return res.status(200).json(data);
  } catch (error: unknown) {
    console.error("AI 분석 실패:", error);
    return res.status(500).json({
      error: "AI 생성 실패",
      details: error.message,
    });
  }
}
