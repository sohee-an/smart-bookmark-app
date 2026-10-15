#!/usr/bin/env node
// 릴리스 UX 리뷰 범위 고르기 (AI 없이, 토큰 0).
//
// 지난 릴리스(main) 이후 dev에서 바뀐 파일 중 "화면" 파일만 골라, 많이 바뀐 순서로 예산 안에서 자른다.
// 결과는 두 개다.
//  - stdout 마지막 줄: 요약 JSON (선택, 제외, 화면 묶음)
//  - .claude/project/release/ux-scope.md: 선택한 파일의 변경분(diff)을 파일당 줄 수 제한으로 모은 문서.
//    UX 에이전트는 파일 전체 대신 이 문서를 먼저 읽는다. 토큰을 아끼려는 것이다
//
// 사용: node scripts/release/ux-scope.mjs [--base origin/main] [--head origin/dev]
//         [--max-files 10] [--max-lines 1200] [--per-file 150]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = opt("--base", "origin/main");
const head = opt("--head", "origin/dev");
const maxFiles = Number(opt("--max-files", 10));
const maxLines = Number(opt("--max-lines", 1200));
const perFile = Number(opt("--per-file", 150));

const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const ROOT = git("rev-parse", "--show-toplevel").trim();

// 화면 파일: 페이지와 화면 컴포넌트, 위젯, 기능별 UI, 엔티티 UI, 공용 UI, 전역 스타일, 공용 UI 패키지
const SCREEN = [
  /^apps\/web\/src\/app\/.+\.(tsx|css)$/,
  /^apps\/web\/src\/widgets\/.+\.tsx$/,
  /^apps\/web\/src\/features\/[^/]+\/ui\/.+\.tsx$/,
  /^apps\/web\/src\/entities\/[^/]+\/ui\/.+\.tsx$/,
  /^apps\/web\/src\/shared\/ui\/.+\.tsx$/,
  /^apps\/web\/src\/styles\/.+\.css$/,
  /^packages\/ui\/src\/.+\.tsx$/,
];
// 화면이 아닌 것: 테스트, 스토리, API 라우트, 성능 데모
const NOT_SCREEN = [/\.(test|spec|stories)\.tsx?$/, /\/app\/api\//, /\/app\/demo\//];

// 사람이 읽는 화면 묶음 이름. 흐름 단위로 보게 하려고 파일을 화면별로 묶는다
function area(f) {
  let m;
  if ((m = f.match(/src\/app\/(?:\([^)]+\)\/)?([^/]+)\//))) return `${m[1]} 화면`;
  if (/src\/app\/[^/]+\.tsx$/.test(f)) return "공통 레이아웃";
  if ((m = f.match(/src\/(widgets|features|entities)\/([^/]+)\//))) return `${m[2]} (${m[1]})`;
  if (/shared\/ui|packages\/ui/.test(f)) return "공용 UI";
  if (/styles\//.test(f)) return "전역 스타일";
  return "기타";
}

const numstat = git("diff", "--numstat", `${base}...${head}`)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [a, d, file] = l.split("\t");
    return { file, added: Number(a) || 0, deleted: Number(d) || 0 };
  })
  .filter((r) => SCREEN.some((re) => re.test(r.file)) && !NOT_SCREEN.some((re) => re.test(r.file)))
  .map((r) => ({ ...r, changed: r.added + r.deleted, area: area(r.file) }))
  .sort((a, b) => b.changed - a.changed);

// 예산: 파일 수와 (파일당 상한을 적용한) 변경 줄 수
const selected = [];
const skipped = [];
let lines = 0;
for (const r of numstat) {
  const cost = Math.min(r.changed, perFile);
  if (selected.length < maxFiles && lines + cost <= maxLines) {
    selected.push(r);
    lines += cost;
  } else skipped.push(r);
}

// 에이전트가 먼저 읽을 변경분 문서 (.claude/project/는 git 제외 폴더)
const outDir = path.join(ROOT, ".claude", "project", "release");
mkdirSync(outDir, { recursive: true });
const scopeFile = path.join(outDir, "ux-scope.md");
const areas = [...new Set(selected.map((r) => r.area))];
const doc = [
  `# 릴리스 UX 리뷰 범위 (${base}...${head})`,
  "",
  `화면 파일 ${numstat.length}개 중 ${selected.length}개 선택, ${skipped.length}개 제외 (예산: 파일 ${maxFiles}개, 변경 ${maxLines}줄, 파일당 ${perFile}줄)`,
  "",
  `화면 묶음: ${areas.join(", ") || "없음"}`,
  "",
  ...(skipped.length
    ? ["제외한 파일 (예산 밖, 리뷰하지 않음):", ...skipped.map((r) => `- ${r.file} (+${r.added} -${r.deleted})`), ""]
    : []),
  ...selected.flatMap((r) => {
    const diff = git("diff", "--unified=3", `${base}...${head}`, "--", r.file).split("\n");
    const cut = diff.length > perFile + 4;
    return [
      `## ${r.file} (${r.area}, +${r.added} -${r.deleted})`,
      "",
      "```diff",
      ...diff.slice(4, perFile + 4),
      ...(cut ? [`... (${diff.length - perFile - 4}줄 생략. 필요하면 파일을 직접 연다)`] : []),
      "```",
      "",
    ];
  }),
].join("\n");
writeFileSync(scopeFile, doc);

const summary = {
  base,
  head,
  total: numstat.length,
  selected: selected.map(({ file, added, deleted, area }) => ({ file, added, deleted, area })),
  skipped: skipped.map(({ file, added, deleted }) => ({ file, added, deleted })),
  areas,
  scopeFile: path.relative(ROOT, scopeFile).replace(/\\/g, "/"),
  scopeChars: doc.length,
};
console.log(JSON.stringify(summary));
