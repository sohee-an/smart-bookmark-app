import type { Bookmark } from "@/entities/bookmark/model/types";

// 시맨틱 검색 기준값의 단일 소스. 회원(서버 pgvector)과 비회원(브라우저 계산)이 같은 값을 쓴다.
// 값을 정한 근거: docs/decisions/029-시맨틱-검색-유사도.md
/** 이 값 미만은 결과에서 뺀다 */
export const SEMANTIC_MATCH_THRESHOLD = 0.65;
/** 이 값 이상은 "정확한 결과", 미만은 "연관된 결과" */
export const SEMANTIC_EXACT_THRESHOLD = 0.8;
/** 최대 결과 수 */
export const SEMANTIC_MATCH_COUNT = 10;

export type SemanticBookmark = Bookmark & { similarity: number };

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// 비회원 임베딩은 localStorage에 둔다. 숫자 3072개를 JSON으로 두면 개당 약 60KB라
// Float32 바이트를 base64로 저장한다 (개당 약 16KB, 20개면 약 330KB)
export function encodeEmbedding(values: number[]): string {
  const bytes = new Uint8Array(new Float32Array(values).buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function decodeEmbedding(encoded: string): Float32Array {
  const bin = atob(encoded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

/**
 * 비회원 시맨틱 검색: 검색어 임베딩과 브라우저에 저장된 북마크 임베딩의 유사도로 나눈다.
 * 회원 쪽(match_bookmarks RPC + route의 분리)과 같은 기준값을 쓴다.
 */
export function rankBySimilarity(
  bookmarks: Bookmark[],
  embeddings: Record<string, string>,
  queryEmbedding: number[]
): { exact: SemanticBookmark[]; related: SemanticBookmark[] } {
  const scored = bookmarks
    .filter((b) => embeddings[b.id])
    .map((b) => ({
      ...b,
      similarity: cosineSimilarity(decodeEmbedding(embeddings[b.id]), queryEmbedding),
    }))
    .filter((b) => b.similarity >= SEMANTIC_MATCH_THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, SEMANTIC_MATCH_COUNT);

  return {
    exact: scored.filter((b) => b.similarity >= SEMANTIC_EXACT_THRESHOLD),
    related: scored.filter((b) => b.similarity < SEMANTIC_EXACT_THRESHOLD),
  };
}
