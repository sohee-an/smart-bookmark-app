#!/usr/bin/env node
/**
 * qa-judge 읽기 전용 강제 (PreToolUse hook, 그 에이전트에만 걸린다).
 *
 * 왜 필요한가: 판정 에이전트는 나이틀리가 사람 없이 부른다(--judge). 판정하는 쪽이 코드나 장부를 고칠 수 있으면
 * "실패를 고쳐서 통과로 만들고 판정은 env" 같은 일이 생길 수 있다. 판정은 읽기만 한다.
 *
 * 규칙
 *  - 파일을 쓰는 도구(Write, Edit, MultiEdit, NotebookEdit)와 PowerShell은 막는다
 *  - Bash는 허용 목록만: 읽기 전용 git, 장부 조회, 재현용 단위 테스트 실행. 리다이렉트, 파이프, 치환, 연결 금지
 *
 * 막을 때: 종료 코드 2 + stderr에 이유.
 */
import { shellMetaError } from "./lib/shell.mjs";

const BASH_ALLOWED = [
  /^git (log|show|diff|status|blame)( |$)/,
  /^node scripts\/qa\/qa\.mjs (status|show|gaps)( |$)/,
  /^pnpm --filter @smart-bookmark\/web exec vitest run( |$)/,
  /^(ls|pwd)( |$)/,
];

export function checkJudgeTool(tool, input) {
  if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(tool))
    return "판정 에이전트는 파일을 쓰지 않는다. 고칠 곳은 보고의 '다음 할 일 제안'에 적는다";
  if (tool === "PowerShell") return "PowerShell은 쓸 수 없다. Bash로 허용된 명령만 실행한다";
  if (tool !== "Bash") return null;
  const cmd = (input.command ?? "").trim();
  const meta = shellMetaError(cmd);
  if (meta) return `${meta}는 쓸 수 없다. 명령 하나만 실행한다`;
  if (!BASH_ALLOWED.some((re) => re.test(cmd)))
    return "허용된 명령이 아니다. git log|show|diff|status|blame, node scripts/qa/qa.mjs status|show|gaps, 단위 테스트 실행(pnpm --filter @smart-bookmark/web exec vitest run)만 쓸 수 있다. 파일은 Read, Grep, Glob으로 읽는다";
  return null;
}

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.error("qa-judge 가드: hook 입력을 읽지 못해서 막는다");
    process.exit(2);
  }
  const err = checkJudgeTool(input.tool_name, input.tool_input ?? {});
  if (err) {
    console.error(`qa-judge 가드가 막음: ${err}`);
    process.exit(2);
  }
  process.exit(0);
});
