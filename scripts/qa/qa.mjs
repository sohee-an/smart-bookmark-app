// QATester CLI
//   node scripts/qa/qa.mjs status [--json]          시나리오별 상태 (fresh / stale / failing / unverified)
//   node scripts/qa/qa.mjs show <시나리오 id>        연결된 파일, mock된 경계, 마지막 근거, 바뀐 파일
//   node scripts/qa/qa.mjs recheck [--all] [--e2e] [--scenario <id>]
//                                                    재검증이 필요한 시나리오의 테스트만 돌리고 사실을 쌓는다
//                                                    --e2e: Playwright도 돌린다 (브라우저, 개발 서버 필요)
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KDIR,
  ROOT,
  fingerprint,
  gitInfo,
  linkScenario,
  loadConfig,
  loadFacts,
  loadScenarios,
  statusOf,
} from "./lib.mjs";

const [cmd = "status", ...rest] = process.argv.slice(2);
const flag = (f) => rest.includes(f);
const opt = (f) => (rest.includes(f) ? rest[rest.indexOf(f) + 1] : null);

const cfg = loadConfig();
const scenarios = loadScenarios();
const LABEL = { fresh: "통과", stale: "재검증 필요", failing: "실패", unverified: "미검증" };

function statusAll() {
  const facts = loadFacts();
  return scenarios.map((sc) => ({ sc, ...statusOf(sc, cfg, facts) }));
}

if (cmd === "status") {
  const rows = statusAll();
  if (flag("--json")) {
    console.log(
      JSON.stringify(
        rows.map((r) => ({
          id: r.sc.id,
          status: r.status,
          reason: r.reason,
          changed: r.changed ?? [],
        })),
        null,
        2
      )
    );
    process.exit(0);
  }
  const count = {};
  for (const r of rows) {
    count[r.status] = (count[r.status] ?? 0) + 1;
    const extra = r.changed?.length
      ? ` — 바뀐 파일 ${r.changed.length}개: ${r.changed.slice(0, 3).join(", ")}${r.changed.length > 3 ? " …" : ""}`
      : "";
    console.log(`${LABEL[r.status].padEnd(7)} ${r.sc.id.padEnd(30)} ${r.reason}${extra}`);
  }
  console.log(
    `\n${Object.entries(count)
      .map(([k, v]) => `${LABEL[k]} ${v}`)
      .join(" · ")} (시나리오 ${rows.length}개)`
  );
} else if (cmd === "show") {
  const sc = scenarios.find((s) => s.id === rest[0]);
  if (!sc) throw new Error(`시나리오 없음: ${rest[0]}`);
  const r = statusOf(sc, cfg, loadFacts());
  console.log(
    `# ${sc.id}\n기능: ${sc.feature}\n주장: ${sc.claim}\n상태: ${LABEL[r.status]} — ${r.reason}`
  );
  console.log(
    `\n검증 테스트:\n${sc.verifiedBy.map((v) => `  - ${v.runner} ${v.file}${v.name ? ` "${v.name}"` : ""}`).join("\n") || "  (없음)"}`
  );
  console.log(
    `\n연결된 코드 ${r.link.files.length}개:\n${r.link.files.map((f) => `  - ${f}`).join("\n")}`
  );
  if (r.link.mocked.length)
    console.log(
      `\nmock된 모듈 (이 시나리오로는 검증되지 않음):\n${r.link.mocked.map((f) => `  - ${f}`).join("\n")}`
    );
  if (r.link.mockedRoutes.length)
    console.log(
      `\nmock된 API (실제 라우트는 검증되지 않음):\n${r.link.mockedRoutes.map((f) => `  - ${f}`).join("\n")}`
    );
  if (r.changed?.length)
    console.log(`\n검증 뒤 바뀐 파일:\n${r.changed.map((f) => `  - ${f}`).join("\n")}`);
  if (r.last)
    console.log(
      `\n마지막 근거: ${r.last.result} · ${r.last.at} · ${r.last.branch}@${r.last.commit}${r.last.dirty ? " (미커밋 변경 포함)" : ""}`
    );
  if (sc.notes) console.log(`\n메모: ${sc.notes}`);
} else if (cmd === "recheck") {
  const only = opt("--scenario");
  const rows = statusAll().filter(
    (r) =>
      (only ? r.sc.id === only : flag("--all") || r.status !== "fresh") && r.sc.verifiedBy.length
  );
  if (!rows.length) {
    console.log("재검증할 시나리오가 없습니다.");
    process.exit(0);
  }
  console.log(`재검증 대상 ${rows.length}개: ${rows.map((r) => r.sc.id).join(", ")}\n`);

  // vitest: 대상 시나리오의 테스트 파일을 한 번에 돌리고 JSON 결과를 테스트 단위로 나눠 쓴다
  const vitestFiles = [
    ...new Set(
      rows.flatMap((r) => r.sc.verifiedBy.filter((v) => v.runner === "vitest").map((v) => v.file))
    ),
  ];
  // Windows에서 pnpm은 .cmd라 셸이 필요하다. 인자를 따옴표로 감싼 한 줄 명령으로 넘긴다
  const run = (cmd, args) =>
    process.platform === "win32"
      ? spawnSync([cmd, ...args.map((a) => `"${a.replace(/"/g, '\\"')}"`)].join(" "), {
          cwd: path.join(ROOT, cfg.appRoot),
          encoding: "utf8",
          shell: true,
        })
      : spawnSync(cmd, args, { cwd: path.join(ROOT, cfg.appRoot), encoding: "utf8" });

  let vitest = null;
  if (vitestFiles.length) {
    const out = path.join(mkdtempSync(path.join(os.tmpdir(), "qa-")), "vitest.json");
    const r = run(cfg.vitest.cmd, [
      ...cfg.vitest.args,
      "--reporter=json",
      `--outputFile=${out}`,
      ...vitestFiles,
    ]);
    vitest = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
    if (!vitest)
      console.error(`vitest 결과를 읽지 못했습니다.\n${(r.stderr || r.stdout).slice(-1500)}`);
  }
  const vitestResult = (ref) => {
    if (!vitest) return "error";
    const fileRes = vitest.testResults.find((t) => t.name.replace(/\\/g, "/").endsWith(ref.file));
    if (!fileRes) return "error";
    const cases = fileRes.assertionResults.filter(
      (a) => !ref.name || a.fullName.includes(ref.name)
    );
    if (!cases.length) return "error";
    return cases.every(
      (c) => c.status === "passed" || c.status === "skipped" || c.status === "pending"
    )
      ? "pass"
      : "fail";
  };

  const playwrightResult = (ref) => {
    const args = [...cfg.playwright.args, ref.file, ...(ref.name ? ["-g", ref.name] : [])];
    return run(cfg.playwright.cmd, args).status === 0 ? "pass" : "fail";
  };

  const git = gitInfo();
  for (const row of rows) {
    const tests = row.sc.verifiedBy.map((ref) => {
      const id = `${ref.runner}:${ref.file}${ref.name ? `::${ref.name}` : ""}`;
      if (ref.runner === "vitest") return { ref: id, result: vitestResult(ref) };
      if (ref.runner === "playwright")
        return { ref: id, result: flag("--e2e") ? playwrightResult(ref) : "skipped" };
      return { ref: id, result: "error" };
    });
    const ran = tests.filter((t) => t.result !== "skipped");
    const result = !ran.length
      ? "skipped"
      : ran.some((t) => t.result === "error")
        ? "error"
        : ran.some((t) => t.result === "fail")
          ? "fail"
          : "pass";
    const link = linkScenario(row.sc, cfg);
    const fact = {
      scenario: row.sc.id,
      claim: row.sc.claim,
      result,
      partial: ran.length < tests.length,
      tests,
      at: new Date().toISOString(),
      ...git,
      source: "recheck",
      fingerprint: fingerprint(link.files),
    };
    // 아무 테스트도 돌지 않았으면 근거가 없으므로 기록하지 않는다 (근거 없는 사실은 넣지 않는다)
    if (result !== "skipped")
      appendFileSync(path.join(KDIR, "facts.jsonl"), JSON.stringify(fact) + "\n");
    console.log(`${result.padEnd(7)} ${row.sc.id}${fact.partial ? " (E2E 건너뜀)" : ""}`);
    for (const t of tests.filter((t) => t.result !== "pass"))
      console.log(`         ${t.result}: ${t.ref}`);
  }
} else {
  console.error(`알 수 없는 명령: ${cmd}`);
  process.exit(1);
}
