import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: generateContentMock };
    }
  },
}));

import { analyzeBookmark, parseAiAnalysisResponse } from "./ai-analysis.service";

function geminiResponse(payload: Record<string, unknown>) {
  return { response: { text: () => JSON.stringify(payload) } };
}

describe("parseAiAnalysisResponse", () => {
  it("마크다운 코드블록 안의 AI JSON 응답을 파싱한다", () => {
    const result = parseAiAnalysisResponse(`
\`\`\`json
{
  "title": "React 성능 최적화",
  "summary": "렌더링 비용을 줄이는 방법",
  "tags": ["React", "성능"]
}
\`\`\`
    `);

    expect(result).toEqual({
      title: "React 성능 최적화",
      summary: "렌더링 비용을 줄이는 방법",
      tags: ["React", "성능"],
    });
  });

  it("title이 없으면 null로 정규화하고 깨진 tags는 빈 배열로 대체한다", () => {
    const result = parseAiAnalysisResponse(
      JSON.stringify({
        summary: "요약만 있는 응답",
        tags: "React",
      })
    );

    expect(result).toEqual({
      title: null,
      summary: "요약만 있는 응답",
      tags: [],
    });
  });

  it("태그 중복을 제거하고 최대 8개까지만 사용한다", () => {
    const result = parseAiAnalysisResponse(
      JSON.stringify({
        title: null,
        summary: "요약",
        tags: ["a", "b", "a", "c", "d", "e", "f", "g", "h", "i"],
      })
    );

    expect(result.tags).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("summary가 없거나 비어 있으면 에러를 던진다", () => {
    expect(() =>
      parseAiAnalysisResponse(
        JSON.stringify({
          title: null,
          tags: ["React"],
        })
      )
    ).toThrow();

    expect(() =>
      parseAiAnalysisResponse(
        JSON.stringify({
          title: null,
          summary: "   ",
          tags: ["React"],
        })
      )
    ).toThrow("AI 요약 결과가 비어 있습니다.");
  });

  it("JSON 객체가 없으면 에러를 던진다", () => {
    expect(() => parseAiAnalysisResponse("요약: JSON 아님")).toThrow(
      "AI 응답에서 JSON 객체를 찾을 수 없습니다."
    );
  });
});

describe("analyzeBookmark 재시도", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Gemini 호출이 일시적으로 실패하면 재시도해 성공 결과를 반환한다", async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error("503 Service Unavailable"))
      .mockResolvedValueOnce(geminiResponse({ title: null, summary: "요약", tags: ["React"] }));

    const result = await analyzeBookmark({ title: "제목" }, { retryDelayMs: 0 });

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ title: null, summary: "요약", tags: ["React"] });
  });

  it("응답이 스키마 검증에 실패해도 재시도로 회복한다", async () => {
    generateContentMock
      .mockResolvedValueOnce(geminiResponse({ title: null, tags: ["React"] })) // summary 누락
      .mockResolvedValueOnce(geminiResponse({ title: null, summary: "복구된 요약", tags: [] }));

    const result = await analyzeBookmark({ title: "제목" }, { retryDelayMs: 0 });

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result.summary).toBe("복구된 요약");
  });

  it("최대 시도 횟수를 초과하면 마지막 에러를 던진다", async () => {
    generateContentMock.mockRejectedValue(new Error("503 Service Unavailable"));

    await expect(
      analyzeBookmark({ title: "제목" }, { maxAttempts: 2, retryDelayMs: 0 })
    ).rejects.toThrow("503 Service Unavailable");
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });
});
