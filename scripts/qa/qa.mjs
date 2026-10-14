// QATester CLI
//   node scripts/qa/qa.mjs status [--json]          시나리오별 상태 (fresh / partial / stale / failing / broken / unverified / hold)
//   node scripts/qa/qa.mjs gaps                      어느 시나리오에도 연결되지 않은 소스 파일 (시나리오를 더 써야 할 곳)
//   node scripts/qa/qa.mjs finding add <id> "<내용>" [--scenario <id>] [--status open|fixed|wontfix|observed]
//   node scripts/qa/qa.mjs finding list
//   node scripts/qa/qa.mjs show <시나리오 id>        연결된 파일, mock된 경계, 마지막 근거, 바뀐 파일
//   node scripts/qa/qa.mjs recheck [--all] [--e2e] [--live] [--scenario <id>[,<id>…]]
//                                                    재검증이 필요한 시나리오의 테스트만 돌리고 사실을 쌓는다
//                                                    --e2e: Playwright도 돌린다 (브라우저, 개발 서버 필요)
//                                                    --live: 외부 서비스를 부르는 스크립트 검사도 돌린다 (실제 AI 등)
//   node scripts/qa/qa.mjs judgment list | mark <시나리오> correct|wrong   판정 에이전트의 판정과 사람 확인, 정확도
//   node scripts/qa/qa.mjs fact void <시나리오 id> --reason "<이유>" [--at <근거 시각> | --last]
//                                                    검사 환경 탓에 생긴 근거를 지우지 않고 무효로 표시한다
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { appendFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KDIR,
  ROOT,
  currentFindings,
  defHash,
  fingerprint,
  gitInfo,
  linkScenario,
  loadConfig,
  loadFacts,
  loadScenarios,
  nameMatches,
  needsRecheck,
  refId,
  sameFile,
  statusOf,
} from "./lib.mjs";

const posix = path.posix;

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
  partial: "부분 검증",
  broken: "검사 오류",
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
          needsRun: r.needsRun ?? undefined,
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
  // 검증 테스트마다 마지막으로 실제로 돈 결과를 따로 보여 준다
  const refLine = (p) => {
    const t = p.latest?.test;
    if (!t) return `  - ${p.id}\n      아직 안 돎`;
    const extra = [t.reason, t.cases ? `걸린 테스트 ${t.cases.length}개` : ""].filter(Boolean);
    return `  - ${p.id}\n      ${t.result} (${p.latest.fact.at.slice(0, 16)})${extra.length ? ` — ${extra.join(", ")}` : ""}`;
  };
  const refLines = r.refs ? r.refs.map(refLine) : sc.verifiedBy.map((v) => `  - ${refId(v)}`);
  console.log(`\n검증 테스트:\n${refLines.join("\n") || "  (없음)"}`);
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
  if (r.link.mockedApi.length)
    console.log(
      `\n문자열로 부르는 API 중 이 시나리오로 실행되지 않는 것 (mock됐거나, 단위 테스트라 서버가 없음):\n${r.link.mockedApi.map((f) => `  - ${f}`).join("\n")}`
    );
  if (r.changed?.length)
    console.log(`\n검증 뒤 바뀐 파일:\n${r.changed.map((f) => `  - ${f}`).join("\n")}`);
  if (r.last)
    console.log(
      `\n마지막 근거: ${r.last.result} · ${r.last.at} · ${r.last.branch}@${r.last.commit}${r.last.dirty ? " (미커밋 변경 포함)" : ""}`
    );
  if (sc.notes) console.log(`\n메모: ${sc.notes}`);
} else if (cmd === "recheck") {
  // --scenario a,b 처럼 여러 개를 쉼표로 줄 수 있다 (나이틀리 재시도를 한 번에 묶는다)
  const only = opt("--scenario") ? new Set(opt("--scenario").split(",")) : null;
  // 이번 실행에서 실제로 돌 수 있는 검증 테스트인가 (E2E는 --e2e, 외부 서비스 스크립트는 --live가 있어야 돈다)
  const runnable = (ref) =>
    ref.runner === "vitest" ||
    (ref.runner === "playwright" && flag("--e2e")) ||
    (ref.runner === "script" && flag("--live"));
  const rows = statusAll().filter((r) => {
    if (!r.sc.verifiedBy.some(runnable)) return false;
    if (only) return only.has(r.sc.id);
    if (r.status === "hold") return false;
    if (flag("--all")) return true;
    if (!needsRecheck(r, r.sc)) return false;
    // 아직 안 돈 검증만 남은 "일부 검증"은 그 검증을 이번에 돌릴 수 있을 때만 대상이다
    if (r.status === "partial") return r.refs.some((p) => !p.latest && runnable(p.ref));
    return true;
  });
  if (!rows.length) {
    console.log("재검증할 시나리오가 없습니다.");
    process.exit(0);
  }
  console.log(`재검증 대상 ${rows.length}개: ${rows.map((r) => r.sc.id).join(", ")}\n`);

  // 지문은 테스트를 돌리기 전에 찍는다. 돌린 뒤에 찍으면 실행 중에 바뀐 파일이 검증된 것처럼 기록된다
  const before = new Map(rows.map((r) => [r.sc.id, fingerprint(linkScenario(r.sc, cfg).files)]));

  // 테스트 러너는 셸을 거치지 않고 node로 JS 진입점을 직접 실행한다.
  // (예전에는 Windows에서 pnpm.cmd 때문에 셸 문자열을 이어 붙였는데, 인자 이스케이프가 불완전했다. CodeQL 지적)
  const appDir = path.join(ROOT, cfg.appRoot);
  const appRequire = createRequire(path.join(appDir, "package.json"));
  const binPath = (runner) => {
    const pkgJson = appRequire.resolve(`${runner.package}/package.json`);
    const bin = JSON.parse(readFileSync(pkgJson, "utf8")).bin;
    return path.join(path.dirname(pkgJson), typeof bin === "string" ? bin : bin[runner.bin]);
  };
  const run = (runner, args) =>
    spawnSync(process.execPath, [binPath(runner), ...args], {
      cwd: appDir,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });

  // 결과: { result: pass | fail | error | skipped, ran, skipped, cases, reason }
  //  - cases: 근거로 실제로 걸린 테스트 제목. 다음 실행에서 이 중 하나가 사라지면 오류로 멈춘다 (근거가 몰래 줄어드는 것 방지)
  //  - error: 검사 자체가 돌지 못함 (환경, 도구, 근거 테스트 없음). 제품 실패(fail)와 따로 센다
  //  - skip된 테스트는 통과로 세지 않는다
  //  - flaky: 재시도로 통과한 테스트 제목 (CI는 실패한 테스트를 다시 돌린다). 통과지만 숨기지 않고 남긴다
  const fromCases = (cases, isSkipped, isFailed, isFlaky = () => false) => {
    if (!cases.length) return { result: "error", reason: "이름에 맞는 테스트가 없음" };
    const titles = cases.map((c) => c.title).sort();
    const skipped = cases.filter(isSkipped).length;
    const ran = cases.length - skipped;
    const flakyTitles = cases.filter(isFlaky).map((c) => c.title);
    const flaky = flakyTitles.length ? { flaky: flakyTitles } : {};
    if (cases.some(isFailed)) return { result: "fail", ran, skipped, cases: titles, ...flaky };
    return { result: ran === 0 ? "skipped" : "pass", ran, skipped, cases: titles, ...flaky };
  };

  // vitest: 대상 시나리오의 테스트 파일을 한 번에 돌리고 JSON 결과를 테스트 단위로 나눠 쓴다
  const vitestFiles = [
    ...new Set(
      rows.flatMap((r) => r.sc.verifiedBy.filter((v) => v.runner === "vitest").map((v) => v.file))
    ),
  ];
  let vitest = null;
  let vitestError = "";
  if (vitestFiles.length) {
    const out = path.join(mkdtempSync(path.join(os.tmpdir(), "qa-")), "vitest.json");
    const r = run(cfg.vitest, [
      ...cfg.vitest.args,
      "--reporter=json",
      `--outputFile=${out}`,
      ...vitestFiles,
    ]);
    vitest = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
    if (!vitest) {
      vitestError = "vitest 결과를 읽지 못함";
      console.error(`vitest 결과를 읽지 못했습니다.\n${(r.stderr || r.stdout).slice(-1500)}`);
    }
  }
  const vitestResult = (ref) => {
    if (!vitest) return { result: "error", reason: vitestError };
    const fileRes = vitest.testResults.find((t) =>
      sameFile(t.name, posix.join(cfg.appRoot, ref.file))
    );
    if (!fileRes) return { result: "error", reason: "테스트 파일 결과가 없음 (수집 실패)" };
    const cases = fileRes.assertionResults
      .map((a) => ({ title: a.fullName, status: a.status }))
      .filter((c) => nameMatches(ref.name, c.title));
    return fromCases(
      cases,
      (c) => ["skipped", "pending", "todo"].includes(c.status),
      (c) => c.status === "failed"
    );
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
    const r = run(cfg.playwright, [...cfg.playwright.args, "--reporter=json", ...e2eFiles]);
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
  // Playwright 보고서의 파일 경로는 testDir 기준이다 (예: e2e/header.spec.ts → header.spec.ts)
  const testDir = (cfg.playwright.testDir ?? "").replace(/\/$/, "");
  const e2eRel = (file) =>
    testDir && file.startsWith(`${testDir}/`) ? file.slice(testDir.length + 1) : file;
  const playwrightResult = (ref) => {
    if (!e2eCases) return { result: "error", reason: "Playwright 결과를 읽지 못함" };
    const want = e2eRel(ref.file);
    return fromCases(
      e2eCases.filter((c) => c.file === want && nameMatches(ref.name, c.title)),
      (c) => c.status === "skipped",
      (c) => c.status === "unexpected",
      (c) => c.status === "flaky"
    );
  };

  // script 러너: 스크립트를 실행하고 마지막 줄의 JSON({ result, checks, ... })을 결과로 쓴다.
  // 실제 AI 점검처럼 외부 서비스를 부르는 검사는 --live를 줘야 돈다 (느리고 비용이 든다)
  // 같은 스크립트를 여러 시나리오가 쓰면 한 번만 돌리고 결과를 나눠 쓴다 (비용, 그리고 둘이 엇갈리는 일을 막는다)
  // 그룹 "setup"(계정 생성, 서버 기동 등)은 제품 주장이 아니라 검사 준비다. 실패하면 fail이 아니라 error다
  const scriptCache = new Map();
  const runScript = (file) => {
    if (scriptCache.has(file)) return scriptCache.get(file);
    console.log(`스크립트 실행 중: ${file} (외부 서비스를 불러서 몇 분 걸릴 수 있다)…`);
    const r = spawnSync(process.execPath, [path.join(ROOT, file)], { cwd: ROOT, encoding: "utf8" });
    scriptCache.set(file, r);
    return r;
  };
  const scriptResult = (ref) => {
    const r = runScript(ref.file);
    const last = (r.stdout ?? "").trim().split(/\r?\n/).filter(Boolean).at(-1);
    let o;
    try {
      o = JSON.parse(last);
    } catch {
      console.error(
        `스크립트 결과(JSON)를 읽지 못했습니다: ${ref.file}\n${(r.stderr || r.stdout || "").slice(-1500)}`
      );
      return { result: "error", reason: "스크립트 결과(JSON)를 읽지 못함" };
    }
    const all = o.checks ?? [];
    // "setup"은 모든 그룹의 준비, "setup:<그룹>"은 그 그룹만의 준비다 (예: setup:ai = 외부 AI 한도)
    const setupFailed = all.filter(
      (c) => !c.ok && (c.group === "setup" || (ref.name && c.group === `setup:${ref.name}`))
    );
    if (o.result === "error" || setupFailed.length) {
      const why = o.error ?? setupFailed.map((c) => `${c.name}: ${c.detail ?? ""}`).join("; ");
      console.log(`         검사 오류: ${why}`);
      return { result: "error", reason: `검사 준비 실패: ${why}`.slice(0, 300) };
    }
    // ref.name이 있으면 그 그룹의 검사만 이 시나리오의 근거로 쓴다 (Playwright의 -g와 같은 역할)
    const checks = all.filter((c) =>
      ref.name ? c.group === ref.name : !c.group?.startsWith("setup")
    );
    if (!checks.length)
      return { result: "error", reason: `그룹 "${ref.name}"에 해당하는 검사가 없음` };
    const failed = checks.filter((c) => !c.ok);
    for (const c of failed) console.log(`         FAIL ${c.name}: ${c.detail ?? ""}`);
    return {
      result: failed.length ? "fail" : "pass",
      ran: checks.length,
      skipped: 0,
      cases: checks.map((c) => c.name).sort(),
      checks,
      serverLog: failed.length ? o.serverLog : undefined,
    };
  };

  const resultOf = (ref) => {
    if (!runnable(ref))
      return {
        result: "skipped",
        reason: ref.runner === "playwright" ? "--e2e 없음" : "--live 없음",
      };
    if (ref.runner === "vitest") return vitestResult(ref);
    if (ref.runner === "playwright") return playwrightResult(ref);
    if (ref.runner === "script") return scriptResult(ref);
    return { result: "error", reason: `알 수 없는 러너: ${ref.runner}` };
  };

  // 같은 정의에서 지난번에 근거로 걸린 테스트 제목. 이번에 그중 하나라도 빠지면 근거가 몰래 줄어든 것이다
  const facts = loadFacts();
  const prevCases = (sc, id) => {
    const def = defHash(sc);
    const f = facts
      .filter((f) => f.type !== "void" && f.scenario === sc.id && f.defHash === def)
      .map((f) => f.tests?.find((t) => t.ref === id && t.cases))
      .filter(Boolean)
      .at(-1);
    return f?.cases ?? null;
  };

  const git = gitInfo();
  for (const row of rows) {
    const tests = row.sc.verifiedBy.map((ref) => {
      const id = refId(ref);
      const t = { ref: id, ...resultOf(ref) };
      const prev = t.cases ? prevCases(row.sc, id) : null;
      const lost = prev ? prev.filter((c) => !t.cases.includes(c)) : [];
      if (lost.length && t.result !== "fail")
        return {
          ...t,
          result: "error",
          reason: `근거 테스트가 사라짐: ${lost.slice(0, 3).join(" | ")}${lost.length > 3 ? " …" : ""}`,
        };
      return t;
    });
    const fp = before.get(row.sc.id);
    const after = fingerprint(Object.keys(fp));
    const moved = Object.keys(fp).filter((f) => fp[f] !== after[f]);
    if (moved.length)
      for (const t of tests)
        if (t.result !== "skipped") {
          t.result = "error";
          t.reason = `실행 중 파일이 바뀜: ${moved.slice(0, 3).join(", ")}`;
        }
    const ran = tests.filter((t) => t.result !== "skipped");
    const result = !ran.length
      ? "skipped"
      : ran.some((t) => t.result === "fail")
        ? "fail"
        : ran.some((t) => t.result === "error")
          ? "error"
          : "pass";
    const skippedCases = tests.reduce((n, t) => n + (t.skipped ?? 0), 0);
    const fact = {
      scenario: row.sc.id,
      claim: row.sc.claim,
      defHash: defHash(row.sc),
      result,
      partial: ran.length < tests.length || skippedCases > 0,
      skippedCases,
      tests,
      at: new Date().toISOString(),
      ...git,
      source: "recheck",
      fingerprint: fp,
    };
    // 아무 테스트도 돌지 않았으면 근거가 없으므로 기록하지 않는다 (근거 없는 사실은 넣지 않는다)
    if (result !== "skipped")
      appendFileSync(path.join(KDIR, "facts.jsonl"), JSON.stringify(fact) + "\n");
    const note = [
      ran.length < tests.length ? "일부 건너뜀 (--e2e, --live)" : "",
      skippedCases ? `skip된 테스트 ${skippedCases}개` : "",
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`${result.padEnd(7)} ${row.sc.id}${note ? ` (${note})` : ""}`);
    for (const t of tests.filter((t) => t.result !== "pass" || t.skipped))
      console.log(
        `         ${t.result}${t.skipped ? ` (skip ${t.skipped})` : ""}: ${t.ref}${t.reason ? ` — ${t.reason}` : ""}`
      );
  }
} else if (cmd === "fact") {
  // 기록된 근거는 지우지 않는다. 검사 환경 탓에 생긴 잘못된 근거는 무효 기록을 덧붙여 판정에서 뺀다
  //   fact void <시나리오 id> --reason "<이유>" [--at <근거 시각> | --last]
  if (rest[0] !== "void")
    throw new Error(
      '사용법: fact void <시나리오 id> --reason "<이유>" [--at <근거 시각> | --last]'
    );
  const id = rest[1];
  const reason = opt("--reason");
  if (!id || !reason) throw new Error("시나리오 id와 --reason이 필요합니다");
  const facts = loadFacts().filter((f) => f.type !== "void" && f.scenario === id);
  const target = opt("--at") ?? (flag("--last") ? facts.at(-1)?.at : null);
  if (!target) throw new Error("--at <근거 시각> 또는 --last가 필요합니다");
  const hit = facts.find((f) => f.at === target);
  if (!hit) throw new Error(`그 시각의 근거가 없습니다: ${id} @ ${target}`);
  const entry = {
    type: "void",
    scenario: id,
    target,
    reason,
    at: new Date().toISOString(),
    ...gitInfo(),
  };
  appendFileSync(path.join(KDIR, "facts.jsonl"), JSON.stringify(entry) + "\n");
  console.log(`무효 처리: ${id} @ ${target} (${hit.result}) — ${reason}`);
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
} else if (cmd === "judgment") {
  // 판정 에이전트의 판정 기록. 사람이 맞았는지 표시하면 정확도가 쌓인다 (지우지 않고 표시 기록을 덧붙인다)
  //   judgment list                                  판정과 사람 표시, 정확도
  //   judgment mark <시나리오> correct|wrong [--at <판정 시각>] [--note "<메모>"]   (기본: 그 시나리오의 마지막 판정)
  const file = path.join(KDIR, "judgments.jsonl");
  const rows = existsSync(file)
    ? readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
  const judgmentsOnly = rows.filter((r) => r.type === "judgment");
  const marks = new Map(
    rows.filter((r) => r.type === "mark").map((r) => [`${r.scenario}@${r.target}`, r])
  );
  const sub = rest[0] ?? "list";
  if (sub === "mark") {
    const [id, value] = [rest[1], rest[2]];
    if (!id || !["correct", "wrong"].includes(value))
      throw new Error("사용법: judgment mark <시나리오> correct|wrong [--at <판정 시각>]");
    const target = opt("--at") ?? judgmentsOnly.filter((j) => j.scenario === id).at(-1)?.at ?? null;
    if (!target || !judgmentsOnly.some((j) => j.scenario === id && j.at === target))
      throw new Error(
        `그 시나리오의 판정이 없습니다: ${id}${opt("--at") ? ` @ ${opt("--at")}` : ""}`
      );
    const entry = {
      type: "mark",
      scenario: id,
      target,
      correct: value === "correct",
      note: opt("--note") ?? undefined,
      at: new Date().toISOString(),
    };
    appendFileSync(file, JSON.stringify(entry) + "\n");
    console.log(`표시: ${id} @ ${target} → ${value}`);
  } else {
    if (!judgmentsOnly.length) console.log("판정 기록 없음 (나이틀리를 --judge로 돌리면 생긴다)");
    for (const j of judgmentsOnly) {
      const m = marks.get(`${j.scenario}@${j.at}`);
      const mark = m ? (m.correct ? "맞음" : "틀림") : "미확인";
      console.log(
        `${mark.padEnd(4)} ${j.verdict.padEnd(15)} ${(j.confidence ?? "-").padEnd(3)} ${j.scenario}  ${j.at.slice(0, 16)}  ${j.file}`
      );
    }
    const checked = judgmentsOnly.filter((j) => marks.has(`${j.scenario}@${j.at}`));
    const right = checked.filter((j) => marks.get(`${j.scenario}@${j.at}`).correct).length;
    if (judgmentsOnly.length)
      console.log(
        `\n판정 ${judgmentsOnly.length}건 · 사람 확인 ${checked.length}건 · 맞음 ${right}건${checked.length ? ` (정확도 ${Math.round((right / checked.length) * 100)}%)` : ""}`
      );
  }
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
