// QATester CLI
//   node scripts/qa/qa.mjs status [--json]          시나리오별 상태 (fresh / stale / failing / unverified)
//   node scripts/qa/qa.mjs gaps                      어느 시나리오에도 연결되지 않은 소스 파일 (시나리오를 더 써야 할 곳)
//   node scripts/qa/qa.mjs finding add <id> "<내용>" [--scenario <id>] [--status open|fixed|wontfix|observed]
//   node scripts/qa/qa.mjs finding list
//   node scripts/qa/qa.mjs show <시나리오 id>        연결된 파일, mock된 경계, 마지막 근거, 바뀐 파일
//   node scripts/qa/qa.mjs recheck [--all] [--e2e] [--live] [--scenario <id>]
//                                                    재검증이 필요한 시나리오의 테스트만 돌리고 사실을 쌓는다
//                                                    --e2e: Playwright도 돌린다 (브라우저, 개발 서버 필요)
//                                                    --live: 외부 서비스를 부르는 스크립트 검사도 돌린다 (실제 AI 등)
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KDIR,
  ROOT,
  currentFindings,
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
const LABEL = {
  fresh: "통과",
  stale: "재검증 필요",
  failing: "실패",
  unverified: "미검증",
  hold: "보류",
};

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
  const fs = currentFindings();
  const openF = fs.filter((f) => f.status === "open");
  if (fs.length)
    console.log(
      `발견 ${fs.length}건 (미처리 ${openF.length})${openF.length ? ": " + openF.map((f) => f.id).join(", ") : ""}`
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
      (only ? r.sc.id === only : (flag("--all") || r.status !== "fresh") && r.status !== "hold") &&
      r.sc.verifiedBy.length
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
  // 결과: { result: pass | fail | error | skipped, ran, skipped }
  // skip된 테스트는 통과로 세지 않는다. 일부만 skip이면 pass지만 skipped 수를 남기고 시나리오를 "일부"로 표시한다
  const vitestResult = (ref) => {
    if (!vitest) return { result: "error" };
    const fileRes = vitest.testResults.find((t) => t.name.replace(/\\/g, "/").endsWith(ref.file));
    if (!fileRes) return { result: "error" };
    const cases = fileRes.assertionResults.filter(
      (a) => !ref.name || a.fullName.includes(ref.name)
    );
    if (!cases.length) return { result: "error" };
    const skipped = cases.filter((c) => ["skipped", "pending", "todo"].includes(c.status)).length;
    const ran = cases.length - skipped;
    if (cases.some((c) => c.status === "failed")) return { result: "fail", ran, skipped };
    return { result: ran === 0 ? "skipped" : "pass", ran, skipped };
  };

  // Playwright: 대상 E2E 파일을 한 번에 돌린다(개발 서버를 한 번만 띄운다). 결과를 테스트 제목으로 나눠 쓴다
  let e2eCases = null;
  const e2eFiles = [
    ...new Set(
      rows.flatMap((r) =>
        r.sc.verifiedBy.filter((v) => v.runner === "playwright").map((v) => v.file)
      )
    ),
  ];
  if (flag("--e2e") && e2eFiles.length) {
    console.log(`E2E ${e2eFiles.length}개 파일 실행 중 (개발 서버를 새로 띄워서 몇 분 걸린다)…`);
    const r = run(cfg.playwright.cmd, [...cfg.playwright.args, "--reporter=json", ...e2eFiles]);
    try {
      const report = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
      e2eCases = [];
      const visit = (suite, titles) => {
        for (const spec of suite.specs ?? [])
          for (const t of spec.tests ?? [])
            e2eCases.push({
              file: (spec.file ?? suite.file ?? "").replace(/\\/g, "/"),
              title: [...titles, spec.title].join(" › "),
              status: t.status, // expected | unexpected | flaky | skipped
            });
        for (const s of suite.suites ?? []) visit(s, [...titles, s.title]); // 중첩 suite는 describe라 제목을 붙인다 (파일 suite는 맨 위에서만)
      };
      for (const s of report.suites ?? []) visit(s, []);
    } catch {
      console.error(`Playwright 결과를 읽지 못했습니다.\n${(r.stderr || r.stdout).slice(-2000)}`);
    }
  }
  // script 러너: 스크립트를 실행하고 마지막 줄의 JSON({ result, ran, skipped, ... })을 결과로 쓴다.
  // 실제 AI 점검처럼 외부 서비스를 부르는 검사는 --live를 줘야 돈다 (느리고 비용이 든다)
  // 같은 스크립트를 여러 시나리오가 쓰면 한 번만 돌리고 결과를 나눠 쓴다 (비용, 그리고 둘이 엇갈리는 일을 막는다)
  const scriptCache = new Map();
  const runScript = (file) => {
    if (scriptCache.has(file)) return scriptCache.get(file);
    console.log(`스크립트 실행 중: ${file} (외부 서비스를 불러서 몇 분 걸릴 수 있다)…`);
    const r = spawnSync(process.execPath, [path.join(ROOT, file)], { cwd: ROOT, encoding: "utf8" });
    scriptCache.set(file, r);
    return r;
  };
  const scriptResult = (ref) => {
    if (!flag("--live")) return { result: "skipped", reason: "--live 없음" };
    const r = runScript(ref.file);
    const last = (r.stdout ?? "").trim().split(/\r?\n/).filter(Boolean).at(-1);
    try {
      const o = JSON.parse(last);
      if (o.result === "error") return { result: "error", error: o.error };
      // ref.name이 있으면 그 그룹의 검사만 이 시나리오의 근거로 쓴다 (Playwright의 -g와 같은 역할)
      const checks = (o.checks ?? []).filter((c) => !ref.name || c.group === ref.name);
      if (!checks.length)
        return { result: "error", error: `그룹 "${ref.name}"에 해당하는 검사가 없음` };
      const failed = checks.filter((c) => !c.ok);
      for (const c of failed) console.log(`         FAIL ${c.name}: ${c.detail ?? ""}`);
      return {
        result: failed.length ? "fail" : "pass",
        ran: checks.length,
        skipped: 0,
        checks,
        serverLog: failed.length ? o.serverLog : undefined,
      };
    } catch {
      console.error(
        `스크립트 결과(JSON)를 읽지 못했습니다: ${ref.file}\n${(r.stderr || r.stdout || "").slice(-1500)}`
      );
      return { result: "error" };
    }
  };

  const playwrightResult = (ref) => {
    if (!e2eCases) return { result: "error" };
    const cases = e2eCases.filter(
      (c) =>
        (ref.file.endsWith(c.file) || c.file.endsWith(ref.file.replace(/^e2e\//, ""))) &&
        (!ref.name || c.title.includes(ref.name))
    );
    if (!cases.length) return { result: "error" };
    const skipped = cases.filter((c) => c.status === "skipped").length;
    const ran = cases.length - skipped;
    if (cases.some((c) => c.status === "unexpected")) return { result: "fail", ran, skipped };
    return { result: ran === 0 ? "skipped" : "pass", ran, skipped };
  };

  const git = gitInfo();
  for (const row of rows) {
    const tests = row.sc.verifiedBy.map((ref) => {
      const id = `${ref.runner}:${ref.file}${ref.name ? `::${ref.name}` : ""}`;
      if (ref.runner === "vitest") return { ref: id, ...vitestResult(ref) };
      if (ref.runner === "playwright")
        return {
          ref: id,
          ...(flag("--e2e") ? playwrightResult(ref) : { result: "skipped", reason: "E2E 미실행" }),
        };
      if (ref.runner === "script") return { ref: id, ...scriptResult(ref) };
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
    const skippedCases = tests.reduce((n, t) => n + (t.skipped ?? 0), 0);
    const link = linkScenario(row.sc, cfg);
    const fact = {
      scenario: row.sc.id,
      claim: row.sc.claim,
      result,
      partial: ran.length < tests.length || skippedCases > 0,
      skippedCases,
      tests,
      at: new Date().toISOString(),
      ...git,
      source: "recheck",
      fingerprint: fingerprint(link.files),
    };
    // 아무 테스트도 돌지 않았으면 근거가 없으므로 기록하지 않는다 (근거 없는 사실은 넣지 않는다)
    if (result !== "skipped")
      appendFileSync(path.join(KDIR, "facts.jsonl"), JSON.stringify(fact) + "\n");
    const note = [
      ran.length < tests.length ? "E2E 건너뜀" : "",
      skippedCases ? `skip된 테스트 ${skippedCases}개` : "",
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`${result.padEnd(7)} ${row.sc.id}${note ? ` (${note})` : ""}`);
    for (const t of tests.filter((t) => t.result !== "pass" || t.skipped))
      console.log(`         ${t.result}${t.skipped ? ` (skip ${t.skipped})` : ""}: ${t.ref}`);
  }
} else if (cmd === "gaps") {
  // 커버리지 대상 디렉터리의 소스 파일 중 어느 시나리오에도 연결되지 않은 것
  const linked = new Set(scenarios.flatMap((sc) => linkScenario(sc, cfg).files));
  const dirs = cfg.gapDirs ?? [];
  const { readdirSync, statSync } = await import("node:fs");
  const out = [];
  const walkDir = (d) => {
    for (const e of readdirSync(path.join(ROOT, d))) {
      const rel = `${d}/${e}`;
      const abs = path.join(ROOT, rel);
      if (statSync(abs).isDirectory()) walkDir(rel);
      else if (
        /\.(ts|tsx)$/.test(e) &&
        !/\.(test|spec|stories)\.|test-setup/.test(e) &&
        !linked.has(rel)
      )
        out.push(rel);
    }
  };
  for (const d of dirs) walkDir(`${cfg.appRoot}/${d}`);
  console.log(
    `어느 시나리오에도 연결되지 않은 소스 ${out.length}개 (대상 디렉터리: ${dirs.join(", ")})`
  );
  for (const f of out) console.log(`  - ${f}`);
} else if (cmd === "finding") {
  const sub = rest[0];
  const { appendFileSync } = await import("node:fs");
  if (sub === "add") {
    const [id, text] = [rest[1], rest[2]];
    if (!id || !text)
      throw new Error(
        '사용법: finding add <id> "<내용>" [--scenario <id>] [--status open|fixed|wontfix|observed]'
      );
    const entry = {
      id,
      text,
      status: opt("--status") ?? "open",
      scenario: opt("--scenario") ?? undefined,
      at: new Date().toISOString(),
      ...gitInfo(),
    };
    appendFileSync(path.join(KDIR, "findings.jsonl"), JSON.stringify(entry) + "\n");
    console.log(`기록: ${id} [${entry.status}]`);
  } else {
    const fs = currentFindings();
    if (!fs.length) console.log("발견 없음");
    for (const f of fs)
      console.log(
        `${f.status.padEnd(8)} ${f.id.padEnd(28)} ${f.text}${f.scenario ? `  (시나리오 ${f.scenario})` : ""}  ${f.at.slice(0, 10)}`
      );
  }
} else {
  console.error(`알 수 없는 명령: ${cmd}`);
  process.exit(1);
}
