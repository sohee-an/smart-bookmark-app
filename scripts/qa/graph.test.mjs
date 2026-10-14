// node --test scripts/qa/graph.test.mjs
// 그래프로 좁히기의 안전장치: 최상위 문장 나누기, 그래프가 없을 때 기존 연결과 같은지
import assert from "node:assert/strict";
import { test } from "node:test";
import { topLevelLines } from "./graph.mjs";
import { linkScenario, loadConfig, loadScenarios } from "./lib.mjs";

const tops = (src) => {
  const at = topLevelLines(src);
  return at && src.split("\n").flatMap((l, i) => (at[i] && /^[A-Za-z_$@]/.test(l) ? [i + 1] : []));
};

test("함수 안의 맨 앞 칸 줄(템플릿 본문)은 최상위 문장으로 보지 않는다", () => {
  const src = [
    "const a = 1;",
    "function f() {",
    "  return `",
    "type X = 1",
    "`;",
    "}",
    "export const b = f();",
  ].join("\n");
  assert.deepEqual(tops(src), [1, 2, 7]);
});

test("JSX 닫는 태그와 {식} 뒤의 / 는 정규식으로 읽지 않는다", () => {
  const src = [
    "export function A() {",
    "  return <div>{x} <br /></div>;",
    "}",
    "export const B = 1;",
  ].join("\n");
  assert.deepEqual(tops(src), [1, 4]);
});

test("정규식 리터럴 안의 괄호와 따옴표는 깊이에 세지 않는다", () => {
  const src = ["const re = /[({'\"]/g;", "export const c = 2;"].join("\n");
  assert.deepEqual(tops(src), [1, 2]);
});

test("괄호나 문자열이 맞지 않으면 나누지 않는다 (그 파일은 통째로 둔다)", () => {
  assert.equal(topLevelLines("function f() {\n"), null);
  assert.equal(topLevelLines("const s = 'it\ns';"), null);
});

test("그래프가 없으면 켜도 기존 연결과 같다", () => {
  const cfg = { ...loadConfig(), graph: { enabled: true, dir: ".cache/qa-graph-없음-테스트" } };
  const prev = process.env.QA_GRAPH;
  for (const sc of loadScenarios().filter((s) => s.verifiedBy.length)) {
    process.env.QA_GRAPH = "1";
    const on = linkScenario(sc, cfg);
    process.env.QA_GRAPH = "0";
    const off = linkScenario(sc, cfg);
    assert.deepEqual(on.files, off.files, sc.id);
    assert.deepEqual(on.wideFiles, off.files, sc.id);
  }
  if (prev === undefined) delete process.env.QA_GRAPH;
  else process.env.QA_GRAPH = prev;
});
