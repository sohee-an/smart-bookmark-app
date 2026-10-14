// 실제 AI 파이프라인 점검. 가짜 응답이 아니라 진짜 크롤링과 Gemini로 북마크가 채워지는지 본다.
//
// 흐름: 로컬 Supabase 키 읽기 → 앱 서버를 로컬 Supabase로 띄움 → 테스트 계정 생성 → 익스텐션 저장 API로 고정 URL 저장
//       → ai_status가 끝날 때까지 대기 → 최소 조건 검사 → 계정 삭제(북마크는 cascade) → 서버 종료 → JSON 결과 출력
//
// 왜 최소 조건만 보나: AI 요약 문장은 매번 달라서 정답 비교가 안 된다. "비어 있지 않다, 태그가 1~8개다"만 본다.
// 왜 로컬 Supabase인가: 실제 DB에 테스트 계정과 북마크가 오가지 않게. Docker + `supabase start`가 떠 있어야 한다.
// 비용: URL 1개당 크롤링 1회, Gemini 요약 1회, 임베딩 1회.
//
// 검사 그룹: setup(계정, 서버, 정리 등 검사 준비), api(저장 API와 인증), ai(실제 AI 결과).
// setup이 실패하면 제품 실패가 아니라 검사 오류다. 외부 AI 한도 초과(429)는 setup:ai로 올려서 ai 그룹만 오류가 된다
//
// 사용: node scripts/qa/live-check.mjs [--json]   (qa.mjs가 runner "script"로 부른다)
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { ROOT, loadConfig } from "./lib.mjs";

const cfg = loadConfig();
const live = cfg.live;
const appDir = path.join(ROOT, cfg.appRoot);
const log = (...a) => console.error("[live-check]", ...a);
const checks = [];
const check = (group, name, ok, detail) => checks.push({ group, name, ok: !!ok, detail });

// 1. 로컬 Supabase 키 (supabase status). 키 이름이 CLI 버전마다 달라서 둘 다 본다
function supabaseEnv() {
  // Windows에서 npx는 .cmd라 셸이 필요하다. 인자 없는 한 줄 명령으로 넘긴다
  const out = spawnSync(`npx -y supabase@${live.supabaseCli} status -o env`, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
  }).stdout;
  const kv = Object.fromEntries(
    out
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z_]+)="?([^"]*)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]])
  );
  const url = kv.API_URL;
  const anon = kv.ANON_KEY ?? kv.PUBLISHABLE_KEY;
  const service = kv.SERVICE_ROLE_KEY ?? kv.SECRET_KEY;
  if (!url || !anon || !service)
    throw new Error("로컬 Supabase가 떠 있지 않거나 키를 읽지 못했습니다 (supabase start 필요)");
  // 이 스크립트는 관리자 키로 테스트 계정을 만들고 지운다. 실수로 실제 DB를 가리키지 않게 로컬 주소만 허용한다
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error(`로컬 Supabase가 아닌 주소라 중단합니다: ${host}`);
  return { url: `http://${host === "::1" ? "[::1]" : host}:${new URL(url).port}`, anon, service };
}

// 2. 앱 서버. 환경변수로 넘긴 값이 .env.local보다 우선한다
async function startApp(sb) {
  const port = Number(live.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error(`잘못된 포트: ${live.port}`);
  const child = spawn(
    process.platform === "win32" ? "cmd" : "pnpm",
    process.platform === "win32"
      ? ["/c", "pnpm", "exec", "next", "dev", "-p", String(port)]
      : ["exec", "next", "dev", "-p", String(port)],
    {
      cwd: appDir,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: sb.url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: sb.anon,
        SUPABASE_SERVICE_ROLE_KEY: sb.service,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let buf = "";
  child.stdout.on("data", (d) => (buf += d));
  child.stderr.on("data", (d) => (buf += d));
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://localhost:${port}/landing`, { redirect: "manual" });
      if (r.status < 500) return { child, port, log: () => buf };
    } catch {}
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`앱 서버가 뜨지 않았습니다.\n${buf.slice(-1500)}`);
}

function stopApp(app) {
  if (!app) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(app.child.pid), "/T", "/F"], { stdio: "ignore" });
  else app.child.kill("SIGTERM");
}

const j = async (r) => {
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return { _raw: t.slice(0, 300) };
  }
};

async function main() {
  const startedAt = Date.now();
  const sb = supabaseEnv();
  log("로컬 Supabase", sb.url);
  let app = null;
  let userId = null;
  try {
    app = await startApp(sb);
    log("앱 서버", `http://localhost:${app.port}`);

    // 3. 테스트 계정. 이메일 인증이 꺼져 있어 바로 세션이 온다
    const email = `qa-${Date.now()}@example.test`;
    const password = `Qa!${randomBytes(24).toString("base64url")}`;
    const su = await j(
      await fetch(`${sb.url}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: sb.anon, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    );
    const token = su.access_token;
    userId = su.user?.id ?? su.id;
    check(
      "setup",
      "테스트 계정 생성과 즉시 로그인",
      token && userId,
      su.msg ?? su.error_description ?? su._raw
    );
    if (!token) throw new Error("계정 생성 실패");

    // 4. 익스텐션 저장 API (서버가 크롤링, AI, 임베딩을 이어서 실행)
    const ids = [];
    for (const url of live.urls) {
      const r = await fetch(`http://localhost:${app.port}/api/extension/save-bookmark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await j(r);
      check(
        "api",
        `저장 API 200: ${url}`,
        r.status === 200 && body.success,
        `${r.status} ${body.message ?? ""}`
      );
      if (body.data?.id) ids.push({ id: body.data.id, url });
    }
    // 토큰 없이 부르면 401이어야 한다
    const un = await fetch(`http://localhost:${app.port}/api/extension/save-bookmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: live.urls[0] }),
    });
    check("api", "토큰 없는 요청은 401", un.status === 401, String(un.status));
    // 틀린 토큰도 401이어야 한다 (토큰이 있기만 하면 통과시키는 실수를 잡는다)
    const bad = await fetch(`http://localhost:${app.port}/api/extension/save-bookmark`, {
      method: "POST",
      headers: { Authorization: "Bearer not-a-valid-token", "Content-Type": "application/json" },
      body: JSON.stringify({ url: live.urls[0] }),
    });
    check("api", "틀린 토큰 요청은 401", bad.status === 401, String(bad.status));

    // 5. 파이프라인 완료 대기
    const deadline = Date.now() + live.timeoutSec * 1000;
    let rows = [];
    while (Date.now() < deadline) {
      rows = await j(
        await fetch(
          `${sb.url}/rest/v1/bookmarks?select=id,url,title,summary,ai_status,bookmark_tags(tags(name))&order=created_at`,
          { headers: { apikey: sb.anon, Authorization: `Bearer ${token}` } }
        )
      );
      if (
        Array.isArray(rows) &&
        rows.length >= ids.length &&
        rows.every((b) => !["processing", "crawling"].includes(b.ai_status))
      )
        break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!Array.isArray(rows))
      throw new Error(`북마크 조회 실패: ${JSON.stringify(rows).slice(0, 300)}`);

    // 6. 최소 조건
    for (const b of rows) {
      const tags = (b.bookmark_tags ?? []).map((t) => t.tags?.name).filter(Boolean);
      const done = b.ai_status === "completed";
      check("ai", `AI 완료: ${b.url}`, done, `ai_status=${b.ai_status}`);
      if (!done) continue;
      check("ai", `제목 있음: ${b.url}`, b.title?.trim(), JSON.stringify(b.title));
      check("ai", `요약 있음: ${b.url}`, b.summary?.trim(), `${(b.summary ?? "").length}자`);
      check("ai", `태그 1~8개: ${b.url}`, tags.length >= 1 && tags.length <= 8, tags.join(", "));
    }
  } catch (e) {
    check("setup", "실행 오류 없음", false, String(e.message ?? e));
  } finally {
    // 7. 정리. 계정을 지우면 북마크, 태그 연결, 임베딩이 cascade로 사라진다
    if (userId) {
      const d = await fetch(`${sb.url}/auth/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { apikey: sb.service, Authorization: `Bearer ${sb.service}` },
      }).catch(() => null);
      check("setup", "테스트 계정 삭제", d && d.status < 300, String(d?.status));
    }
    stopApp(app);
  }

  // AI 검사가 외부 한도 초과로 실패했으면 제품 실패가 아니다. 검사 준비 실패로 올려서 오류로 처리되게 한다
  const fullLog = app?.log ? app.log() : "";
  if (
    checks.some((c) => c.group === "ai" && !c.ok) &&
    /429|RESOURCE_EXHAUSTED|quota/i.test(fullLog)
  )
    check("setup:ai", "외부 AI 한도 안 넘음", false, "Gemini 429 (한도 초과)");

  const failed = checks.filter((c) => !c.ok);
  // 실패가 있으면 앱 서버 로그에서 오류 줄만 추려 근거에 남긴다 (크롤링 차단, Gemini 오류 등 원인 추적용)
  const serverLog =
    failed.length && fullLog
      ? fullLog
          .split(/[\r\n]+/)
          .filter((l) => /error|fail|실패|crawl|gemini|\[AI\]|429|5\d\d/i.test(l))
          .slice(-25)
      : undefined;
  const result = {
    result: failed.some((c) => c.group === "setup") ? "error" : failed.length ? "fail" : "pass",
    ran: checks.length,
    skipped: 0,
    durationSec: Math.round((Date.now() - startedAt) / 1000),
    checks,
    serverLog,
  };
  for (const c of checks) log(c.ok ? "ok  " : "FAIL", c.name, c.detail ? `(${c.detail})` : "");
  console.log(JSON.stringify(result));
  process.exit(0);
}

main().catch((e) => {
  console.log(
    JSON.stringify({ result: "error", ran: 0, skipped: 0, checks, error: String(e.message ?? e) })
  );
  process.exit(0);
});
