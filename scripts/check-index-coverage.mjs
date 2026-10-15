// 코드에 있는 파일이 PROJECT_INDEX.md에 적혀 있는지 검사한다. check-doc-paths.mjs의 반대 방향이다.
//
// check-doc-paths.mjs는 "문서에 적힌 경로가 실제로 있나"를 본다. 파일을 옮기거나 지우면 잡지만,
// 새 파일을 만들고 색인에 안 넣은 건 못 잡는다. CLAUDE.md에 "새 파일은 PROJECT_INDEX.md에 추가"라고
// 적어 둔 부탁을 이 스크립트가 검사로 바꾼다.
//
// 검사 대상: 아래 TARGETS에 걸리는 추적 파일 중 IGNORE에 없는 것.
// 색인에 있다고 보는 것:
//  - 전체 경로가 그대로 적힌 경우
//  - 같은 줄에 앞서 나온 경로의 폴더 기준으로 줄여 쓴 경우
//    (예: `apps/web/src/app/(main)/bookmarks/page.tsx` + `BookmarksContent.tsx`,
//         `apps/web/src/app/api/extension/_lib/auth.ts`, `pipeline.ts`)
//
// 사용:
//   node scripts/check-index-coverage.mjs            빠진 파일을 보여 준다 (항상 exit 0)
//   node scripts/check-index-coverage.mjs --strict   빠진 파일이 있으면 exit 1 (CI에서 막을 때)
//   node scripts/check-index-coverage.mjs --json 결과파일
//   node scripts/check-index-coverage.mjs --hook     Claude Code PostToolUse hook. stdin JSON의 파일 하나만 본다
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

// hook은 Claude Code 세션이 열린 폴더에서 돈다(apps/web일 수도 있다). 경로는 저장소 루트 기준으로 맞춘다.
process.chdir(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());

const INDEX = "PROJECT_INDEX.md";

// 찾을 일이 있는 코드만 본다. 테스트, 스토리, 타입 선언은 소스 옆에 있어 소스만 적으면 된다.
const TARGETS = [/^apps\/web\/src\/.+\.(ts|tsx)$/, /^packages\/ui\/src\/.+\.(ts|tsx)$/];
const IGNORE = [
  { re: /\.(test|spec|stories)\.(ts|tsx)$/, why: "테스트, 스토리" },
  { re: /\/__tests__\//, why: "통합 테스트 폴더" },
  { re: /\.d\.ts$/, why: "타입 선언" },
  { re: /\/index\.ts$/, why: "re-export만 하는 파일" },
  { re: /\/test-setup\.ts$/, why: "테스트 설정" },
  {
    re: /^apps\/web\/src\/app\/(.+\/)?(error|global-error|not-found|loading)\.tsx$/,
    why: "Next.js 규칙 파일",
  },
  { re: /^apps\/web\/src\/app\/(robots|sitemap)\.ts$/, why: "Next.js 규칙 파일" },
];

const PATH_RE =
  /(?<![\w./-])((?:apps|packages)\/[\p{L}\p{N}_.()[\]@\/-]+\.tsx?)(?![\p{L}\p{N}_])/gu;
const TICK_RE = /`([^`\s]+\.(?:ts|tsx))`/g;

function isTarget(f) {
  return TARGETS.some((re) => re.test(f)) && !IGNORE.some(({ re }) => re.test(f));
}

function coveredPaths() {
  const covered = new Set();
  for (const line of readFileSync(INDEX, "utf8").split(/\r?\n/)) {
    let dir = null;
    const full = [...line.matchAll(PATH_RE)].map((m) => m[1]);
    for (const p of full) covered.add(p);
    if (full.length > 0) dir = full[0].slice(0, full[0].lastIndexOf("/"));
    if (!dir) continue;
    // 같은 줄에서 줄여 쓴 이름은 첫 경로의 폴더 기준으로 푼다. `_lib/auth.ts`처럼 폴더가 붙은 경우
    // 첫 경로가 이미 그 폴더 안이면 겹치는 부분을 한 번만 붙인다.
    for (const m of line.matchAll(TICK_RE)) {
      const short = m[1];
      if (/^(apps|packages)\//.test(short)) continue;
      const head = short.split("/")[0];
      const base = dir.endsWith("/" + head) ? dir.slice(0, -head.length - 1) : dir;
      covered.add(`${base}/${short}`);
    }
  }
  return covered;
}

function tracked() {
  return execFileSync("git", ["ls-files", "-z", "apps/web/src", "packages/ui/src"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

const args = process.argv.slice(2);

if (args.includes("--hook")) {
  // 새 파일을 만들었는데 색인에 없으면 Claude에게 알린다. 편집은 이미 끝났으므로 막지는 않는다.
  // exit 2의 stderr는 Claude Code가 Claude에게 그대로 전달한다.
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let file;
  try {
    const data = JSON.parse(input);
    if (data.tool_name !== "Write") process.exit(0);
    file = relative(process.cwd(), resolve(data.tool_input?.file_path ?? "")).replaceAll("\\", "/");
  } catch {
    process.exit(0);
  }
  if (!file || !isTarget(file) || coveredPaths().has(file)) process.exit(0);
  console.error(
    `새 파일이 PROJECT_INDEX.md에 없습니다: ${file}
맞는 섹션에 "이름 (한 줄 설명) → \`${file}\`" 형식으로 한 줄 추가해 주세요.`
  );
  process.exit(2);
}

const covered = coveredPaths();
const targets = tracked().filter(isTarget);
const missing = targets.filter((f) => !covered.has(f));

const jsonIdx = args.indexOf("--json");
if (jsonIdx !== -1) {
  writeFileSync(args[jsonIdx + 1], JSON.stringify({ checked: targets.length, missing }, null, 2));
}

if (missing.length === 0) {
  console.log(`색인 누락 검사 통과 (파일 ${targets.length}개)`);
  process.exit(0);
}
console.error(`PROJECT_INDEX.md에 없는 파일 ${missing.length}개 (검사한 파일 ${targets.length}개)`);
for (const f of missing) console.error(`  ${f}`);
console.error("새로 만든 파일이면 PROJECT_INDEX.md에 한 줄 추가해 주세요.");
console.error(
  "일부러 색인에 안 넣는 종류라면 scripts/check-index-coverage.mjs의 IGNORE에 이유와 함께 추가합니다."
);
process.exit(args.includes("--strict") ? 1 : 0);
