#!/usr/bin/env node
/**
 * qa-test-author 쓰기 제한 (PreToolUse hook, 그 에이전트에만 걸린다).
 *
 * 왜 필요한가: 테스트 작성 에이전트가 앱 코드를 고쳐서 테스트를 통과시키거나, 판정 기준(verifiedBy)에서
 * 실패하는 테스트를 빼면 장부가 "통과"라고 거짓말을 한다. 에이전트 문서의 부탁만으로는 막히지 않아서 강제한다.
 *
 * 규칙
 *  - Write/Edit/MultiEdit/NotebookEdit: 테스트 파일, E2E spec, 테스트 픽스처만.
 *    qa-knowledge/scenarios.json은 verifiedBy에 항목을 "추가"하는 것만 (기존 항목 수정, 삭제, 다른 필드 변경 금지)
 *  - Bash: 허용 목록의 명령만 (테스트 실행, 장부 명령, 읽기 전용 git). 리다이렉트, 파이프, 치환, ; 금지
 *
 * 막을 때: 종료 코드 2 + stderr에 이유. Claude Code가 그 이유를 에이전트에게 돌려준다.
 * 판단이 아니라 규칙이라 결정론 경계 안쪽이다. 사람 승인 없이 규칙을 넓히지 않는다.
 *
 * 사용
 *  - hook: node .claude/hooks/qa-test-author-guard.mjs        (stdin으로 hook 입력 JSON)
 *  - 사후 점검: node .claude/hooks/qa-test-author-guard.mjs --check-diff
 *    지금 작업 트리의 변경 중 규칙 밖 파일을 나열한다 (테스트가 실행 중에 파일을 쓰는 경우 같은 hook 밖의 구멍용)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  }
})().replace(/\\/g, "/");

const SCENARIOS = "qa-knowledge/scenarios.json";
const ALLOWED_FILES = [
  /^apps\/web\/src\/.+\.test\.tsx?$/,
  /^apps\/web\/e2e\/.+\.spec\.ts$/,
  /^apps\/web\/src\/__tests__\/fixtures\/.+/,
];

// 저장소 기준 상대 경로. 저장소 밖이면 null
function rel(p) {
  const a = path.resolve(ROOT, p).replace(/\\/g, "/");
  const r = path.posix.relative(ROOT, a);
  return r.startsWith("..") || path.isAbsolute(r) ? null : r;
}

const fileAllowed = (r) => r !== null && ALLOWED_FILES.some((re) => re.test(r));

// scenarios.json: verifiedBy 끝에 항목을 덧붙이는 것만 허용
function scenariosChangeError(oldText, newText) {
  let before, after;
  try {
    before = JSON.parse(oldText);
    after = JSON.parse(newText);
  } catch {
    return "scenarios.json이 올바른 JSON이 아니게 된다";
  }
  const strip = (d) =>
    JSON.stringify({ ...d, scenarios: d.scenarios.map(({ verifiedBy, ...rest }) => rest) });
  if (strip(before) !== strip(after))
    return "verifiedBy 말고 다른 내용(주장, 시나리오 추가/삭제, 순서 등)이 바뀐다";
  for (let i = 0; i < before.scenarios.length; i++) {
    const a = before.scenarios[i].verifiedBy ?? [];
    const b = after.scenarios[i].verifiedBy ?? [];
    if (b.length < a.length || a.some((v, j) => JSON.stringify(v) !== JSON.stringify(b[j])))
      return `시나리오 ${before.scenarios[i].id}의 기존 검증 테스트를 바꾸거나 지운다 (추가만 된다. 바꿔야 하면 사람에게 요청)`;
  }
  return null;
}

// 도구 호출 뒤 파일 내용을 계산한다 (Edit는 old_string → new_string 치환)
function resultingText(tool, input, current) {
  if (tool === "Write") return input.content;
  const edits = tool === "MultiEdit" ? input.edits : [input];
  let s = current;
  for (const e of edits) {
    if (!s.includes(e.old_string)) return null;
    s = e.replace_all
      ? s.split(e.old_string).join(e.new_string)
      : s.replace(e.old_string, () => e.new_string);
  }
  return s;
}

function checkFileTool(tool, input) {
  const target = input.file_path ?? input.notebook_path;
  if (!target) return "파일 경로가 없다";
  const r = rel(target);
  if (r === SCENARIOS) {
    if (tool === "NotebookEdit") return "scenarios.json은 노트북이 아니다";
    const current = readFileSync(path.join(ROOT, r), "utf8");
    const next = resultingText(tool, input, current);
    if (next === null) return null; // 치환 대상이 없으면 도구가 알아서 실패한다
    return scenariosChangeError(current, next);
  }
  if (!fileAllowed(r))
    return `${r ?? target}: 테스트 파일(*.test.ts, *.test.tsx), E2E spec(apps/web/e2e/*.spec.ts), 테스트 픽스처만 쓸 수 있다. 앱 코드는 고치지 않는다. 테스트가 실패하면 실패한 채로 보고한다`;
  return null;
}

// ---------- Bash ----------

const BASH_ALLOWED = [
  /^pnpm --filter @smart-bookmark\/web exec (vitest run|playwright test)( |$)/,
  /^pnpm --filter @smart-bookmark\/web (test|test:unit)( |$)/,
  /^node scripts\/qa\/qa\.mjs (status|show|recheck|gaps)( |$)/,
  /^git (status|diff|log|show)( |$)/,
  /^(ls|pwd)( |$)/,
];

// 따옴표 밖의 셸 메타문자를 찾는다. 작은따옴표 안은 그대로 문자열이라 괜찮다. 큰따옴표 안의 $와 `는 치환이라 막는다
function shellMetaError(cmd) {
  let q = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q === "'") {
      if (c === "'") q = null;
      continue;
    }
    if (q === '"') {
      if (c === '"') q = null;
      else if (c === "$" || c === "`") return "큰따옴표 안의 $, ` (명령 치환)";
      else if (c === "\\") i++;
      continue;
    }
    if (c === "'" || c === '"') q = c;
    else if (/[;|&<>`$\n\r]/.test(c)) return `셸 메타문자 ${JSON.stringify(c)}`;
  }
  return q ? "닫히지 않은 따옴표" : null;
}

function checkBash(cmd) {
  // "cd <저장소 안 경로> && <명령>" 형태는 한 번 허용한다 (에이전트가 자주 쓴다)
  let c = cmd.trim();
  const cd = c.match(/^cd\s+("([^"]*)"|'([^']*)'|(\S+))\s*&&\s*(.+)$/s);
  if (cd) {
    const dir = cd[2] ?? cd[3] ?? cd[4];
    if (rel(dir) === null) return `저장소 밖으로 cd: ${dir}`;
    c = cd[5].trim();
  }
  const meta = shellMetaError(c);
  if (meta) return `${meta}는 쓸 수 없다. 리다이렉트, 파이프, 명령 연결 없이 명령 하나만 실행한다`;
  if (!BASH_ALLOWED.some((re) => re.test(c)))
    return "허용된 명령이 아니다. 테스트 실행(pnpm --filter @smart-bookmark/web exec vitest run|playwright test), 장부(node scripts/qa/qa.mjs status|show|recheck|gaps), 읽기 전용 git(status|diff|log|show)만 쓸 수 있다. 파일은 Read, Grep, Glob으로 읽는다";
  return null;
}

// ---------- 사후 점검 ----------

function checkDiff() {
  const out = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const bad = [];
  for (const line of out.split("\n").filter(Boolean)) {
    const p = line.slice(3).split(" -> ").at(-1).replace(/^"|"$/g, "");
    if (p === SCENARIOS) {
      const head = execFileSync("git", ["show", `HEAD:${SCENARIOS}`], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const err = scenariosChangeError(head, readFileSync(path.join(ROOT, p), "utf8"));
      if (err) bad.push(`${p}: ${err}`);
    } else if (p === "qa-knowledge/facts.jsonl") {
      // recheck가 쌓는 근거. 에이전트가 직접 쓰는 것은 hook이 막는다
    } else if (!fileAllowed(p)) bad.push(p);
  }
  if (bad.length) {
    console.log(
      `테스트 작성 규칙 밖의 변경 ${bad.length}개:\n${bad.map((b) => `  - ${b}`).join("\n")}`
    );
    process.exit(1);
  }
  console.log("규칙 밖의 변경 없음");
}

if (process.argv.includes("--check-diff")) {
  checkDiff();
} else {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    let input;
    try {
      input = JSON.parse(raw);
    } catch {
      console.error("qa-test-author 가드: hook 입력을 읽지 못해서 막는다");
      process.exit(2);
    }
    // 머리말 hook이라 이 에이전트에서만 불리지만, 다른 에이전트 이름이 오면 건드리지 않는다
    if (input.agent_type && input.agent_type !== "qa-test-author") process.exit(0);
    const tool = input.tool_name;
    const ti = input.tool_input ?? {};
    let err = null;
    if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool))
      err = checkFileTool(tool, ti);
    else if (tool === "Bash" || tool === "PowerShell")
      err =
        tool === "Bash"
          ? checkBash(ti.command ?? "")
          : "PowerShell은 쓸 수 없다. Bash로 허용된 명령만 실행한다";
    if (err) {
      console.error(`qa-test-author 가드가 막음: ${err}`);
      process.exit(2);
    }
    process.exit(0);
  });
}

export { checkBash, scenariosChangeError, fileAllowed, rel };
