// QATester 지식 장부 엔진 (프로젝트 독립). 프로젝트별 값은 qa-knowledge/config.json에만 둔다.
//
// 핵심 개념
// - 시나리오: 사용자 동작 단위의 주장(claim). 어떤 테스트가 그 주장을 검증하는지(verifiedBy)는 사람이 정한다. 테스트 작성 에이전트는 추가만 된다(hook)
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
// 문자열로 부르는 API: fetch("/api/x"), fetch(`/api/x/${id}`), axios.get("/api/x"), Playwright request.post("/api/x").
// 인자가 "/api/"로 시작하는 리터럴일 때만 잡는다. 변수로 조립한 주소는 못 본다 (보수적으로)
const API_CALL_RE =
  /\b(?:fetch|axios\.(?:get|post|put|patch|delete)|request\.(?:get|post|put|patch|delete|fetch))\(\s*(["'`])(\/api\/[^"'`]*)\1/g;
// const URL = "/api/x" ... fetch(URL) 같은 단순한 상수 한 단계만 따라간다
const API_CONST_RE = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'`])(\/api\/[^"'`]*)\2/g;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  const apis = new Set([...src.matchAll(API_CALL_RE)].map((m) => m[2]));
  for (const m of src.matchAll(API_CONST_RE))
    if (new RegExp(`\\bfetch\\(\\s*${escapeRe(m[1])}\\b`).test(src)) apis.add(m[3]);
  return { deps, mocks, apis: [...apis] };
}

// API 경로 → App Router의 route 파일. /api/a/b → src/app/api/a/b/route.ts
// - 리터럴 세그먼트가 먼저다 (/api/collections/invite는 [id]가 아니라 invite)
// - ${...}만으로 된 세그먼트는 그 자리에 동적 디렉터리([x])가 정확히 하나일 때만 잇는다
// - 끝에 붙은 ${...}(쿼리 문자열 등)는 떼고 본다. 라우트 그룹 (group)은 건너뛴다
// 못 찾으면 null. 틀리게 잇는 것보다 빠뜨리고 "못 찾음"으로 보여 주는 게 낫다
export function apiToRouteFile(apiPath, cfg) {
  const appDir = posix.join(cfg.appRoot, cfg.nextAppDir);
  const clean = apiPath
    .split("?")[0]
    // 세그먼트 뒤에 붙은 ${...}만 뗀다 (/api/x${qs}). 세그먼트 전체가 ${id}면 동적 경로라 남긴다
    .replace(/([^/])\$\{[^}]*\}$/, "$1")
    .replace(/\/+$/, "");
  const segs = clean.split("/").filter(Boolean);
  const dirsOf = (d) =>
    existsSync(abs(d))
      ? readdirSync(abs(d), { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : [];
  // 라우트 그룹은 URL에 나오지 않으므로 같은 높이의 그룹 안까지 후보로 본다
  const withGroups = (d) => [
    d,
    ...dirsOf(d)
      .filter((n) => /^\(.*\)$/.test(n))
      .flatMap((n) => withGroups(posix.join(d, n))),
  ];
  let dirs = [appDir];
  for (const seg of segs) {
    const next = [];
    for (const base of dirs.flatMap(withGroups)) {
      const names = dirsOf(base);
      if (!seg.includes("${")) {
        if (names.includes(seg)) next.push(posix.join(base, seg));
      } else if (/^\$\{[^}]*\}$/.test(seg)) {
        const dyn = names.filter((n) => /^\[[^\]]+\]$/.test(n));
        if (dyn.length === 1) next.push(posix.join(base, dyn[0]));
      }
    }
    if (!next.length) return null;
    dirs = next;
  }
  for (const d of dirs.flatMap(withGroups))
    for (const ext of cfg.extensions) {
      const f = posix.join(d, `route${ext}`);
      if (existsSync(abs(f))) return f;
    }
  return null;
}

// Playwright route 패턴(glob)이 이 API 경로를 가리키는가. 페이지가 부르는 주소는 http://host/api/... 꼴이다
function globHits(pattern, apiPath) {
  const re = new RegExp(
    "^" +
      pattern
        .split("**/")
        .map((part) =>
          part
            .split("**")
            .map((p) => p.split("*").map(escapeRe).join("[^/]*"))
            .join(".*")
        )
        .join("(?:.*/)?") +
      "$"
  );
  const p = apiPath.split("?")[0].replace(/\$\{[^}]*\}/g, "x");
  return re.test(p) || re.test(`http://localhost${p}`);
}

// 시작 파일들에서 import를 따라간다. mock된 모듈은 실제로 실행되지 않으므로 따라가지 않고 따로 기록한다
// api 옵션: 문자열로 부르는 API를 어떻게 다룰지
//  - follow: true면 route 파일까지 이어서 따라간다 (실제 서버가 뜨는 E2E)
//  - mockedPatterns: 응답을 가짜로 바꾸는 패턴(page.route). 걸리면 잇지 않고 mockedApi에 남긴다
//  - follow가 false면(단위 테스트, 서버 없음) 전부 mockedApi에 남긴다
function walk(starts, cfg, mocked = new Set(), api = null) {
  const seen = new Set();
  const queue = [...starts];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f) || mocked.has(f)) continue;
    seen.add(f);
    const parsed = parseFile(f, cfg);
    for (const d of parsed.deps) if (!seen.has(d)) queue.push(d);
    if (!api) continue;
    for (const a of parsed.apis) {
      const route = apiToRouteFile(a, cfg);
      const label = route ? `${a} → ${route}` : `${a} (route 파일 못 찾음)`;
      if (!api.follow || api.mockedPatterns.some((p) => globHits(p, a))) api.mockedApi.add(label);
      else if (route && !seen.has(route)) queue.push(route);
    }
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

// ---------- 검증 테스트(ref) 하나의 연결 ----------

export const refId = (ref) => `${ref.runner}:${ref.file}${ref.name ? `::${ref.name}` : ""}`;

// ref 하나가 의존하는 코드. 시나리오의 연결은 ref별 연결의 합이다.
// 신선도도 ref별로 본다: 그 ref가 마지막으로 돈 때의 해시와, 그 ref에 연결된 파일의 지금 해시를 비교한다
export function linkRef(ref, cfg) {
  const files = new Set();
  const mocked = new Set();
  const routes = new Set();
  const mockedRoutes = new Set();
  const mockedApi = new Set();
  const file = posix.join(cfg.appRoot, ref.file);
  // 검증 테스트 파일이 없으면(경로 오타, 삭제) 이 ref만 오류로 두고 나머지 시나리오 판정은 계속한다
  const own = ref.runner === "script" ? ref.file : file;
  if (!existsSync(abs(own))) return { files, mocked, routes, mockedRoutes, missing: own };
  if (ref.runner === "vitest") {
    const ms = new Set(parseFile(file, cfg).mocks);
    ms.forEach((m) => mocked.add(m));
    // 단위 테스트에는 서버가 없다. fetch("/api/x")는 mock되거나 실패하므로 그 route는 이 테스트로 검증되지 않는다.
    // (route 핸들러를 직접 import하는 테스트는 위 import 그래프로 이미 연결된다)
    walk([file], cfg, ms, { follow: false, mockedPatterns: [], mockedApi }).forEach((f) =>
      files.add(f)
    );
  } else if (ref.runner === "script") {
    // 스크립트 검사는 스크립트 자신과 config.live.links에 적은 코드에 연결된다.
    // config.json 전체를 연결하면 무관한 키(gapDirs 등)를 바꿔도 재검증 필요가 된다
    walk(
      [ref.file, ...(cfg.live?.links ?? []).map((p) => posix.join(cfg.appRoot, p))],
      cfg
    ).forEach((f) => files.add(f));
  } else if (ref.runner === "playwright") {
    const src = readFileSync(abs(file), "utf8");
    for (const m of src.matchAll(/goto\(\s*["'`](\/[^"'`]*)/g)) routes.add(m[1]);
    // fulfill/abort로 응답을 바꾸는 route만 mock이다. continue()로 통과만 시키는 것은 빼지 않는다
    for (const m of src.matchAll(
      /route\(\s*["'`]([^"'`]+)["'`][\s\S]{0,400}?\.(fulfill|abort|continue)\(/g
    ))
      if (m[2] !== "continue") mockedRoutes.add(m[1]);
    const starts = [file, ...cfg.e2eAlwaysLink.map((p) => posix.join(cfg.appRoot, p))];
    for (const r of routes) starts.push(...routeToFiles(r, cfg));
    // E2E는 실제 개발 서버를 띄우므로 화면이 부르는 API의 route까지 잇는다. 단 page.route로 가짜 응답을 준 것은 뺀다
    walk(starts, cfg, new Set(), {
      follow: true,
      mockedPatterns: [...mockedRoutes],
      mockedApi,
    }).forEach((f) => files.add(f));
  }
  return { files, mocked, routes, mockedRoutes, mockedApi };
}

export function linkScenario(sc, cfg) {
  const out = {
    files: new Set(),
    mocked: new Set(),
    routes: new Set(),
    mockedRoutes: new Set(),
    mockedApi: new Set(),
  };
  for (const ref of sc.verifiedBy) {
    const l = linkRef(ref, cfg);
    for (const k of Object.keys(out)) l[k].forEach((v) => out[k].add(v));
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

// 시나리오 정의(주장, 검증 테스트, 재검증 주기)의 해시. 정의가 바뀌면 그 전의 근거는 이 주장을 증명하지 않는다
export function defHash(sc) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        claim: sc.claim,
        verifiedBy: sc.verifiedBy,
        maxAgeDays: sc.maxAgeDays ?? null,
      })
    )
    .digest("hex")
    .slice(0, 12);
}

// 테스트 제목이 ref.name에 맞는가. "/.../"면 정규식, 아니면 부분 문자열(예전 호환).
// 넓게 걸리는 걸 막는 장치는 recheck가 근거에 실제 제목을 남기고, 다음 실행에서 줄면 오류로 멈추는 것이다
export function nameMatches(name, title) {
  if (!name) return true;
  const m = name.match(/^\/(.+)\/([a-z]*)$/);
  return m ? new RegExp(m[1], m[2]).test(title) : title.includes(name);
}

// 파일 경로가 ref.file과 같은 파일인가. 접미사만 비교하면 qa-header.spec.ts가 header.spec.ts로 잡힌다
export function sameFile(reported, refFile) {
  const r = reported.replace(/\\/g, "/");
  const f = refFile.replace(/\\/g, "/");
  return r === f || r.endsWith(`/${f}`);
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

// 사실 중 사람이 무효로 표시한 것 (지우지 않고 무효 기록을 덧붙인다). 키: "시나리오@사실 시각"
function voidedKeys(facts) {
  return new Set(facts.filter((f) => f.type === "void").map((f) => `${f.scenario}@${f.target}`));
}

// 상태
//  hold        사람이 보류
//  unverified  검증 테스트가 없거나, 아직 한 번도 돌지 않음
//  failing     검증 테스트가 실제로 실패 (제품이 주장대로 동작하지 않을 수 있음)
//  broken      검사 자체가 오류 (환경, 도구, 근거 테스트가 사라짐). 제품 실패로 세지 않는다
//  stale       검증 뒤 연결된 코드나 시나리오 정의가 바뀌었거나, 외부 의존 주기가 지남
//  partial     일부만 확인됨. needsRun이면 아직 안 돈 검증 테스트가 있고, 아니면 skip된 테스트가 있다
//  fresh       전부 확인됨
//
// 판정은 검증 테스트(ref)마다 "마지막으로 실제로 돈 기록"을 따로 골라서 한다.
// 그래서 E2E 없이 돌린 통과가 이전의 E2E 실패를 덮지 않는다
export function statusOf(sc, cfg, facts, link = linkScenario(sc, cfg)) {
  if (sc.hold) return { status: "hold", reason: `보류: ${sc.hold}`, link };
  if (sc.verifiedBy.length === 0)
    return { status: "unverified", reason: "검증하는 테스트가 없음", link };

  const voided = voidedKeys(facts);
  const mine = facts
    .filter((f) => f.type !== "void" && f.scenario === sc.id && !voided.has(`${sc.id}@${f.at}`))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const def = defHash(sc);
  // 정의 해시가 없는 옛 기록은 유효로 본다 (이 기능 이전 기록)
  const valid = mine.filter((f) => !f.defHash || f.defHash === def);
  if (mine.length && !valid.length)
    return {
      status: "stale",
      reason: "시나리오 정의(주장, 검증 테스트, 주기)가 바뀌어 이전 근거가 이 주장을 증명하지 않음",
      link,
      last: mine.at(-1),
    };

  const missing = sc.verifiedBy.map((ref) => linkRef(ref, cfg).missing).filter(Boolean);
  if (missing.length)
    return { status: "broken", reason: `검증 테스트 파일이 없음: ${missing.join(", ")}`, link };

  const perRef = sc.verifiedBy.map((ref) => {
    const id = refId(ref);
    let latest = null;
    for (const f of valid) {
      const t = f.tests?.find((t) => t.ref === id && t.result !== "skipped");
      if (t) latest = { fact: f, test: t };
    }
    return { ref, id, latest };
  });
  const ran = perRef.filter((p) => p.latest);
  if (!ran.length)
    return { status: "unverified", reason: "아직 실행 기록 없음", link, refs: perRef };
  const last = ran
    .map((p) => p.latest.fact)
    .sort((a, b) => (a.at < b.at ? -1 : 1))
    .at(-1);
  const when = (p) => p.latest.fact.at.slice(0, 16);

  const failed = ran.filter((p) => p.latest.test.result === "fail");
  if (failed.length)
    return {
      status: "failing",
      reason: `실패: ${failed.map((p) => `${p.id} (${when(p)})`).join(", ")}`,
      link,
      last,
      refs: perRef,
    };
  const errored = ran.filter((p) => p.latest.test.result === "error");
  if (errored.length)
    return {
      status: "broken",
      reason: `검사 오류 (제품 실패 아님): ${errored
        .map((p) => `${p.id}${p.latest.test.reason ? ` — ${p.latest.test.reason}` : ""}`)
        .join(", ")}`,
      link,
      last,
      refs: perRef,
    };

  // 신선도: ref마다 그 ref가 돈 때의 해시와, 그 ref에 연결된 파일의 지금 해시를 비교한다
  const changed = new Set();
  for (const p of ran) {
    const files = [...linkRef(p.ref, cfg).files];
    const now = fingerprint(files);
    const then = p.latest.fact.fingerprint ?? {};
    for (const f of files) if (then[f] !== now[f]) changed.add(f);
  }
  if (changed.size)
    return {
      status: "stale",
      reason: "검증 뒤 연결된 코드가 바뀜",
      changed: [...changed].sort(),
      removed: [],
      link,
      last,
      refs: perRef,
    };

  if (sc.maxAgeDays) {
    const oldest = ran.map((p) => Date.parse(p.latest.fact.at)).sort((a, b) => a - b)[0];
    const days = (Date.now() - oldest) / 86400000;
    // 매일 같은 시각에 도는 나이틀리가 몇 분 차이로 하루를 건너뛰지 않게 1시간 여유를 둔다
    if (days > sc.maxAgeDays - 1 / 24)
      return {
        status: "stale",
        reason: `외부 의존이라 ${sc.maxAgeDays}일마다 재검증 (${days.toFixed(1)}일 지남)`,
        link,
        last,
        refs: perRef,
      };
  }

  const notRun = perRef.filter((p) => !p.latest);
  if (notRun.length)
    return {
      status: "partial",
      needsRun: true,
      reason: `아직 안 돈 검증: ${notRun.map((p) => p.id).join(", ")}`,
      link,
      last,
      refs: perRef,
    };
  const skipped = ran.reduce((n, p) => n + (p.latest.test.skipped ?? 0), 0);
  if (skipped)
    return {
      status: "partial",
      needsRun: false,
      reason: `통과, 단 skip된 테스트 ${skipped}개는 확인되지 않음`,
      link,
      last,
      refs: perRef,
    };
  return { status: "fresh", reason: "통과", link, last, refs: perRef };
}

// recheck와 나이틀리가 다시 돌릴 상태
export const needsRecheck = (r, sc) =>
  sc.verifiedBy.length > 0 &&
  (r.status === "stale" ||
    r.status === "failing" ||
    r.status === "broken" ||
    r.status === "unverified" ||
    (r.status === "partial" && r.needsRun));

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
