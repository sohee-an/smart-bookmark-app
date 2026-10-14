// QATester 지식 장부 엔진 (프로젝트 독립). 프로젝트별 값은 qa-knowledge/config.json에만 둔다.
//
// 핵심 개념
// - 시나리오: 사용자 동작 단위의 주장(claim). 어떤 테스트가 그 주장을 검증하는지(verifiedBy)만 사람이 적는다
// - 연결(links): 시나리오가 의존하는 코드 파일. 사람이 적지 않고 import 그래프와 E2E 라우트에서 기계가 뽑는다
// - 사실(facts): 테스트를 실제로 돌린 결과 + 근거(커밋, 시각, 연결된 파일의 내용 해시). 지우지 않고 쌓기만 한다
// - 신선도: 마지막 통과 때의 파일 해시와 지금 해시가 다르면 "재검증 필요". git 기록과 무관해서 rebase, 미커밋 변경에도 맞다
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const posix = path.posix;

export const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
export const KDIR = posix.join(ROOT.replace(/\\/g, "/"), "qa-knowledge");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));
const abs = (rel) => posix.join(ROOT.replace(/\\/g, "/"), rel);

// tsconfig는 주석과 끝 콤마를 허용한다(JSONC). 문자열 안의 `/*`("@/*" 같은 것)는 건드리지 않고 걷어낸다
function parseJsonc(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i;
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === "\\") i++;
      out += text.slice(start, i + 1);
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

export function loadConfig() {
  const cfg = readJson(posix.join(KDIR, "config.json"));
  // tsconfig의 paths를 그대로 읽어 alias를 만든다
  const paths =
    parseJsonc(readFileSync(abs(posix.join(cfg.appRoot, cfg.tsconfig)), "utf8")).compilerOptions
      ?.paths ?? {};
  cfg.aliases = Object.entries(paths).map(([k, v]) => ({
    prefix: k.replace(/\*$/, ""),
    target: posix.join(cfg.appRoot, v[0].replace(/\*$/, "").replace(/^\.\//, "")),
  }));
  return cfg;
}

export function loadScenarios() {
  return readJson(posix.join(KDIR, "scenarios.json")).scenarios;
}

// ---------- import 그래프 ----------

const IMPORT_RE =
  /(?:^|[\s;])(?:import|export)\s+(type\s+)?(?:[^'"`;]*?\s+from\s+)?["']([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
const MOCK_RE = /vi\.mock\(\s*["']([^"']+)["']/g;

function resolveSpec(fromFile, spec, cfg) {
  let base = null;
  if (spec.startsWith(".")) base = posix.join(posix.dirname(fromFile), spec);
  else {
    const a = cfg.aliases.find((x) => spec.startsWith(x.prefix));
    if (a) base = posix.join(a.target, spec.slice(a.prefix.length));
  }
  if (!base) return null; // 외부 패키지
  for (const c of [
    base,
    ...cfg.extensions.map((e) => base + e),
    ...cfg.extensions.map((e) => `${base}/index${e}`),
  ]) {
    const p = abs(c);
    if (existsSync(p) && statSync(p).isFile()) return c;
  }
  return null;
}

function parseFile(rel, cfg) {
  const src = readFileSync(abs(rel), "utf8");
  const deps = [];
  for (const m of src.matchAll(IMPORT_RE)) {
    if (m[1]) continue; // `import type`은 실행되지 않으므로 의존성에서 뺀다
    const r = resolveSpec(rel, m[2], cfg);
    if (r) deps.push(r);
  }
  for (const m of src.matchAll(DYNAMIC_RE)) {
    const r = resolveSpec(rel, m[1], cfg);
    if (r) deps.push(r);
  }
  const mocks = [...src.matchAll(MOCK_RE)].map((m) => resolveSpec(rel, m[1], cfg)).filter(Boolean);
  return { deps, mocks };
}

// 시작 파일들에서 import를 따라간다. mock된 모듈은 실제로 실행되지 않으므로 따라가지 않고 따로 기록한다
function walk(starts, cfg, mocked = new Set()) {
  const seen = new Set();
  const queue = [...starts];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f) || mocked.has(f)) continue;
    seen.add(f);
    for (const d of parseFile(f, cfg).deps) if (!seen.has(d)) queue.push(d);
  }
  return seen;
}

// ---------- E2E: 라우트 → App Router 파일 ----------

function listFiles(dirRel) {
  const out = [];
  const stack = [dirRel];
  while (stack.length) {
    const d = stack.pop();
    for (const e of readdirSync(abs(d), { withFileTypes: true })) {
      const p = posix.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function routeToFiles(route, cfg) {
  const appDir = posix.join(cfg.appRoot, cfg.nextAppDir);
  const want = route.split("?")[0].replace(/\/+$/, "") || "/";
  const pages = listFiles(appDir).filter((f) => /\/page\.(t|j)sx?$/.test(f));
  const hit = pages.find((p) => {
    const segs = posix
      .dirname(posix.relative(appDir, p))
      .split("/")
      .filter((s) => s && s !== "." && !/^\(.*\)$/.test(s));
    return "/" + segs.join("/") === want || (want === "/" && segs.length === 0);
  });
  if (!hit) return [];
  // 페이지와 그 위의 모든 layout.tsx (헤더처럼 레이아웃에 있는 UI도 이 화면의 일부다)
  const files = [hit];
  let dir = posix.dirname(hit);
  while (dir.length >= appDir.length) {
    for (const ext of cfg.extensions) {
      const l = posix.join(dir, `layout${ext}`);
      if (existsSync(abs(l))) files.push(l);
    }
    if (dir === appDir) break;
    dir = posix.dirname(dir);
  }
  return files;
}

// ---------- 시나리오 연결 ----------

export function linkScenario(sc, cfg) {
  const files = new Set();
  const mocked = new Set();
  const routes = new Set();
  const mockedRoutes = new Set();
  for (const ref of sc.verifiedBy) {
    const file = posix.join(cfg.appRoot, ref.file);
    if (ref.runner === "vitest") {
      const ms = new Set(parseFile(file, cfg).mocks);
      ms.forEach((m) => mocked.add(m));
      walk([file], cfg, ms).forEach((f) => files.add(f));
    } else if (ref.runner === "script") {
      // 스크립트 검사는 스크립트 자신과 설정, 그리고 config.live.links에 적은 코드에 연결된다
      walk(
        [ref.file, ...(cfg.live?.links ?? []).map((p) => posix.join(cfg.appRoot, p))],
        cfg
      ).forEach((f) => files.add(f));
      // config.json 전체를 연결하면 무관한 키(gapDirs 등)를 바꿔도 재검증 필요가 된다. 스크립트와 links만 연결한다
    } else if (ref.runner === "playwright") {
      const src = readFileSync(abs(file), "utf8");
      for (const m of src.matchAll(/goto\(\s*["'`](\/[^"'`]*)/g)) routes.add(m[1]);
      for (const m of src.matchAll(/route\(\s*["'`]([^"'`]+)/g)) mockedRoutes.add(m[1]);
      const starts = [file, ...cfg.e2eAlwaysLink.map((p) => posix.join(cfg.appRoot, p))];
      for (const r of routes) starts.push(...routeToFiles(r, cfg));
      walk(starts, cfg).forEach((f) => files.add(f));
    }
  }
  return {
    files: [...files].sort(),
    mocked: [...mocked].sort(),
    routes: [...routes].sort(),
    mockedRoutes: [...mockedRoutes].sort(),
  };
}

export function fingerprint(files) {
  const out = {};
  for (const f of files) {
    const p = abs(f);
    out[f] = existsSync(p)
      ? createHash("sha1")
          .update(readFileSync(p, "utf8").replace(/\r\n/g, "\n"))
          .digest("hex")
          .slice(0, 12)
      : "missing";
  }
  return out;
}

// ---------- 사실과 상태 ----------

export function loadFacts() {
  const p = posix.join(KDIR, "facts.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// 상태: hold(사람이 보류) | unverified(검증 수단 없음/기록 없음) | failing | stale | fresh
export function statusOf(sc, cfg, facts, link = linkScenario(sc, cfg)) {
  if (sc.hold) return { status: "hold", reason: `보류: ${sc.hold}`, link };
  if (sc.verifiedBy.length === 0)
    return { status: "unverified", reason: "검증하는 테스트가 없음", link };
  const last = facts.filter((f) => f.scenario === sc.id && f.result !== "skipped").at(-1);
  if (!last) return { status: "unverified", reason: "아직 실행 기록 없음", link };
  if (last.result !== "pass")
    return {
      status: "failing",
      reason: `마지막 실행 ${last.result} (${last.at.slice(0, 16)})`,
      link,
      last,
    };
  const now = fingerprint(link.files);
  const changed = link.files.filter((f) => last.fingerprint[f] !== now[f]);
  const removed = Object.keys(last.fingerprint).filter((f) => !(f in now));
  if (changed.length || removed.length) {
    return { status: "stale", reason: "검증 뒤 연결된 코드가 바뀜", changed, removed, link, last };
  }
  if (sc.maxAgeDays) {
    const days = (Date.now() - Date.parse(last.at)) / 86400000;
    if (days > sc.maxAgeDays)
      return {
        status: "stale",
        reason: `외부 의존이라 ${sc.maxAgeDays}일마다 재검증 (${Math.floor(days)}일 지남)`,
        link,
        last,
      };
  }
  return {
    status: "fresh",
    reason: last.partial ? "통과 (일부 테스트 건너뜀)" : "통과",
    link,
    last,
  };
}

// ---------- 발견 (findings) ----------
// 점검 중 눈에 띈 문제를 적는다. 시나리오의 실패와 달리 "아직 검사로 고정되지 않은 관찰"이다.
// 상태: open(미처리) | fixed(고침, 가능하면 검사로 고정됨) | wontfix(안 고침, 이유 기록) | observed(고칠 게 없는 관찰)
export function loadFindings() {
  const p = posix.join(KDIR, "findings.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// 같은 id의 최신 항목이 현재 상태다 (지우지 않고 덧붙인다)
export function currentFindings() {
  const by = new Map();
  for (const f of loadFindings()) by.set(f.id, { ...(by.get(f.id) ?? {}), ...f });
  return [...by.values()];
}

export function gitInfo() {
  const g = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
  return {
    commit: g("rev-parse", "--short", "HEAD"),
    branch: g("rev-parse", "--abbrev-ref", "HEAD"),
    dirty: g("status", "--porcelain").length > 0,
  };
}
