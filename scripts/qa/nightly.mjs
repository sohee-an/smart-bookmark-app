// 나이틀리 재검증. 재검증 필요한 시나리오만 돌리고(E2E, 실제 AI 포함) 날짜별 보고서를 남긴다.
//
// 대상: 재검증 필요, 실패, 검사 오류, 아직 안 돈 검증이 남은 "부분 검증", 테스트는 있는데 한 번도 안 돈 "미검증"
//
// 흔들림 규칙: 실제 AI처럼 외부에 달린 검사는 코드가 그대로여도 실패할 수 있다.
//  - 1차 실패한 외부 의존(스크립트) 검사만 한 번 더 돌린다. 여러 개여도 한 번에 묶어서 돌린다 (외부 호출 비용)
//  - 로컬: 오늘 실제로 돌려서 실패했고, 직전 보고서에서도 실패였으면 "연속 실패"로 올리고 종료 코드 1
//  - 검사 오류(환경, 도구)는 제품 실패가 아니라서 연속 실패로 세지 않는다
//  - CI(--ci): 보고만 한다. 근거는 저장소에 남지 않으므로(브랜치 보호) 직전 비교를 하지 않고, 종료 코드는 항상 0.
//    공개 저장소라 보고서에서 private 시나리오를 빼고 실행 로그를 넣지 않는다. 연속 실패 판정은 로컬 장부에서 한다
//
// 사용: node scripts/qa/nightly.mjs [--no-live] [--no-e2e] [--ci]
// 산출: qa-knowledge/reports/YYYY-MM-DD.md, 같은 이름 .json (같은 날 다시 돌리면 -HHMM을 붙인다),
//       stdout 마지막 줄에 요약 JSON. --ci면 GITHUB_STEP_SUMMARY에도 쓴다
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
import {
  KDIR,
  ROOT,
  gitInfo,
  loadConfig,
  loadFacts,
  loadScenarios,
  needsRecheck,
  statusOf,
} from "./lib.mjs";

const args = process.argv.slice(2);
const noLive = args.includes("--no-live");
const noE2e = args.includes("--no-e2e");
const ci = args.includes("--ci");
const cfg = loadConfig();
const scenarios = loadScenarios();
const byId = Object.fromEntries(scenarios.map((sc) => [sc.id, sc]));
const reportsDir = path.join(KDIR, "reports");
mkdirSync(reportsDir, { recursive: true });
const now = new Date();
const today = now.toISOString().slice(0, 10);
const LABEL = {
  fresh: "통과",
  partial: "부분 검증",
  stale: "재검증 필요",
  failing: "실패",
  broken: "검사 오류",
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
const factCount = () => loadFacts().length;

const before = snapshot();
const runnable = (ref) =>
  ref.runner === "vitest" ||
  (ref.runner === "playwright" && !noE2e) ||
  (ref.runner === "script" && !noLive);
const toRun = Object.entries(before)
  .filter(([id, r]) => needsRecheck(r, byId[id]) && byId[id].verifiedBy.some(runnable))
  .map(([id]) => id);

// 1. 재검증 (recheck가 같은 기준으로 대상을 고른다)
const flags = [...(noE2e ? [] : ["--e2e"]), ...(noLive ? [] : ["--live"])];
const startFacts = factCount();
let log = "";
if (toRun.length) {
  const r = qa("recheck", ...flags);
  log += r.stdout + r.stderr;
}

// 2. 외부 의존(스크립트) 검사가 실패한 시나리오만 한 번 더, 한 번에 묶어서
let after = snapshot();
const retried = noLive
  ? []
  : Object.entries(after)
      .filter(
        ([id, r]) =>
          r.status === "failing" &&
          r.refs?.some((p) => p.ref.runner === "script" && p.latest?.test.result === "fail")
      )
      .map(([id]) => id);
if (retried.length) {
  const rr = qa("recheck", "--scenario", retried.join(","), "--live");
  log += rr.stdout + rr.stderr;
  after = snapshot();
}

// 3. 오늘 실제로 돌려서 실패한 것과, 안 돌렸는데 장부에 실패로 남아 있는 것을 가른다
const newFacts = loadFacts()
  .slice(startFacts)
  .filter((f) => f.type !== "void");
const ranToday = new Set(newFacts.map((f) => f.scenario));
const failing = Object.entries(after)
  .filter(([, r]) => r.status === "failing")
  .map(([id]) => id);
const failedToday = failing.filter((id) => ranToday.has(id));
const carriedFailing = failing.filter((id) => !ranToday.has(id));
const broken = Object.entries(after)
  .filter(([, r]) => r.status === "broken")
  .map(([id]) => id);

// 직전 보고서와 비교해 연속 실패를 가른다 (로컬만. CI는 직전 근거가 저장소에 없어 비교하지 않는다)
const prevFile = ci
  ? null
  : readdirSync(reportsDir)
      .filter((f) => f.endsWith(".json") && f.slice(0, 10) < today)
      .sort()
      .at(-1);
const prev = prevFile ? JSON.parse(readFileSync(path.join(reportsDir, prevFile), "utf8")) : null;
const prevFailed = new Set(prev?.failedToday ?? prev?.failing ?? []);
const consecutive = ci ? [] : failedToday.filter((id) => prevFailed.has(id));
const flaky = retried.filter((id) => after[id].status !== "failing");
const count = {};
for (const r of Object.values(after)) count[r.status] = (count[r.status] ?? 0) + 1;

const isPublic = (id) => !(ci && byId[id]?.private);
const git = gitInfo();
const summary = {
  date: today,
  commit: git.commit,
  branch: git.branch,
  ran: toRun.filter(isPublic),
  retried: retried.filter(isPublic),
  flaky: flaky.filter(isPublic),
  failedToday: failedToday.filter(isPublic),
  failing: failing.filter(isPublic),
  broken: broken.filter(isPublic),
  consecutive,
  count,
  statuses: Object.fromEntries(
    Object.entries(after)
      .filter(([id]) => isPublic(id))
      .map(([id, r]) => [id, r.status])
  ),
};

const row = (id) => {
  const r = after[id];
  const last = r.last ? ` (${r.last.at.slice(0, 16)} ${r.last.branch}@${r.last.commit})` : "";
  return `| ${id} | ${LABEL[r.status]} | ${r.reason.replace(/[\\|]/g, "\\$&")}${last} |`;
};
const list = (ids, fmt = (id) => `- ${id}`) => ids.filter(isPublic).map(fmt).join("\n");
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
      ? `## 연속 실패 (어제도 실패, 확인 필요)\n\n${list(consecutive)}`
      : "## 연속 실패 없음",
  "",
  failedToday.filter(isPublic).length
    ? `## 오늘 돌려서 실패\n\n${list(failedToday, (id) => `- ${id}${retried.includes(id) ? " (재시도 후에도 실패)" : ""}`)}`
    : "## 오늘 돌려서 실패한 것 없음",
  "",
  carriedFailing.filter(isPublic).length
    ? `## 오늘 안 돌렸지만 장부에 실패로 남은 것\n\n이번 실행 옵션으로는 돌릴 수 없는 검증이다. 옵션을 바꿔 돌리거나 원인이 환경이면 근거를 무효 처리한다.\n\n${list(carriedFailing)}`
    : "",
  "",
  broken.filter(isPublic).length
    ? `## 검사 오류 (제품 실패 아님, 환경이나 도구 확인)\n\n${list(broken, (id) => `- ${id}: ${after[id].reason}`)}`
    : "",
  "",
  flaky.filter(isPublic).length ? `## 흔들림 (1차 실패, 재시도 통과)\n\n${list(flaky)}` : "",
  "",
  `## 재검증한 시나리오 ${toRun.filter(isPublic).length}개`,
  "",
  toRun.filter(isPublic).length
    ? list(toRun, (id) => `- ${id}: ${LABEL[before[id].status]} → ${LABEL[after[id].status]}`)
    : "- 없음 (전부 신선함)",
  "",
  "## 전체 상태",
  "",
  "| 시나리오 | 상태 | 이유 |",
  "| --- | --- | --- |",
  ...scenarios.filter((sc) => isPublic(sc.id)).map((sc) => row(sc.id)),
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
].join("\n");

// 같은 날 다시 돌리면 덮어쓰지 않고 시각을 붙인다
const hhmm = now.toISOString().slice(11, 16).replace(":", "");
const base = existsSync(path.join(reportsDir, `${today}.json`)) ? `${today}-${hhmm}` : today;
writeFileSync(path.join(reportsDir, `${base}.json`), JSON.stringify(summary, null, 2) + "\n");
writeFileSync(path.join(reportsDir, `${base}.md`), md);

console.log(JSON.stringify(summary));
if (ci && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
process.exit(ci ? 0 : consecutive.length ? 1 : 0);
