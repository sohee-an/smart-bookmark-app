/**
 * 시맨틱 서치 Eval 하네스
 * ------------------------------------------------------------------
 * 목적: 검색 임계값(exact=0.8 / recall=0.65)을 "감"이 아니라
 *       precision / recall 곡선으로 근거화한다.
 *
 * 동작:
 *   1. golden-set.json의 각 query를 Gemini로 임베딩 (검색과 동일 모델/차원)
 *   2. match_bookmarks RPC를 threshold=0 으로 호출 → 채점된 후보 전량 회수
 *   3. 사람이 라벨한 relevantUrls 대비 threshold를 0.50→0.90 스윕하며
 *      macro precision / recall / F1 을 계산
 *   4. 표로 출력 → 어느 임계값이 정확/연관 경계로 타당한지 눈으로 확인
 *
 * 실행:
 *   cd apps/web
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   GEMINI_API_KEY=... \
 *   pnpm dlx tsx scripts/semantic-eval/run.ts
 *
 * 주의: service role 키로 RLS를 우회해 읽기 전용 채점만 한다. 로컬/CI 전용.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

type GoldenCase = { query: string; relevantUrls: string[] };
type GoldenSet = { evalUserId: string; cases: GoldenCase[] };
type MatchRow = { url: string; title: string | null; similarity: number };

const THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 필요합니다.`);
  return v;
}

async function embedQuery(genAI: GoogleGenerativeAI, query: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text: query }], role: "user" },
    taskType: TaskType.RETRIEVAL_QUERY,
    outputDimensionality: 3072,
  } as Parameters<typeof model.embedContent>[0]);
  return result.embedding.values;
}

/** 단일 케이스: threshold별 예측 집합을 뽑아 정밀도/재현율 계산 재료를 만든다. */
function scoreCase(rows: MatchRow[], relevant: Set<string>) {
  return THRESHOLDS.map((t) => {
    const predicted = rows.filter((r) => r.similarity >= t);
    const hit = predicted.filter((r) => relevant.has(r.url)).length;
    const precision = predicted.length === 0 ? null : hit / predicted.length;
    const recall = relevant.size === 0 ? null : hit / relevant.size;
    return { t, precision, recall, predictedCount: predicted.length, hit };
  });
}

function mean(nums: (number | null)[]): number | null {
  const xs = nums.filter((n): n is number => n !== null);
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fmt(n: number | null): string {
  return n === null ? "  -  " : n.toFixed(3);
}

async function main() {
  const golden = JSON.parse(readFileSync(join(__dirname, "golden-set.json"), "utf-8")) as GoldenSet;

  if (!golden.evalUserId || golden.evalUserId.startsWith("PUT-")) {
    throw new Error("golden-set.json 의 evalUserId 를 실제 테스트 유저 UUID로 채우세요.");
  }

  const genAI = new GoogleGenerativeAI(env("GEMINI_API_KEY"));
  const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

  // 케이스별 threshold 스윕 결과 누적
  const perThreshold = THRESHOLDS.map((t) => ({
    t,
    precisions: [] as (number | null)[],
    recalls: [] as (number | null)[],
  }));

  for (const c of golden.cases) {
    const embedding = await embedQuery(genAI, c.query);
    const { data, error } = await supabase.rpc("match_bookmarks", {
      query_embedding: embedding,
      p_user_id: golden.evalUserId,
      match_threshold: 0, // 전량 회수 후 오프라인 스윕
      match_count: 1000,
      p_tags: null,
    });
    if (error) throw error;

    const rows = (data ?? []) as MatchRow[];
    const relevant = new Set(c.relevantUrls);
    const scored = scoreCase(rows, relevant);

    console.log(`\n■ "${c.query}"  (라벨 정답 ${relevant.size}개, 회수 후보 ${rows.length}개)`);
    console.log("   thr  precision  recall  예측수  적중");
    for (const s of scored) {
      console.log(
        `  ${s.t.toFixed(2)}   ${fmt(s.precision)}    ${fmt(s.recall)}    ${String(
          s.predictedCount
        ).padStart(4)}   ${s.hit}`
      );
    }
    scored.forEach((s, i) => {
      perThreshold[i].precisions.push(s.precision);
      perThreshold[i].recalls.push(s.recall);
    });
  }

  console.log("\n════════ 전체 평균 (macro) ════════");
  console.log("  thr   precision  recall    F1");
  for (const p of perThreshold) {
    const mp = mean(p.precisions);
    const mr = mean(p.recalls);
    const f1 = mp !== null && mr !== null && mp + mr > 0 ? (2 * mp * mr) / (mp + mr) : null;
    console.log(`  ${p.t.toFixed(2)}   ${fmt(mp)}    ${fmt(mr)}   ${fmt(f1)}`);
  }
  console.log(
    "\n해석: precision이 급락하기 직전 지점이 'exact(정확)' 경계 후보다.\n" +
      "현재 코드값 0.8(정확)·0.65(연관)이 이 곡선과 맞는지 검증하고,\n" +
      "어긋나면 근거와 함께 조정한다."
  );
}

main().catch((e) => {
  console.error("[semantic-eval] 실패:", e);
  process.exit(1);
});
