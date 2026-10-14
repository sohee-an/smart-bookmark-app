// QA 에이전트 hook 공용: 셸 명령 검사. 허용 목록 방식이라 메타문자(리다이렉트, 파이프, 치환, 연결)를 먼저 막는다
// 따옴표 밖의 셸 메타문자를 찾는다. 작은따옴표 안은 그대로 문자열이라 괜찮다. 큰따옴표 안의 $와 `는 치환이라 막는다
export function shellMetaError(cmd) {
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

