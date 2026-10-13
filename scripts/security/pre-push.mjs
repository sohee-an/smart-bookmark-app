// push 전에 로컬에서 돌릴 수 있는 보안 검사. .husky/pre-push에서 호출한다.
//
// 1. 시크릿 검사 (secretlint)       → 발견되면 push를 막는다. 한 번 올라가면 되돌릴 수 없어서다
// 2. 보안 민감 파일 변경 감지        → 경고만 한다. 리뷰 실행 여부는 사람이 정한다
// 3. 의존성 취약점 (lockfile 변경 시) → 경고만 한다. 지금 next에 알려진 취약점이 있어 막으면 모든 push가 멈춘다
//
// 민감 경로 목록은 .github/security-sensitive-paths.json 하나를 PR 알림 워크플로우와 같이 쓴다.
// 오탐으로 막히면 원인을 확인한 뒤 `git push --no-verify`로 건너뛸 수 있다.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ZERO = /^0+$/;
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return null;
  }
};

// git이 넘겨주는 "<local ref> <local sha> <remote ref> <remote sha>" 줄마다 비교 기준을 정한다
function baseFor(localSha, remoteSha) {
  if (!ZERO.test(remoteSha) && tryGit("cat-file", "-e", `${remoteSha}^{commit}`) !== null)
    return remoteSha;
  for (const ref of ["origin/dev", "origin/main"]) {
    const mb = tryGit("merge-base", localSha, ref);
    if (mb) return mb;
  }
  return null;
}

const input = readFileSync(0, "utf8").trim();
const changed = new Set();
for (const line of input ? input.split("\n") : []) {
  const [, localSha, , remoteSha] = line.trim().split(/\s+/);
  if (!localSha || ZERO.test(localSha)) continue; // 브랜치 삭제
  const base = baseFor(localSha, remoteSha);
  const out = base
    ? git("diff", "--name-only", "--diff-filter=ACMR", base, localSha)
    : git("show", "--name-only", "--pretty=format:", localSha);
  out
    .split("\n")
    .filter(Boolean)
    .forEach((f) => changed.add(f));
}
if (changed.size === 0) process.exit(0);
const files = [...changed];

let blocked = false;

// 1. 시크릿
const SKIP_SECRET = /(^|\/)pnpm-lock\.yaml$|\.(png|jpe?g|gif|webp|ico|svg|woff2?|pdf)$/i;
const targets = files.filter((f) => !SKIP_SECRET.test(f) && existsSync(path.join(root, f)));
let secretlintBin = null;
try {
  const require = createRequire(path.join(root, "package.json"));
  const pkgPath = require.resolve("secretlint/package.json");
  const bin = JSON.parse(readFileSync(pkgPath, "utf8")).bin;
  secretlintBin = path.join(path.dirname(pkgPath), typeof bin === "string" ? bin : bin.secretlint);
} catch {
  console.warn(
    "[보안] secretlint가 설치되어 있지 않아 시크릿 검사를 건너뜁니다. pnpm install을 실행하세요."
  );
}
if (secretlintBin && targets.length > 0) {
  const r = spawnSync(process.execPath, [secretlintBin, "--maskSecrets", ...targets], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    blocked = true;
    console.error("\n[보안] 시크릿으로 보이는 값이 있어 push를 막았습니다.");
    console.error(r.stdout || r.stderr);
    console.error("오탐이면 확인 후 `git push --no-verify`로 건너뛸 수 있습니다.\n");
  }
}

// 2. 보안 민감 파일
const cfg = JSON.parse(
  readFileSync(path.join(root, ".github/security-sensitive-paths.json"), "utf8")
);
const exclude = cfg.exclude.map((p) => new RegExp(p));
const rules = cfg.paths.map((p) => ({ re: new RegExp(p.pattern), why: p.why }));
const hits = files
  .filter((f) => !exclude.some((re) => re.test(f)))
  .map((f) => ({ f, rule: rules.find((r) => r.re.test(f)) }))
  .filter((h) => h.rule);
if (hits.length > 0) {
  console.log(`\n[보안] 보안 민감 파일 ${hits.length}개가 바뀌었습니다. push는 계속합니다.`);
  for (const h of hits) console.log(`  - ${h.f}  (${h.rule.why})`);
  console.log("  필요하면 Claude Code에서:");
  console.log(`    보안 검토해줘 ${hits.map((h) => h.f).join(" ")}`);
  console.log("  인증, RLS, 토큰처럼 위험한 변경이면: 심층 보안 검토해줘 <같은 파일들>\n");
}

// 3. 의존성 (lockfile이 바뀐 push에서만. 네트워크를 쓰니 매번 돌리지 않는다)
if (files.includes("pnpm-lock.yaml")) {
  const r = spawnSync("pnpm audit --prod --json", { cwd: root, encoding: "utf8", shell: true });
  try {
    const m = JSON.parse(r.stdout).metadata?.vulnerabilities ?? {};
    if ((m.critical ?? 0) + (m.high ?? 0) > 0) {
      console.log(
        `[보안] prod 의존성 취약점: critical ${m.critical ?? 0}, high ${m.high ?? 0}. 자세히는 pnpm audit --prod. push는 계속합니다.\n`
      );
    }
  } catch {
    console.warn(
      "[보안] pnpm audit 결과를 읽지 못했습니다(네트워크 확인). 의존성 검사를 건너뜁니다."
    );
  }
}

process.exit(blocked ? 1 : 0);
