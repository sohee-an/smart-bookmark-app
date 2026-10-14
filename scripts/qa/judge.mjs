// 실패 판정 자동 실행 (나이틀리 --judge, 로컬 전용).
//
// 실패한 시나리오마다 qa-judge 에이전트를 사람 없이 부르고, 판정을 판정 기록(judgments.jsonl)과 전문 파일로 남긴다.
// - 판정 에이전트는 읽기 전용이다: 파일 쓰기 도구는 명령 옵션으로 막고, Bash는 에이전트의 hook이 허용 목록으로 막는다
// - 판정은 사람이 확인하기 전까지 "제안"이다. 사람이 맞았는지 표시하면(qa.mjs judgment mark) 정확도가 쌓인다.
//   이 정확도가 쌓이기 전에는 판정으로 이슈를 만들거나 코드를 고치지 않는다
// - 이 단계는 Claude 사용량이 든다. 그래서 기본은 꺼져 있고, 한 번에 판정하는 수도 제한한다
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KDIR, ROOT, gitInfo } from "./lib.mjs";

const VERDICTS = ["app-bug", "test-bug", "claim-too-wide", "flaky-external", "env", "unclear"];

// claude 실행 파일. Windows의 claude.cmd는 셸이 있어야 돌아서, 감싼 실제 실행 파일을 찾아 셸 없이 부른다
function claudeBin() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  if (process.platform !== "win32") return "claude";
  try {
    const cmd = execFileSync("where", ["claude.cmd"], { encoding: "utf8" })
      .split(/\r?\n/)[0]
      .trim();
    const exe = path.join(
      path.dirname(cmd),
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "bin",
      "claude.exe"
    );
    if (existsSync(exe)) return exe;
  } catch {}
  return "claude";
}

export function parseJudgment(text) {
  const verdict = text.match(/판정:\s*([a-z-]+)/)?.[1];
  const confidence = text.match(/확신:\s*(높음|중간|낮음)/)?.[1] ?? null;
  return { verdict: VERDICTS.includes(verdict) ? verdict : "unclear", confidence };
}

export function judgeScenario(id, { maxTurns = 40, timeoutMin = 15 } = {}) {
  const prompt = [
    `시나리오 ${id}가 오늘 나이틀리에서 실패했다. qa-judge 규칙대로 판정해줘.`,
    "사람은 지금 없다. 질문하지 말고 판정만 한다. 보고의 첫 두 줄은 반드시 '판정: <값>', '확신: <값>'이다.",
  ].join("\n");
  const started = Date.now();
  const r = spawnSync(
    claudeBin(),
    [
      "-p",
      "--agent",
      "qa-judge",
      "--disallowedTools",
      "Write",
      "Edit",
      "MultiEdit",
      "NotebookEdit",
      "PowerShell",
      "--permission-mode",
      "bypassPermissions",
      "--max-turns",
      String(maxTurns),
    ],
    {
      cwd: ROOT,
      input: prompt,
      encoding: "utf8",
      timeout: timeoutMin * 60_000,
      maxBuffer: 16 * 1024 * 1024,
    }
  );
  const text = (r.stdout ?? "").trim();
  const ok = r.status === 0 && text.length > 0;
  const parsed = ok ? parseJudgment(text) : { verdict: "unclear", confidence: null };
  return {
    scenario: id,
    ...parsed,
    ok,
    error: ok
      ? undefined
      : (r.error?.message ?? ((r.stderr || "").slice(-500) || `종료 코드 ${r.status}`)),
    durationSec: Math.round((Date.now() - started) / 1000),
    text,
  };
}

// 판정 기록에 남긴다. 전문은 날짜별 파일로, 요약은 judgments.jsonl에 (사람이 맞았는지 표시할 대상)
export function recordJudgment(j, { factAt, today }) {
  const dir = path.join(KDIR, "judgments");
  mkdirSync(dir, { recursive: true });
  const file = path.posix.join("qa-knowledge/judgments", `${today}-${j.scenario}.md`);
  writeFileSync(
    path.join(ROOT, file),
    `# 판정 ${j.scenario} (${today})\n\n대상 근거: ${factAt ?? "없음"}\n\n${j.ok ? j.text : `판정 실패: ${j.error}`}\n`
  );
  const entry = {
    type: "judgment",
    scenario: j.scenario,
    verdict: j.verdict,
    confidence: j.confidence,
    ok: j.ok,
    factAt: factAt ?? null,
    file,
    at: new Date().toISOString(),
    ...gitInfo(),
  };
  appendFileSync(path.join(KDIR, "judgments.jsonl"), JSON.stringify(entry) + "\n");
  return entry;
}
