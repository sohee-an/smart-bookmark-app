// 문서에 적힌 파일 경로가 실제 저장소에 있는지 검사한다. CI의 "Lint & Typecheck"에서 돈다.
//
// 코드는 lint와 typecheck가 지키지만, 문서(CLAUDE.md, PROJECT_INDEX.md, 에이전트·스킬·명령)는
// 파일을 옮겨도 아무 검사에 걸리지 않아 계속 옛 경로를 가리켰다(2026-10에 21곳 발견).
// 경로의 기준은 PROJECT_INDEX.md 한 곳이고, 이 스크립트는 그 기준이 실제 코드와 맞는지 확인한다.
//
// 존재 여부는 `git ls-files`(추적되는 파일) 기준이다. 로컬과 CI에서 결과가 같다.
// 건너뛰는 것:
//  - 자리표시자가 든 경로: `<name>`, `{...}`, `YYYY`, `$VAR`, `[대상]`, `xxx`
//  - "작성 예정"이 적힌 줄 (앞으로 만들 파일)
//  - gitignore 대상 경로 (리뷰 결과 보관소 .claude/project/, 개인 노트 docs/personal/ 등 로컬 전용)
//  - 외부 원본 그대로 둔 스킬(.claude/skills/owasp-security/)
// 통과로 보는 것:
//  - `*`가 든 경로: `*` 앞부분으로 시작하는 파일이 하나라도 있으면
//  - 확장자 없는 마지막 조각: 그걸로 시작하는 파일이 있으면 (예: `docs/decisions/028` → `028-RLS-...md`)
//  - 뒤에 한국어 조사가 붙은 경우: 조사를 떼고 다시 확인 (예: `shared/ui에`)
//
// 사용: node scripts/check-doc-paths.mjs [--json 결과파일]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const trackedSet = new Set(tracked);

const SKIP_DOCS = [/^\.claude\/skills\/owasp-security\//, /^\.claude\/project\//];
const docs = tracked.filter(
  (f) =>
    ["claude.md", "CLAUDE.md", "PROJECT_INDEX.md"].includes(f) ||
    (f.startsWith(".claude/") && f.endsWith(".md") && !SKIP_DOCS.some((re) => re.test(f)))
);

// 저장소 루트 기준 경로로 보이는 토큰. 라우트 그룹 `(main)`, 동적 세그먼트 `[id]`를 허용한다.
const PATH_RE =
  /(?<![\w./-])((?:apps|packages|docs|supabase|scripts|\.claude|\.github)\/[\p{L}\p{N}_.()[\]@*\/-]+)/gu;
const PLACEHOLDER = /[<{$]|YYYY|xxx|\[대상\]/;

function existsExact(p) {
  const path = p.replace(/\/+$/, "");
  if (path.includes("*")) {
    const prefix = path.slice(0, path.indexOf("*"));
    return tracked.some((f) => f.startsWith(prefix));
  }
  if (trackedSet.has(path) || tracked.some((f) => f.startsWith(path + "/"))) return true;
  const last = path.split("/").pop();
  return !last.includes(".") && tracked.some((f) => f.startsWith(path));
}

function exists(p) {
  if (existsExact(p)) return true;
  const stripped = p.replace(/[\p{Script=Hangul}]+$/u, "").replace(/[.,:;)\]]+$/, "");
  return stripped !== p && existsExact(stripped);
}

function ignored(p) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", p.replace(/\*.*$/, "")]);
    return true;
  } catch {
    return false;
  }
}

const problems = [];
for (const doc of docs) {
  const lines = readFileSync(doc, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("작성 예정")) return;
    for (const m of line.matchAll(PATH_RE)) {
      // 마크다운 링크 `[글](경로)`의 `](` 앞에서 자르고, 끝의 문장부호를 뗀다
      const raw = m[1].split("](")[0].replace(/[.,:;)\]]+$/, "");
      if (PLACEHOLDER.test(line.slice(m.index, m.index + m[0].length + 2))) continue;
      if (exists(raw) || ignored(raw)) continue;
      problems.push({ file: doc, line: i + 1, path: raw });
    }
  });
}

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx !== -1) {
  writeFileSync(
    process.argv[jsonIdx + 1],
    JSON.stringify({ checked: docs.length, problems }, null, 2)
  );
}

if (problems.length === 0) {
  console.log(`문서 경로 검사 통과 (문서 ${docs.length}개)`);
  process.exit(0);
}
console.error(`문서에 적힌 경로 ${problems.length}개가 저장소에 없습니다.`);
for (const p of problems) console.error(`  ${p.file}:${p.line}  ${p.path}`);
console.error("파일을 옮겼다면 PROJECT_INDEX.md(경로 기준)와 위 문서를 같이 고쳐 주세요.");
process.exit(1);
