import { describe, expect, it } from "vitest";
import { parseAiAnalysisResponse } from "./ai-analysis.service";

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
