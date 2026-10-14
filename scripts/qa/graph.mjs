// 코드 그래프(Graphify)로 연결 좁히기. 기본은 꺼져 있다 (config.graph.enabled, 환경변수 QA_GRAPH, CLI --graph).
//
// 기존 연결(파일 import를 끝까지 따라감)은 "불러온 파일"이다. 여기서는 그중 "테스트가 실제로 닿는 최상위 코드가 있는 파일"만 남긴다.
// 결과는 항상 기존 연결의 부분집합이다. mock, 타입 전용 import, 문자열 API 규칙은 기존 연결이 이미 걸러 둔 것을 그대로 쓴다.
//
// 어떻게 닿는 코드를 찾나
// - 파일을 최상위 문장 단위로 나눈다 (문자열, 주석, 템플릿, 괄호 깊이를 따지는 작은 토크나이저)
// - 시작 파일(테스트 파일, E2E의 페이지와 레이아웃)은 통째로 닿은 것으로 본다
// - 닿은 문장 안에 나오는 식별자를 그 파일의 최상위 이름, import 이름과 맞춰 따라간다.
//   그래프의 호출 엣지만 쓰면 상수 읽기, 객체 메서드 호출(overlay.open), 인스턴스 메서드 호출(repo.save)을 놓쳐서 이렇게 한다.
//   주석이나 문자열에 나온 이름도 잡혀서 넓게 잡히는 쪽이다
// - 그래프의 호출, 참조 엣지(JSX 렌더링 포함)도 함께 따른다
// - 불러오기만 해도 실행되는 최상위 코드(함수, 클래스, 타입이 아닌 const 초기값, 맨 위의 실행문)는 불러온 모든 파일에서 닿은 것으로 본다
//
// 좁히지 않고 파일 통째로 두는 경우 (넓게 두는 쪽)
// - 그래프가 없거나, 기존 연결의 코드 파일 중 하나라도 그래프를 만든 뒤 바뀌었으면 그 검증 테스트 전체 (내용 md5 비교)
// - 토크나이저가 파일 끝에서 괄호나 문자열이 맞지 않으면 그 파일
// - 그래프가 본 최상위 심볼의 줄이 토크나이저가 나눈 문장의 시작과 어긋나면 그 파일 (두 파서가 구조에 동의할 때만 좁힌다)
// - namespace import, side-effect import, 동적 import, 이름을 못 찾은 export
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, apiToRouteFile, globHits, resolveSpec } from "./lib.mjs";

const posix = path.posix;
const abs = (rel) => posix.join(ROOT.replace(/\\/g, "/"), rel);

export const graphDir = (cfg) =>
  posix.join(ROOT.replace(/\\/g, "/"), cfg.graph?.dir ?? ".cache/qa-graph", "graphify-out");

// 켜짐 여부: QA_GRAPH(1/0)가 config보다 우선한다. qa.mjs의 --graph/--no-graph가 이 값을 넣고, nightly가 부르는 qa.mjs도 물려받는다
export function graphWanted(cfg) {
  if (process.env.QA_GRAPH === "1") return true;
  if (process.env.QA_GRAPH === "0") return false;
  return cfg.graph?.enabled === true;
}

let cached = null;
// 그래프를 읽어 파일별 색인을 만든다. 없거나 깨졌으면 null (호출한 쪽이 기존 연결로 돌아간다)
export function loadGraph(cfg) {
  const dir = graphDir(cfg);
  if (cached?.dir === dir) return cached.graph;
  const gp = posix.join(dir, "graph.json");
  const mp = posix.join(dir, "manifest.json");
  let graph = null;
  if (existsSync(gp) && existsSync(mp)) {
    try {
      graph = indexGraph(
        JSON.parse(readFileSync(gp, "utf8")),
        JSON.parse(readFileSync(mp, "utf8"))
      );
    } catch {
      graph = null;
    }
  }
  cached = { dir, graph };
  return graph;
}

const lineOf = (loc) => Number(String(loc ?? "").replace(/^L/, "")) || 0;
const FOLLOW = new Set([
  "calls",
  "indirect_call",
  "references",
  "extends",
  "implements",
  "inherits",
]);

function indexGraph(g, manifest) {
  const nodes = new Map(g.nodes.map((n) => [n.id, n]));
  const edges = g.edges ?? g.links ?? [];
  const files = new Map();
  const fileOf = (f) => {
    if (!files.has(f)) files.set(f, { module: null, topLines: [], out: [] });
    return files.get(f);
  };
  for (const n of g.nodes)
    if (n.source_file && n.label === posix.basename(n.source_file))
      fileOf(n.source_file).module = n.id;
  for (const e of edges) {
    if (e.relation !== "contains") continue;
    const s = nodes.get(e.source);
    const t = nodes.get(e.target);
    if (!s || !t?.source_file || fileOf(t.source_file).module !== s.id) continue;
    fileOf(t.source_file).topLines.push(lineOf(t.source_location));
  }
  // 엣지 방향은 엣지의 source_file 쪽이 출발이다 (그래프가 무방향으로 저장돼도 맞게)
  for (const e of edges) {
    if (!FOLLOW.has(e.relation) || !e.source_file) continue;
    let s = nodes.get(e.source);
    let t = nodes.get(e.target);
    if (!s || !t) continue;
    if (s.source_file !== e.source_file && t.source_file === e.source_file) [s, t] = [t, s];
    if (!t.source_file) continue;
    fileOf(e.source_file).out.push({
      line: lineOf(e.source_location),
      toFile: t.source_file,
      toLine: lineOf(t.source_location),
    });
  }
  const hashes = new Map(Object.entries(manifest).map(([f, v]) => [f, v.ast_hash]));
  return { files, hashes };
}

const md5 = (rel) =>
  createHash("md5")
    .update(readFileSync(abs(rel)))
    .digest("hex");
const isCode = (f, cfg) => cfg.extensions.some((e) => f.endsWith(e));

// 그래프가 이 파일들을 지금 내용 그대로 보고 만들어졌는가. 하나라도 다르면 좁히지 않는다.
// 코드가 아닌 파일(CSS 등)은 그래프가 보지 않으므로 검사하지 않고, 좁힐 때도 항상 남긴다
export function graphStaleFiles(graph, files, cfg) {
  return files.filter(
    (f) => isCode(f, cfg) && (!existsSync(abs(f)) || graph.hashes.get(f) !== md5(f))
  );
}

// ---------- 최상위 문장 나누기 ----------

// 줄마다 시작 시점이 "최상위(괄호 깊이 0, 문자열/주석/템플릿 밖)"인지 돌려준다. 끝에서 균형이 안 맞으면 null
export function topLevelLines(text) {
  const n = text.length;
  const atTop = [true];
  let depth = 0;
  const tmpl = []; // 템플릿 안의 ${ } 깊이 기록
  let i = 0;
  let prev = ""; // 정규식 리터럴 판단용: 직전의 의미 있는 문자
  const newline = () => atTop.push(depth === 0 && tmpl.length === 0);
  const inTemplate = () => {
    // 템플릿 문자열 본문. ` 로 끝나거나 ${ 로 식에 들어간다
    for (; i < n; i++) {
      const c = text[i];
      if (c === "\\") i++;
      else if (c === "\n") atTop.push(false);
      else if (c === "`") {
        i++;
        return;
      } else if (c === "$" && text[i + 1] === "{") {
        tmpl.push(depth);
        depth++;
        i += 2;
        return;
      }
    }
  };
  while (i < n) {
    const c = text[i];
    if (c === "\n") {
      newline();
      i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) return null;
      for (let k = i; k < end; k++) if (text[k] === "\n") atTop.push(false);
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      for (i++; i < n && text[i] !== c; i++) {
        if (text[i] === "\\") i++;
        else if (text[i] === "\n") return null; // 줄을 넘는 따옴표 문자열은 없다. JSX 본문의 ' 같은 것으로 본다
      }
      i++;
      prev = c;
      continue;
    }
    if (c === "`") {
      i++;
      inTemplate();
      prev = "`";
      continue;
    }
    if (c === "/" && (prev === "" || "(,=:[!&|?{;+-*%~^".includes(prev))) {
      // 정규식 리터럴
      let cls = false;
      for (i++; i < n; i++) {
        const d = text[i];
        if (d === "\\") i++;
        else if (d === "[") cls = true;
        else if (d === "]") cls = false;
        else if (d === "/" && !cls) break;
        else if (d === "\n") return null;
      }
      i++;
      prev = "/";
      continue;
    }
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") {
      depth--;
      if (depth < 0) return null;
      if (c === "}" && tmpl.length && tmpl.at(-1) === depth) {
        tmpl.pop();
        inTemplate();
        prev = "`";
        continue;
      }
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  if (depth !== 0 || tmpl.length) return null;
  return atTop;
}

const DECL_RE =
  /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(class|function\*?|const|let|var|enum|interface|type)\s+([A-Za-z_$][\w$]*)/;
const LAZY_INIT_RE = [
  /^(?:export\s+)?(?:const|let|var)\s+[\w$]+\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|[\w$]+)\s*(?::[^=]*)?=>/,
  /^(?:export\s+)?(?:const|let|var)\s+[\w$]+\s*(?::[^=]+)?=\s*(?:async\s+)?function\b/,
];

// 최상위 문장 목록. name: 선언 이름 또는 "@L<줄>"(이름 없는 실행문), eager: 불러오기만 해도 도는가
function segments(lines, atTop) {
  const starts = [];
  lines.forEach((l, k) => {
    if (atTop[k] && /^[A-Za-z_$@]/.test(l)) starts.push(k);
  });
  return starts.map((s, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : lines.length;
    const head = lines[s];
    const body = lines.slice(s, end).join("\n");
    const seg = { start: s + 1, end, body };
    if (/^import\b/.test(head) && !/^import\s*\(/.test(head)) return { ...seg, kind: "import" };
    if (/^export\s+(type\s+)?(\{|\*)/.test(head)) return { ...seg, kind: "exportlist" };
    const d = head.match(DECL_RE);
    if (d) {
      const lazy =
        /^(class|function|interface|type)/.test(d[1]) || LAZY_INIT_RE.some((re) => re.test(head));
      return {
        ...seg,
        kind: "decl",
        name: d[2],
        eager: !lazy,
        isDefault: /^export\s+default\b/.test(head),
      };
    }
    const def = head.match(/^export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/);
    if (def) return { ...seg, kind: "default", alias: def[1] };
    if (/^export\s+default\b/.test(head))
      return { ...seg, kind: "decl", name: "default", eager: true };
    return { ...seg, kind: "stmt", name: `@L${s + 1}`, eager: true };
  });
}

// ---------- 파일 하나의 색인 (import 이름, 문장, 그래프 엣지) ----------

const IMPORT_RE = /(?:^|[\s;])import\s+(type\s+)?([^'"`;]*?)\s+from\s+["']([^"']+)["']/g;
const SIDE_IMPORT_RE = /(?:^|[\s;])import\s+["']([^"']+)["']/g;
const REEXPORT_NAMED_RE = /export\s+(type\s+)?\{([^}]*)\}\s*from\s+["']([^"']+)["']/g;
const REEXPORT_STAR_RE = /export\s+\*\s+(?:as\s+([\w$]+)\s+)?from\s+["']([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["']([^"']+)["']\s*\)/g;
const IDENT_RE = /[A-Za-z_$][\w$]*/g;
const API_CALL_RE =
  /\b(?:fetch|axios\.(?:get|post|put|patch|delete)|request\.(?:get|post|put|patch|delete|fetch))\(\s*(["'`])(\/api\/[^"'`]*)\1/g;
const API_CONST_RE = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'`])(\/api\/[^"'`]*)\2/g;

const fileCache = new Map();
export function fileInfo(rel, cfg, graph) {
  if (fileCache.has(rel)) return fileCache.get(rel);
  const text = readFileSync(abs(rel), "utf8");
  const lines = text.split(/\r?\n/);
  const g = graph.files.get(rel);
  const atTop = topLevelLines(text.replace(/\r\n/g, "\n"));
  let modeled = !!g && !!atTop;
  const segs = modeled ? segments(lines, atTop) : [];
  // 그래프가 본 최상위 심볼 중 맨 앞 칸에서 시작하는 것은 반드시 문장 시작이어야 한다. 어긋나면 이 파일은 나누지 않는다
  if (modeled) {
    const startSet = new Set(segs.map((s) => s.start));
    for (const L of g.topLines)
      if (/^\S/.test(lines[L - 1] ?? "") && !startSet.has(L)) modeled = false;
  }
  const ranges = new Map();
  let defaultName = null;
  for (const s of segs) {
    if (s.kind === "default") defaultName = s.alias;
    if (!s.name) continue;
    if (s.isDefault) defaultName = s.name;
    ranges.set(s.name, (ranges.get(s.name) ?? "") + "\n" + s.body);
  }
  const eager = segs.filter((s) => s.eager).map((s) => s.name);
  const ownerOf = (line) => segs.findLast((s) => s.start <= line)?.name ?? null;
  const bindings = new Map(); // 이 파일 안의 이름 → [대상 파일, 대상 export 이름 | "default" | "*"]
  const whole = new Set();
  for (const m of text.matchAll(IMPORT_RE)) {
    if (m[1]) continue;
    const target = resolveSpec(rel, m[3], cfg);
    if (!target) continue;
    const clause = m[2].trim();
    const def = clause.match(/^([A-Za-z_$][\w$]*)\s*(,|$)/);
    if (def) bindings.set(def[1], [target, "default"]);
    const ns = clause.match(/\*\s+as\s+([\w$]+)/);
    if (ns) bindings.set(ns[1], [target, "*"]);
    const named = clause.match(/\{([^}]*)\}/);
    if (named)
      for (const part of named[1].split(",")) {
        const p = part.trim();
        if (!p || /^type\s/.test(p)) continue;
        const [imported, local = imported] = p.split(/\s+as\s+/).map((s) => s.trim());
        bindings.set(local, [target, imported]);
      }
  }
  for (const m of text.matchAll(SIDE_IMPORT_RE)) {
    const target = resolveSpec(rel, m[1], cfg);
    if (target) whole.add(target);
  }
  const info = {
    text,
    ranges,
    eager,
    defaultName,
    ownerOf,
    bindings,
    whole,
    modeled,
    out: g?.out ?? [],
  };
  fileCache.set(rel, info);
  return info;
}

// 파일 rel이 name으로 내보내는 것이 실제로 어느 파일의 어느 문장인가. 모르면 그 파일 통째로("*").
// [파일, null]은 지나가기만 하는 배럴 파일 (불러오므로 연결에는 넣는다)
function resolveExport(rel, name, cfg, graph, depth = 0) {
  if (!isCode(rel, cfg)) return [[rel, "*"]];
  const info = fileInfo(rel, cfg, graph);
  if (!info.modeled || name === "*" || depth > 5) return [[rel, "*"]];
  if (name === "default")
    return info.defaultName && info.ranges.has(info.defaultName)
      ? [[rel, info.defaultName]]
      : [[rel, "*"]];
  if (info.ranges.has(name)) return [[rel, name]];
  for (const m of info.text.matchAll(REEXPORT_NAMED_RE)) {
    if (m[1]) continue;
    for (const part of m[2].split(",")) {
      const [imported, exported = imported] = part
        .trim()
        .split(/\s+as\s+/)
        .map((s) => s.trim());
      if (exported !== name) continue;
      const t = resolveSpec(rel, m[3], cfg);
      return t ? [[rel, null], ...resolveExport(t, imported, cfg, graph, depth + 1)] : [[rel, "*"]];
    }
  }
  const stars = [...info.text.matchAll(REEXPORT_STAR_RE)].filter((m) => !m[1]);
  if (stars.length)
    return [
      [rel, null],
      ...stars.flatMap((m) => {
        const t = resolveSpec(rel, m[2], cfg);
        return t ? resolveExport(t, name, cfg, graph, depth + 1) : [];
      }),
    ];
  return [[rel, "*"]];
}

// ---------- 좁히기 ----------

// wide: 기존 연결. starts: 통째로 실행된다고 볼 시작 파일 (테스트 파일, E2E의 페이지와 레이아웃, 미들웨어)
// mocked: vi.mock된 파일 (기존 연결에서 이미 빠짐). api: E2E면 { mockedPatterns }. 닿은 문장 안의 문자열 API 호출만 route로 잇는다
export function narrowFiles({ wide, starts, mocked, api, cfg, graph }) {
  const allowed = new Set(wide);
  const reached = new Map(); // 파일 → Set(문장 이름) | "*"
  const queue = [];
  const push = (file, sym) => {
    if (!file || !allowed.has(file) || mocked.has(file)) return;
    const cur = reached.get(file);
    if (cur === "*") return;
    if (sym === null) {
      if (!cur) reached.set(file, new Set());
      return;
    }
    if (sym === "*") {
      reached.set(file, "*");
      queue.push([file, "*"]);
      return;
    }
    if (!cur) reached.set(file, new Set([sym]));
    else if (cur.has(sym)) return;
    else cur.add(sym);
    queue.push([file, sym]);
  };
  for (const s of starts) push(s, "*");
  for (const f of wide) {
    // 코드가 아닌 파일(CSS)은 그대로 두고, 나누지 못한 코드 파일은 통째로 둔다
    if (!isCode(f, cfg)) {
      push(f, null);
      continue;
    }
    const info = fileInfo(f, cfg, graph);
    if (!info.modeled) push(f, "*");
    for (const e of info.eager) push(f, e);
    for (const w of info.whole) push(w, "*");
  }
  while (queue.length) {
    const [file, sym] = queue.shift();
    if (!isCode(file, cfg)) continue;
    const info = fileInfo(file, cfg, graph);
    if (sym !== "*" && (!info.modeled || !info.ranges.has(sym))) {
      push(file, "*");
      continue;
    }
    const text = sym === "*" ? info.text : info.ranges.get(sym);
    for (const id of new Set(text.match(IDENT_RE) ?? [])) {
      if (id !== sym && info.ranges.has(id)) push(file, id);
      const b = info.bindings.get(id);
      if (b) for (const [f, s] of resolveExport(b[0], b[1], cfg, graph)) push(f, s);
    }
    for (const m of text.matchAll(DYNAMIC_RE)) push(resolveSpec(file, m[1], cfg), "*");
    // 그래프 엣지 (호출, JSX 렌더링, 값으로 넘긴 함수, 타입 참조)
    for (const e of info.out) {
      if (sym !== "*" && info.ownerOf(e.line) !== sym) continue;
      if (!isCode(e.toFile, cfg) || !allowed.has(e.toFile)) continue;
      const t = fileInfo(e.toFile, cfg, graph);
      push(e.toFile, t.modeled ? (t.ownerOf(e.toLine) ?? "*") : "*");
    }
    if (api) {
      const paths = new Set([...text.matchAll(API_CALL_RE)].map((m) => m[2]));
      for (const m of text.matchAll(API_CONST_RE))
        if (new RegExp(`\\bfetch\\(\\s*${m[1].replace(/\$/g, "\\$")}\\b`).test(info.text))
          paths.add(m[3]);
      for (const a of paths)
        if (!api.mockedPatterns.some((p) => globHits(p, a))) push(apiToRouteFile(a, cfg), "*");
    }
  }
  return new Set(reached.keys());
}
