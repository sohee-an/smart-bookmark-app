// 나이틀리 재검증. 재검증 필요한 시나리오만 돌리고(E2E, 실제 AI 포함) 날짜별 보고서를 남긴다.
//
// 흔들림 규칙: 실제 AI처럼 외부에 달린 검사는 코드가 그대로여도 실패할 수 있다.
//  - 1차 실패하면 그 시나리오만 한 번 더 돌린다
//  - 로컬: 직전 보고서에서도 실패였으면 "연속 실패"로 올리고 종료 코드 1
//  - CI(--ci): 보고만 한다. 근거는 저장소에 남지 않으므로(브랜치 보호) 직전 비교를 하지 않고, 종료 코드는 항상 0.
//    공개 저장소라 보고서에서 private 시나리오를 빼고 실행 로그를 넣지 않는다. 연속 실패 판정은 로컬 장부에서 한다
//
// 사용: node scripts/qa/nightly.mjs [--no-live] [--no-e2e] [--ci]
// 산출: qa-knowledge/reports/YYYY-MM-DD.md, 같은 이름 .json, stdout 마지막 줄에 요약 JSON. --ci면 GITHUB_STEP_SUMMARY에도 쓴다
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { KDIR, ROOT, gitInfo, loadConfig, loadFacts, loadScenarios, statusOf } from "./lib.mjs";

const args = process.argv.slice(2);
const noLive = args.includes("--no-live");
const noE2e = args.includes("--no-e2e");
const ci = args.includes("--ci");
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
// 직전 보고서와 비교해 연속 실패를 가른다 (로컬만. CI는 직전 근거가 저장소에 없어 비교하지 않는다)
const prevFile = ci
  ? null
  : readdirSync(reportsDir)
      .filter((f) => f.endsWith(".json") && f < `${today}.json`)
      .sort()
      .at(-1);
const prev = prevFile ? JSON.parse(readFileSync(path.join(reportsDir, prevFile), "utf8")) : null;
const failing = Object.entries(after)
  .filter(([, r]) => r.status === "failing")
  .map(([id]) => id);
const consecutive = ci ? [] : failing.filter((id) => prev?.failing?.includes(id));
const flaky = retried.filter((id) => after[id].status === "fresh");
const count = {};
for (const r of Object.values(after)) count[r.status] = (count[r.status] ?? 0) + 1;

const isPublic = (id) => !(ci && scenarios.find((sc) => sc.id === id)?.private);
const git = gitInfo();
const summary = {
  date: today,
  commit: git.commit,
  branch: git.branch,
  ran: toRun.filter(isPublic),
  retried,
  flaky,
  failing: failing.filter(isPublic),
  consecutive,
  count,
  statuses: Object.fromEntries(
    Object.entries(after)
      .filter(([id]) => isPublic(id))
      .map(([id, r]) => [id, r.status])
  ),
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
  ci
    ? "## 연속 실패 판정은 로컬 장부에서 (CI는 보고만)"
    : consecutive.length
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
  ...scenarios.filter((sc) => !(ci && sc.private)).map((sc) => row(sc.id)),
  "",
  ...(ci
    ? []
    : [
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
      ]),
  "",
]
  .filter((l) => l !== undefined)
  .join("\n");
writeFileSync(path.join(reportsDir, `${today}.md`), md);

console.log(JSON.stringify(summary));
if (ci && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
process.exit(ci ? 0 : consecutive.length ? 1 : 0);
