// "URL 저장 한 번"이 지나가는 경로를 입구부터 왼쪽→오른쪽으로 그린다.
// 실행: 레포 루트에서  node docs/demo/graph/flow-view.mjs
//
// 전체 지도(qa-overlay.html)가 "어디가 비었나"라면, 이 그림은 "요청 하나가 어디를 지나가나"다.
// - 실선: import (graph.json에 실제로 있는 연결만 그린다. 없으면 만들 때 경고)
// - 점선: 화면에서 API 라우트로 가는 fetch. import가 아니라서 그래프에 없어 손으로 적었다
// - 테두리 색: QATester 장부 상태 (파일 단위, 가장 좋은 상태 기준)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const HERE = path.dirname(new URL(import.meta.url).pathname);
const graphPath = path.join(HERE, "graphify-out/graph.json");
const outPath = path.join(HERE, "flow-view.html");

const W = "apps/web/src/";
// 열(level) = 왼쪽부터. FSD 순서(widgets → features → entities/app api → server → shared)를 그대로 쓴다
const COLUMNS = [
  "사용자",
  "widgets",
  "features / ui",
  "features / model",
  "app / api · entities",
  "server · shared",
  "shared (서버 가드)",
  "바깥",
];
const N = (id, level, label, opts = {}) => ({ id, level, label, ...opts });
const nodes = [
  N("user", 0, "URL 입력", { kind: "actor" }),
  N(W + "widgets/layout/Header.tsx", 1, "Header.tsx"),
  N(W + "features/bookmark/ui/AddBookmarkOverlay.tsx", 2, "AddBookmarkOverlay.tsx"),
  N(W + "features/bookmark/model/useBookmarkPipeline.ts", 3, "useBookmarkPipeline.ts"),
  N(W + "features/bookmark/model/bookmark.service.ts", 3, "bookmark.service.ts"),
  N(W + "app/api/crawl/route.ts", 4, "POST /api/crawl"),
  N(W + "app/api/ai-analyze/route.ts", 4, "POST /api/ai-analyze"),
  N(W + "app/api/embed/route.ts", 4, "POST /api/embed"),
  N(W + "entities/bookmark/api/local.repository.ts", 4, "local.repository.ts"),
  N(W + "entities/bookmark/api/supabase.repository.ts", 4, "supabase.repository.ts"),
  N(W + "server/services/crawler.service.ts", 5, "crawler.service.ts"),
  N(W + "server/services/ai-analysis.service.ts", 5, "ai-analysis.service.ts"),
  N(W + "shared/api/supabase/client.ts", 5, "supabase/client.ts"),
  N(W + "shared/lib/storage.ts", 5, "storage.ts"),
  N(W + "shared/lib/validateSsrf.ts", 6, "validateSsrf.ts"),
  N(W + "shared/lib/rateLimit.ts", 6, "rateLimit.ts"),
  N(W + "shared/lib/guestCookie.ts", 6, "guestCookie.ts"),
  N(W + "shared/api/supabase/server.ts", 6, "supabase/server.ts"),
  N("ext:site", 7, "외부 사이트 (크롤링)", { kind: "external" }),
  N("ext:gemini", 7, "Gemini", { kind: "external" }),
  N("ext:supabase", 7, "Supabase", { kind: "external" }),
  N("ext:localstorage", 7, "브라우저 localStorage", { kind: "external" }),
];
const E = (from, to, kind = "import", label) => ({ from, to, kind, label });
const edges = [
  E("user", W + "widgets/layout/Header.tsx", "actor", "+ 버튼"),
  E(W + "widgets/layout/Header.tsx", W + "features/bookmark/ui/AddBookmarkOverlay.tsx"),
  E(W + "features/bookmark/ui/AddBookmarkOverlay.tsx", W + "features/bookmark/model/bookmark.service.ts"),
  E(W + "features/bookmark/ui/AddBookmarkOverlay.tsx", W + "features/bookmark/model/useBookmarkPipeline.ts"),
  E(W + "features/bookmark/model/useBookmarkPipeline.ts", W + "features/bookmark/model/bookmark.service.ts"),
  E(W + "features/bookmark/model/useBookmarkPipeline.ts", W + "app/api/crawl/route.ts", "http", "fetch ①"),
  E(W + "features/bookmark/model/useBookmarkPipeline.ts", W + "app/api/ai-analyze/route.ts", "http", "fetch ②"),
  E(W + "features/bookmark/model/useBookmarkPipeline.ts", W + "app/api/embed/route.ts", "http", "fetch ③"),
  E(W + "features/bookmark/model/bookmark.service.ts", W + "entities/bookmark/api/local.repository.ts"),
  E(W + "features/bookmark/model/bookmark.service.ts", W + "entities/bookmark/api/supabase.repository.ts"),
  E(W + "app/api/crawl/route.ts", W + "server/services/crawler.service.ts"),
  E(W + "app/api/crawl/route.ts", W + "shared/lib/validateSsrf.ts"),
  E(W + "app/api/crawl/route.ts", W + "shared/lib/rateLimit.ts"),
  E(W + "app/api/crawl/route.ts", W + "shared/lib/guestCookie.ts"),
  E(W + "app/api/crawl/route.ts", W + "shared/api/supabase/server.ts"),
  E(W + "app/api/ai-analyze/route.ts", W + "server/services/ai-analysis.service.ts"),
  E(W + "app/api/ai-analyze/route.ts", W + "shared/lib/rateLimit.ts"),
  E(W + "app/api/ai-analyze/route.ts", W + "shared/lib/guestCookie.ts"),
  E(W + "app/api/ai-analyze/route.ts", W + "shared/api/supabase/server.ts"),
  E(W + "app/api/embed/route.ts", W + "shared/lib/rateLimit.ts"),
  E(W + "app/api/embed/route.ts", W + "shared/lib/guestCookie.ts"),
  E(W + "app/api/embed/route.ts", W + "shared/api/supabase/server.ts"),
  E(W + "server/services/crawler.service.ts", W + "shared/lib/validateSsrf.ts"),
  E(W + "entities/bookmark/api/supabase.repository.ts", W + "shared/api/supabase/client.ts"),
  E(W + "entities/bookmark/api/local.repository.ts", W + "shared/lib/storage.ts"),
  E(W + "server/services/crawler.service.ts", "ext:site", "external", "fetch"),
  E(W + "server/services/ai-analysis.service.ts", "ext:gemini", "external", "요약·태그"),
  E(W + "app/api/embed/route.ts", "ext:gemini", "external", "임베딩"),
  E(W + "shared/api/supabase/client.ts", "ext:supabase", "external"),
  E(W + "shared/api/supabase/server.ts", "ext:supabase", "external", "auth"),
  E(W + "shared/lib/storage.ts", "ext:localstorage", "external"),
];

// ---- graph.json: import 연결 검증 + 파일별 심볼 수 ----
const g = JSON.parse(readFileSync(graphPath, "utf8"));
const norm = (p) => (p ?? "").replace(/\\/g, "/").replace(/^\.\//, "");
const fileOfNode = new Map(g.nodes.map((n) => [n.id, norm(n.source_file)]));
const symbols = new Map();
for (const f of fileOfNode.values()) if (f) symbols.set(f, (symbols.get(f) ?? 0) + 1);
const fileEdges = new Set();
for (const l of g.links) {
  const a = fileOfNode.get(l.source), b = fileOfNode.get(l.target);
  if (a && b && a !== b) fileEdges.add(`${a}|${b}`);
}
for (const e of edges) {
  if (e.kind !== "import") continue;
  if (!fileEdges.has(`${e.from}|${e.to}`)) console.warn(`graph.json에 없는 import: ${e.from} -> ${e.to}`);
}

// ---- QA 장부: 파일별 상태 ----
const lib = await import(pathToFileURL(path.join(ROOT, "scripts/qa/lib.mjs")));
const cfg = lib.loadConfig();
const facts = lib.loadFacts();
const RANK = { fresh: 5, partial: 4, stale: 3, failing: 2, broken: 2, unverified: 1, hold: 0 };
const cover = new Map();
for (const sc of lib.loadScenarios()) {
  const r = lib.statusOf(sc, cfg, facts);
  for (const f of r.link.files) {
    const cur = cover.get(f) ?? { status: null, scenarios: [] };
    cur.scenarios.push(`${sc.id} (${r.status})`);
    if (cur.status === null || RANK[r.status] > RANK[cur.status]) cur.status = r.status;
    cover.set(f, cur);
  }
}
const data = {
  columns: COLUMNS,
  nodes: nodes.map((n) => ({
    ...n,
    symbols: symbols.get(n.id) ?? 0,
    qa: cover.get(n.id)?.status ?? null,
    scenarios: cover.get(n.id)?.scenarios ?? [],
  })),
  edges,
  commit: g.built_at_commit ? String(g.built_at_commit).slice(0, 7) : "",
  at: new Date().toISOString().slice(0, 16),
};

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>URL 저장 경로</title>
<style>
:root{--bg:#171a22;--fg:#e6e8ef;--muted:#8b92a5;--panel:#1f2330;--line:#323848;--edge:#5b7fd6;--http:#c9a227;--ext:#7a8396;
  --fresh:#3ec46d;--warn:#e8a317;--bad:#e5533d;--none:#4b5163}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif}
header{padding:12px 16px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 24px;align-items:baseline}
h1{font-size:17px;margin:0}.sub{color:var(--muted);font-size:12px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--muted)}.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:2px solid transparent}
.ln{width:22px;height:0;border-top:2px solid var(--edge);display:inline-block}.ln.http{border-top-style:dashed;border-color:var(--http)}.ln.ext{border-color:var(--ext)}
#wrap{position:relative;height:calc(100% - 62px);display:flex}
#net{flex:1;min-width:0}
#side{width:320px;border-left:1px solid var(--line);background:var(--panel);padding:14px 16px;overflow:auto;font-size:13px}
#side h2{font-size:14px;margin:0 0 6px;word-break:break-all}#side .muted{color:var(--muted)}#side ul{padding-left:18px;margin:6px 0}
#side .hint{color:var(--muted);font-size:12px;margin-top:12px}
@media (max-width:900px){#side{display:none}}
</style></head><body>
<header>
<div><h1>URL 저장 한 번이 지나가는 길</h1><div class="sub">입구(+ 버튼)부터 바깥(Gemini, Supabase)까지 · 그래프 커밋 ${data.commit} · ${data.at} UTC</div></div>
<div class="legend">
<span><i class="ln"></i>import</span><span><i class="ln http"></i>fetch (import 아님, 손으로 추가)</span><span><i class="ln ext"></i>바깥으로</span>
<span><i class="dot" style="border-color:var(--fresh)"></i>검증됨</span><span><i class="dot" style="border-color:var(--warn)"></i>재검증 필요</span><span><i class="dot" style="border-color:var(--bad)"></i>실패</span><span><i class="dot" style="border-color:var(--none)"></i>시나리오 없음</span>
</div>
</header>
<div id="wrap"><div id="net"></div><aside id="side"><div class="muted">점을 누르면 그 파일을 지나는 길만 밝게 남고, 여기에 파일과 QA 상태가 뜹니다.</div><div class="hint">실선은 graph.json에 있는 import만 그렸습니다. 화면에서 API로 가는 fetch는 import가 아니라 그래프에 없어서 점선으로 손으로 넣었습니다.</div></aside></div>
<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"></script>
<script id="data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>
const D=JSON.parse(document.getElementById("data").textContent);
const css=getComputedStyle(document.documentElement);const col=k=>css.getPropertyValue("--"+k).trim();
const QA=s=>s==="fresh"?"fresh":(s==="partial"||s==="stale")?"warn":(s==="failing"||s==="broken")?"bad":"none";
const QALABEL={fresh:"통과",partial:"부분 검증",stale:"재검증 필요",failing:"실패",broken:"검사 오류",unverified:"미검증",hold:"보류"};
const fill=n=>n.kind==="actor"?"#3b4a7a":n.kind==="external"?"#2a2f3d":"#2f4fa8";
const nodes=new vis.DataSet(D.nodes.map(n=>({
  id:n.id,label:n.label,level:n.level,
  shape:n.kind==="external"?"box":"dot",size:n.kind==="actor"?14:Math.max(10,Math.min(22,8+Math.sqrt(n.symbols)*2.2)),
  color:{background:fill(n),border:n.kind?"#4a5370":col(QA(n.qa)),highlight:{background:fill(n),border:"#ffffff"}},
  borderWidth:n.kind?1:3,font:{color:col("fg"),size:13,face:"system-ui",background:"rgba(23,26,34,.85)"},
  margin:n.kind==="external"?8:undefined
})));
const edgeColor=e=>e.kind==="http"?col("http"):e.kind==="external"?col("ext"):col("edge");
const edges=new vis.DataSet(D.edges.map((e,i)=>({
  id:i,from:e.from,to:e.to,label:e.label||undefined,
  dashes:e.kind==="http"?[6,5]:false,
  color:{color:edgeColor(e),opacity:.85},
  width:e.kind==="http"?2:1.4,arrows:{to:{enabled:true,scaleFactor:.6}},
  font:{color:col("muted"),size:11,strokeWidth:0,background:"rgba(23,26,34,.9)",align:"horizontal"},
  smooth:{type:"cubicBezier",forceDirection:"horizontal",roundness:.5}
})));
const net=new vis.Network(document.getElementById("net"),{nodes,edges},{
  layout:{hierarchical:{enabled:true,direction:"LR",sortMethod:"directed",levelSeparation:230,nodeSpacing:96,treeSpacing:40,blockShifting:true,edgeMinimization:true}},
  physics:false,interaction:{hover:true,dragNodes:true,zoomView:true,dragView:true},
  nodes:{shadow:false},edges:{selectionWidth:1}
});
// 열 제목: 캔버스 좌표로 그려서 확대·이동을 따라간다
net.on("afterDrawing",ctx=>{
  const pos=net.getPositions();const xs={},top=Infinity;let minY=Infinity;
  for(const n of D.nodes){const p=pos[n.id];if(!p)continue;xs[n.level]=p.x;if(p.y<minY)minY=p.y;}
  ctx.font="600 12px system-ui";ctx.textAlign="center";ctx.fillStyle=col("muted");
  for(const [lv,x] of Object.entries(xs)) ctx.fillText(D.columns[lv],x,minY-46);
});
// 클릭: 그 노드를 지나는 길(위·아래 전부)만 남기고 나머지는 흐리게
const byId=new Map(D.nodes.map(n=>[n.id,n]));
const out=new Map(),inn=new Map();
for(const e of D.edges){(out.get(e.from)??out.set(e.from,[]).get(e.from)).push(e.to);(inn.get(e.to)??inn.set(e.to,[]).get(e.to)).push(e.from);}
const walk=(start,adj)=>{const s=new Set([start]),q=[start];while(q.length){const c=q.shift();for(const n of adj.get(c)||[])if(!s.has(n)){s.add(n);q.push(n);}}return s;};
function focus(id){
  const keep=id?new Set([...walk(id,out),...walk(id,inn)]):null;
  nodes.update(D.nodes.map(n=>({id:n.id,opacity:keep&&!keep.has(n.id)?.18:1})));
  edges.update(D.edges.map((e,i)=>({id:i,color:{color:edgeColor(e),opacity:keep&&!(keep.has(e.from)&&keep.has(e.to))?.08:.85}})));
  const side=document.getElementById("side");
  if(!id){side.innerHTML='<div class="muted">점을 누르면 그 파일을 지나는 길만 밝게 남고, 여기에 파일과 QA 상태가 뜹니다.</div>';return;}
  const n=byId.get(id);const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  side.innerHTML='<h2>'+esc(n.label)+'</h2><div class="muted">'+esc(n.kind?(n.kind==="actor"?"사용자 동작":"바깥 서비스"):n.id)+'</div>'
    +(n.kind?'':'<div style="margin-top:8px">QA: <b>'+(n.qa?QALABEL[n.qa]||n.qa:"시나리오 없음")+'</b> · 심볼 '+n.symbols+'</div>')
    +(n.scenarios.length?'<ul>'+n.scenarios.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'')
    +'<div class="hint">이 점을 지나는 길: 앞으로 '+(walk(id,inn).size-1)+'개, 뒤로 '+(walk(id,out).size-1)+'개 파일</div>';
}
net.on("click",p=>focus(p.nodes[0]||null));
net.once("afterDrawing",()=>net.fit({animation:false}));
</script></body></html>
`;
writeFileSync(outPath, html);
console.log(JSON.stringify({ nodes: nodes.length, edges: edges.length, out: path.relative(ROOT, outPath) }));
