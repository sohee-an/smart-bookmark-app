// 정기 의존성 검사 결과를 GitHub 이슈 하나로 유지한다. dependency-audit.yml의 github-script에서 부른다.
//
// - critical/high가 있으면: 열린 이슈가 없으면 만들고, 있으면 본문을 최신으로 고친다 (이슈는 항상 1개)
// - 없으면: 열린 이슈에 "해소됨" 코멘트를 남기고 닫는다
// 이슈는 GitHub 알림(웹, 모바일, 메일)으로 오고, 막지는 않는다. 정기 실행은 실패하지 않으면 아무 데도 알리지 않아서 둔다.
const LABEL = "security-audit";
const TITLE = "[보안] prod 의존성 취약점 (정기 검사)";

function buildBody(audit, runUrl) {
  const m = audit.metadata?.vulnerabilities ?? {};
  const seen = new Set();
  const rows = Object.values(audit.advisories ?? {})
    .filter((a) => a.severity === "critical" || a.severity === "high")
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1))
    .filter((a) => {
      const key = `${a.module_name}|${a.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(
      (a) =>
        `| ${a.severity} | \`${a.module_name}\` | ${a.patched_versions} | [${a.title.replace(/[|\]]/g, "/")}](${a.url}) |`
    );
  return [
    "정기 의존성 검사(`dependency-audit.yml`)가 prod 의존성에서 알려진 취약점을 찾았습니다. CI를 막지는 않습니다.",
    "",
    `critical ${m.critical ?? 0} · high ${m.high ?? 0} · moderate ${m.moderate ?? 0} · low ${m.low ?? 0}`,
    "",
    "| 심각도 | 패키지 | 패치 버전 | 내용 |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    `마지막 검사: ${runUrl}`,
    "",
    "해소되면 다음 정기 검사가 이 이슈를 자동으로 닫습니다.",
  ].join("\n");
}

module.exports = async function syncAuditIssue({ github, context, core, audit, runUrl }) {
  const { owner, repo } = context.repo;
  const m = audit.metadata?.vulnerabilities ?? {};
  const serious = (m.critical ?? 0) + (m.high ?? 0);

  const open = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    labels: LABEL,
    per_page: 100,
  });
  const existing = open.find((i) => !i.pull_request);

  if (serious === 0) {
    if (existing) {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: existing.number,
        body: `정기 검사에서 critical/high가 더 이상 없습니다. 이슈를 닫습니다. (${runUrl})`,
      });
      await github.rest.issues.update({
        owner,
        repo,
        issue_number: existing.number,
        state: "closed",
      });
      core.info(`이슈 #${existing.number} 닫음`);
    } else {
      core.info("critical/high 없음, 열린 이슈 없음");
    }
    return;
  }

  const body = buildBody(audit, runUrl);
  if (existing) {
    await github.rest.issues.update({ owner, repo, issue_number: existing.number, body });
    core.info(`이슈 #${existing.number} 갱신`);
    return;
  }
  try {
    await github.rest.issues.createLabel({
      owner,
      repo,
      name: LABEL,
      color: "b60205",
      description: "정기 보안 검사가 만든 이슈",
    });
  } catch {
    // 이미 있음
  }
  const { data } = await github.rest.issues.create({
    owner,
    repo,
    title: TITLE,
    body,
    labels: [LABEL],
  });
  core.info(`이슈 #${data.number} 생성`);
};

module.exports.buildBody = buildBody;
