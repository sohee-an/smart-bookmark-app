import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const aiAnalysisSchema = z.object({
  title: z.string().trim().min(1).nullable().optional(),
  summary: z.string().trim().min(1, "AI 요약 결과가 비어 있습니다."),
  tags: z.array(z.string().trim().min(1)).catch([]),
});

export type AnalyzeBookmarkInput = {
  title?: string | null;
  description?: string | null;
  bodyChunks?: string[] | null;
};

export type AnalyzeBookmarkResult = {
  title: string | null;
  summary: string;
  tags: string[];
};

function buildAnalysisPrompt({ title, description, bodyChunks }: AnalyzeBookmarkInput) {
  const bodyText = bodyChunks ? bodyChunks.join(" ") : "";

  return `
당신은 전문적인 지식 큐레이터입니다. 다음 정보를 분석해 한국어 JSON 형식으로 응답하세요.

제목: ${title || "(없음)"}
설명: ${description || "(없음)"}
본문: ${bodyText.slice(0, 2000)}

[요구사항]
- 반드시 JSON 형식으로만 응답하세요.
- title이 "(없음)"이면 본문을 보고 적절한 제목을 생성하고, 있으면 null을 반환하세요.
- 형식: { "title": "생성된제목 또는 null", "summary": "3줄요약", "tags": ["태그1", "태그2"] }
    `;
}

function extractJsonObject(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI 응답에서 JSON 객체를 찾을 수 없습니다.");
  }

  return JSON.parse(jsonMatch[0]);
}

export function parseAiAnalysisResponse(text: string): AnalyzeBookmarkResult {
  const parsed = aiAnalysisSchema.parse(extractJsonObject(text));

  return {
    title: parsed.title ?? null,
    summary: parsed.summary,
    tags: Array.from(new Set(parsed.tags)).slice(0, 8),
  };
}

export async function analyzeBookmark(input: AnalyzeBookmarkInput): Promise<AnalyzeBookmarkResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(buildAnalysisPrompt(input));
  return parseAiAnalysisResponse(result.response.text());
}
