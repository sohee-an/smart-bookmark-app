// 나이틀리 재검증. 재검증 필요한 시나리오만 돌리고(E2E, 실제 AI 포함) 날짜별 보고서를 남긴다.
//
// 흔들림 규칙: 실제 AI처럼 외부에 달린 검사는 코드가 그대로여도 가끔 실패한다(2026-10-14 첫날 4회 중 1회).
//  - 1차 실패하면 그 시나리오만 한 번 더 돌린다 (--retry-live)
//  - 그래도 실패하면 "오늘 실패"로 적고, 직전 보고서에서도 실패였으면 "연속 실패"로 올린다
//  - 종료 코드는 연속 실패가 있을 때만 1이다. 하루 실패는 보고서에만 남긴다
//
// 사용: node scripts/qa/nightly.mjs [--no-live] [--no-e2e]
// 산출: qa-knowledge/reports/YYYY-MM-DD.md (사람이 읽는 보고서), 같은 이름 .json (기계용), stdout에 요약
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KDIR, ROOT, gitInfo, loadConfig, loadFacts, loadScenarios, statusOf } from "./lib.mjs";

const args = process.argv.slice(2);
const noLive = args.includes("--no-live");
const noE2e = args.includes("--no-e2e");
const cfg = loadConfig();
const scenarios = loadScenarios();
const reportsDir = path.join(KDIR, "reports");
mkdirSync(reportsDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const LABEL = {
  fresh: "통과",
  stale: "재검증 필요",
  failing: "실패",
  unverified: "미검증",
  hold: "보류",
};

const qa = (...a) =>
  spawnSync(process.execPath, [path.join(ROOT, "scripts/qa/qa.mjs"), ...a], {
    cwd: ROOT,
    encoding: "utf8",
  });

const snapshot = () => {
  const facts = loadFacts();
  return Object.fromEntries(scenarios.map((sc) => [sc.id, statusOf(sc, cfg, facts)]));
};

const before = snapshot();
const toRun = Object.entries(before)
  .filter(([, r]) => r.status === "stale" || r.status === "failing")
  .map(([id]) => id);

// 1. 재검증
const flags = [...(noE2e ? [] : ["--e2e"]), ...(noLive ? [] : ["--live"])];
let log = "";
if (toRun.length) {
  const r = qa("recheck", ...flags);
  log += r.stdout + r.stderr;
}

// 2. 외부 의존 검사가 실패했으면 한 번만 더 (흔들림인지 진짜인지 가르기 위해)
let after = snapshot();
const retried = [];
for (const [id, r] of Object.entries(after)) {
  const sc = scenarios.find((s) => s.id === id);
  if (r.status === "failing" && sc.maxAgeDays && !noLive) {
    retried.push(id);
    const rr = qa("recheck", "--scenario", id, ...flags);
    log += rr.stdout + rr.stderr;
  }
}
if (retried.length) after = snapshot();

// 3. 직전 보고서와 비교해 연속 실패를 가른다
const prevFile = readdirSync(reportsDir)
  .filter((f) => f.endsWith(".json") && f < `${today}.json`)
  .sort()
  .at(-1);
const prev = prevFile ? JSON.parse(readFileSync(path.join(reportsDir, prevFile), "utf8")) : null;
const failing = Object.entries(after)
  .filter(([, r]) => r.status === "failing")
  .map(([id]) => id);
const consecutive = failing.filter((id) => prev?.failing?.includes(id));
const flaky = retried.filter((id) => after[id].status === "fresh");
const count = {};
for (const r of Object.values(after)) count[r.status] = (count[r.status] ?? 0) + 1;

const git = gitInfo();
const summary = {
  date: today,
  commit: git.commit,
  branch: git.branch,
  ran: toRun,
  retried,
  flaky,
  failing,
  consecutive,
  count,
  statuses: Object.fromEntries(Object.entries(after).map(([id, r]) => [id, r.status])),
};
writeFileSync(path.join(reportsDir, `${today}.json`), JSON.stringify(summary, null, 2) + "\n");

const row = (id) => {
  const r = after[id];
  const last = r.last ? ` (${r.last.at.slice(0, 16)} ${r.last.branch}@${r.last.commit})` : "";
  return `| ${id} | ${LABEL[r.status]} | ${r.reason}${last} |`;
};
const md = [
  `# QA 나이틀리 ${today}`,
  "",
  `기준: ${git.branch}@${git.commit}${git.dirty ? " (미커밋 변경 포함)" : ""} · 실행 옵션: ${flags.join(" ") || "단위 테스트만"}`,
  "",
  `${Object.entries(count)
    .map(([k, v]) => `${LABEL[k]} ${v}`)
    .join(" · ")} (시나리오 ${scenarios.length}개)`,
  "",
  consecutive.length
    ? `## 연속 실패 (어제도 실패, 확인 필요)\n\n${consecutive.map((id) => `- ${id}`).join("\n")}`
    : "## 연속 실패 없음",
  "",
  failing.length
    ? `## 오늘 실패\n\n${failing.map((id) => `- ${id}${flaky.includes(id) ? "" : retried.includes(id) ? " (재시도 후에도 실패)" : ""}`).join("\n")}`
    : "## 오늘 실패 없음",
  "",
  flaky.length
    ? `## 흔들림 (1차 실패, 재시도 통과)\n\n${flaky.map((id) => `- ${id}`).join("\n")}`
    : "",
  "",
  `## 재검증한 시나리오 ${toRun.length}개`,
  "",
  toRun.length
    ? toRun
        .map((id) => `- ${id}: ${LABEL[before[id].status]} → ${LABEL[after[id].status]}`)
        .join("\n")
    : "- 없음 (전부 신선함)",
  "",
  "## 전체 상태",
  "",
  "| 시나리오 | 상태 | 이유 |",
  "| --- | --- | --- |",
  ...scenarios.map((sc) => row(sc.id)),
  "",
  "<details><summary>실행 로그</summary>",
  "",
  "```",
  log
    .replace(/eyJ[A-Za-z0-9._-]+/g, "<jwt>")
    .trim()
    .slice(-6000),
  "```",
  "",
  "</details>",
  "",
]
  .filter((l) => l !== undefined)
  .join("\n");
writeFileSync(path.join(reportsDir, `${today}.md`), md);

console.log(JSON.stringify(summary));
process.exit(consecutive.length ? 1 : 0);
