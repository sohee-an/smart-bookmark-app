import { describe, expect, it } from "vitest";
import type { Bookmark } from "@/entities/bookmark/model/types";
import {
  SEMANTIC_EXACT_THRESHOLD,
  SEMANTIC_MATCH_COUNT,
  cosineSimilarity,
  decodeEmbedding,
  encodeEmbedding,
  rankBySimilarity,
} from "./semantic";

const bookmark = (id: string): Bookmark =>
  ({
    userId: "guest",
    id,
    url: `https://example.com/${id}`,
    title: id,
    summary: "",
    tags: [],
    aiStatus: "completed",
    status: "unread",
    createdAt: "2026-10-14T00:00:00.000Z",
    updatedAt: "2026-10-14T00:00:00.000Z",
  }) as Bookmark;

// 검색어 벡터 [1, 0]과의 코사인 유사도가 정확히 s가 되는 2차원 벡터
const withSimilarity = (s: number) => [s, Math.sqrt(1 - s * s)];

describe("cosineSimilarity", () => {
  it("같은 방향이면 1, 직교하면 0", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("길이가 다르거나 0벡터면 0", () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });
});

describe("encodeEmbedding / decodeEmbedding", () => {
  it("Float32 정밀도 안에서 원래 값으로 돌아온다", () => {
    const values = [0.123456, -0.5, 1, 0];
    const decoded = Array.from(decodeEmbedding(encodeEmbedding(values)));
    decoded.forEach((v, i) => expect(v).toBeCloseTo(values[i], 5));
  });
});

describe("rankBySimilarity — 비회원 시맨틱 검색 분리", () => {
  const query = [1, 0];

  it("0.8 이상은 정확한 결과, 0.65 이상 0.8 미만은 연관된 결과, 0.65 미만은 뺀다", () => {
    const embeddings = {
      a: encodeEmbedding(withSimilarity(0.9)),
      // 저장할 때 Float32로 줄여서 정확히 0.8은 0.79999…가 된다 (pgvector도 Float32라 서버도 같다).
      // 그래서 경계 바로 위 값으로 확인한다. 정확한 경계 분기는 route.test.ts가 서버 값으로 확인한다
      b: encodeEmbedding(withSimilarity(SEMANTIC_EXACT_THRESHOLD + 0.001)),
      c: encodeEmbedding(withSimilarity(0.7)),
      d: encodeEmbedding(withSimilarity(0.6)),
    };
    const { exact, related } = rankBySimilarity(
      ["a", "b", "c", "d"].map(bookmark),
      embeddings,
      query
    );

    expect(exact.map((b) => b.id)).toEqual(["a", "b"]);
    expect(related.map((b) => b.id)).toEqual(["c"]);
  });

  it("임베딩이 없는 북마크(이 기능 전에 저장한 것)는 결과에 나오지 않는다", () => {
    const { exact, related } = rankBySimilarity(
      [bookmark("old"), bookmark("new")],
      { new: encodeEmbedding(withSimilarity(0.95)) },
      query
    );
    expect([...exact, ...related].map((b) => b.id)).toEqual(["new"]);
  });

  it(`결과는 유사도 높은 순으로 최대 ${SEMANTIC_MATCH_COUNT}개`, () => {
    const ids = Array.from({ length: 15 }, (_, i) => `b${i}`);
    const embeddings = Object.fromEntries(
      ids.map((id, i) => [id, encodeEmbedding(withSimilarity(0.66 + i * 0.02))])
    );
    const { exact, related } = rankBySimilarity(ids.map(bookmark), embeddings, query);
    const all = [...exact, ...related];

    expect(all).toHaveLength(SEMANTIC_MATCH_COUNT);
    expect(all[0].id).toBe("b14");
  });
});
