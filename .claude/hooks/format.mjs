#!/usr/bin/env node
/**
 * PostToolUse 포맷 hook — Write/Edit로 파일을 건드릴 때마다 prettier + eslint --fix 강제.
 *
 * 왜 스크립트로 분리했나:
 *   - Claude Code hook 설정 파일(settings.json)은 .gitignore 대상이라 팀에 공유 안 됨.
 *     로직을 커밋되는 이 스크립트에 두면 팀 전체가 동일 포맷 규칙을 공유한다.
 *   - hook 입력은 stdin JSON으로 들어온다. (예전 설정의 $CLAUDE_FILE_PATH는 존재하지
 *     않는 변수라 no-op였음 — node로 정확히 파싱해 교정.)
 *
 * 왜 npx가 아니라 node로 바이너리를 직접 실행하나:
 *   - Node 18.20+/20.12+/22+ 부터 보안 패치(CVE-2024-27980)로 `.cmd`/`.bat`을 shell 없이
 *     spawn하면 Windows에서 EINVAL을 던진다. `npx.cmd`가 여기 해당돼 hook이 조용히
 *     죽었다(에러 삼킴 + exit 0). 그래서 npx를 거치지 않고, 타깃 파일 위치에서 resolve한
 *     prettier/eslint 바이너리(JS)를 `node <bin>`으로 직접 돌린다. shell 이스케이프 이슈도 없음.
 *   - eslint는 apps/web 전용 의존성이라 레포 루트에서 resolve가 안 된다. 편집된 파일의
 *     위치를 기준으로 resolve하면 가장 가까운 node_modules(= apps/web)에서 찾는다.
 *
 * 결정론 경계: 포맷/린트는 빠르고 객관적이라 "강제"에 적합. AI 리뷰 같은 비결정적
 * 판단은 여기 넣지 않는다. 포맷 실패로 편집을 막지 않는다(항상 exit 0).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const FORMATTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|mdx|css|scss|ya?ml|html)$/;
const LINTABLE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    // stdin이 안 닫히는 경우를 대비한 안전장치 (hook JSON은 작아 즉시 도착)
    setTimeout(() => resolve(data), 300);
  });
}

/** 편집된 파일 위치에서 패키지 바이너리(JS)를 resolve해 node로 직접 실행. best-effort. */
function runBin(requireFromFile, spec, args) {
  let bin;
  try {
    bin = requireFromFile.resolve(spec);
  } catch {
    // eslint는 exports가 bin 경로를 막으므로 package.json으로 위치를 잡아 구성
    try {
      const pkg = requireFromFile.resolve(`${spec.split("/")[0]}/package.json`);
      bin = join(dirname(pkg), "bin", `${spec.split("/")[0]}.js`);
    } catch {
      return;
    }
  }
  if (!bin || !existsSync(bin)) return;
  try {
    execFileSync(process.execPath, [bin, ...args], { stdio: "ignore" });
  } catch {
    // 포맷/린트 실패로 편집을 막지 않는다 — 조용히 통과
  }
}

const raw = await readStdin();
let filePath;
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path;
} catch {
  process.exit(0);
}

if (!filePath || !FORMATTABLE.test(filePath) || !existsSync(filePath)) {
  process.exit(0);
}

const requireFromFile = createRequire(pathToFileURL(filePath));
runBin(requireFromFile, "prettier/bin/prettier.cjs", ["--write", filePath]);
if (LINTABLE.test(filePath)) {
  runBin(requireFromFile, "eslint/bin/eslint.js", ["--fix", filePath]);
}
process.exit(0);
