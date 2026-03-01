import OpenAI from "openai";

export interface AIAnalysisResult {
  summary: string;
  tags: string[];
}

/**
 * @description 서버 사이드 전용 AI 분석 서비스 (OpenAI)
 */
export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyze(title: string, description: string): Promise<AIAnalysisResult> {
    try {
      const prompt = `
        당신은 전문적인 지식 큐레이터입니다. 다음 웹사이트 정보를 바탕으로 핵심 내용을 요약하고 관련 태그를 추출해주세요.
        사이트 제목: ${title}
        사이트 설명: ${description}
        [요구사항]
        1. 요약(summary)은 한국어로 3줄 이내로 작성하세요.
        2. 태그(tags)는 최대 5개까지 키워드만 배열 형식으로 작성하세요.
        3. 반드시 JSON 형식으로만 응답하세요.
        {
          "summary": "...",
          "tags": ["...", "..."]
        }
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(completion.choices[0].message.content || "{}");

      return {
        summary: response.summary || "",
        tags: response.tags || [],
      };
    } catch (error) {
      console.error("[AIService] 분석 실패:", error);
      return { summary: "분석 실패", tags: [] };
    }
  }
}

export const aiService = new AIService();
