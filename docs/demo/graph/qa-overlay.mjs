// QATester 장부를 Graphify 그래프에 겹친다. 실행: cwd=sb-qa 에서 node <이 파일> <graph.json> <out.html>
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [graphPath, outPath] = process.argv.slice(2);
const lib = await import(pathToFileURL(path.join(process.cwd(), "scripts/qa/lib.mjs")));
const cfg = lib.loadConfig();
const scenarios = lib.loadScenarios();
const facts = lib.loadFacts();

// 상태 우선순위: 파일 하나에 여러 시나리오가 걸리면 가장 좋은 상태로 칠한다
const RANK = { fresh: 5, partial: 4, stale: 3, failing: 2, broken: 2, unverified: 1, hold: 0 };
const COLOR_OF = (s) =>
  s === "fresh" ? "fresh" : s === "partial" || s === "stale" ? "warn" : s === "failing" || s === "broken" ? "bad" : "none";

const cover = new Map(); // file -> { status, scenarios: [{id,status}] }
for (const sc of scenarios) {
  const r = lib.statusOf(sc, cfg, facts);
  for (const f of r.link.files) {
    const cur = cover.get(f) ?? { status: null, scenarios: [] };
    cur.scenarios.push({ id: sc.id, status: r.status });
    if (cur.status === null || RANK[r.status] > RANK[cur.status]) cur.status = r.status;
    cover.set(f, cur);
  }
}

const g = JSON.parse(readFileSync(graphPath, "utf8"));
const norm = (p) => (p ?? "").replace(/\\/g, "/").replace(/^\.\//, "");
const nodeFile = new Map();
const files = new Map(); // file -> { symbols, community }
for (const n of g.nodes) {
  const f = norm(n.source_file);
  if (!f || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) continue;
  nodeFile.set(n.id, f);
  const e = files.get(f) ?? { symbols: 0, communities: {} };
  e.symbols++;
  if (n.community_name) e.communities[n.community_name] = (e.communities[n.community_name] ?? 0) + 1;
  files.set(f, e);
}
const edgeKey = new Map();
for (const l of g.links) {
  const a = nodeFile.get(l.source), b = nodeFile.get(l.target);
  if (!a || !b || a === b) continue;
  const k = a < b ? `${a}|${b}` : `${b}|${a}`;
  edgeKey.set(k, (edgeKey.get(k) ?? 0) + 1);
}

const nodes = [...files.entries()].map(([f, e]) => {
  const c = cover.get(f);
  const community = Object.entries(e.communities).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
  return {
    id: f,
    s: e.symbols,
    k: c ? COLOR_OF(c.status) : "none",
    st: c?.status ?? null,
    sc: c ? c.scenarios.map((x) => `${x.id} (${x.status})`) : [],
    cm: community,
  };
});
const links = [...edgeKey.entries()].map(([k, w]) => {
  const [source, target] = k.split("|");
  return { source, target, w };
});
const count = { fresh: 0, warn: 0, bad: 0, none: 0 };
for (const n of nodes) count[n.k]++;
const commit = g.built_at_commit ? String(g.built_at_commit).slice(0, 7) : "";
const data = { nodes, links, count, commit, scenarios: scenarios.length, at: new Date().toISOString().slice(0, 16) };

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA 검증 지도</title>
<style>
:root{--bg:#fbfaf7;--fg:#1f2328;--muted:#6b7280;--panel:#ffffff;--line:#d9d6cf;--fresh:#2f9e44;--warn:#e8a317;--bad:#d64545;--none:#b8b4ab}
@media (prefers-color-scheme:dark){:root{--bg:#16181c;--fg:#e8e6e1;--muted:#9aa0a6;--panel:#1f2227;--line:#363a40;--none:#5b5f66}}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif}
header{padding:14px 16px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px 24px;align-items:baseline}
h1{font-size:17px;margin:0}.sub{color:var(--muted);font-size:12px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px}.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
#wrap{position:relative;height:calc(100% - 70px)}svg{width:100%;height:100%;display:block}
#tip{position:absolute;pointer-events:none;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:12px;max-width:420px;display:none;box-shadow:0 4px 14px rgba(0,0,0,.12)}
#tip b{font-size:13px;word-break:break-all}#tip ul{margin:4px 0 0;padding-left:16px}
.ctl{font-size:12px;color:var(--muted)}.ctl label{cursor:pointer}
</style></head><body>
<header>
<div><h1>QA 검증 지도</h1><div class="sub">Graphify 코드 그래프(파일 단위) 위에 QATester 장부를 겹침 · 그래프 커밋 ${commit} · 시나리오 ${data.scenarios}개 · ${data.at} UTC</div></div>
<div class="legend">
<span><i class="dot" style="background:var(--fresh)"></i>검증됨 ${count.fresh}</span>
<span><i class="dot" style="background:var(--warn)"></i>부분 검증, 재검증 필요 ${count.warn}</span>
<span><i class="dot" style="background:var(--bad)"></i>실패, 검사 오류 ${count.bad}</span>
<span><i class="dot" style="background:var(--none)"></i>시나리오 없음 ${count.none}</span>
</div>
<div class="ctl"><label><input type="checkbox" id="only"> 시나리오 있는 파일만</label></div>
</header>
<div id="wrap"><svg id="svg"></svg><div id="tip"></div></div>
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script id="data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>
const D=JSON.parse(document.getElementById("data").textContent);
const css=getComputedStyle(document.documentElement);
const col=k=>css.getPropertyValue("--"+k).trim();
const svg=d3.select("#svg"),tip=document.getElementById("tip"),wrap=document.getElementById("wrap");
const g=svg.append("g");
svg.call(d3.zoom().scaleExtent([0.1,6]).on("zoom",e=>g.attr("transform",e.transform)));
let sim;
function draw(onlyCovered){
  g.selectAll("*").remove(); if(sim) sim.stop();
  const keep=new Set(D.nodes.filter(n=>!onlyCovered||n.k!=="none").map(n=>n.id));
  const nodes=D.nodes.filter(n=>keep.has(n.id)).map(n=>({...n}));
  const links=D.links.filter(l=>keep.has(l.source)&&keep.has(l.target)).map(l=>({...l}));
  const {width:w,height:h}=wrap.getBoundingClientRect();
  sim=d3.forceSimulation(nodes)
    .force("link",d3.forceLink(links).id(d=>d.id).distance(40).strength(0.4))
    .force("charge",d3.forceManyBody().strength(-60))
    .force("center",d3.forceCenter(w/2,h/2))
    .force("collide",d3.forceCollide(d=>r(d)+2));
  const link=g.append("g").attr("stroke",col("line")).attr("stroke-opacity",0.7)
    .selectAll("line").data(links).join("line").attr("stroke-width",d=>Math.min(3,0.5+Math.log1p(d.w)*0.5));
  const node=g.append("g").selectAll("circle").data(nodes).join("circle")
    .attr("r",r).attr("fill",d=>col(d.k)).attr("stroke",col("bg")).attr("stroke-width",1)
    .on("mousemove",(e,d)=>{const b=wrap.getBoundingClientRect();
      tip.innerHTML="<b>"+esc(d.id)+"</b><div>"+(d.st?("상태: "+label(d.st)):"시나리오 없음")+" · 심볼 "+d.s+(d.cm?(" · "+esc(d.cm)):"")+"</div>"+(d.sc.length?"<ul>"+d.sc.slice(0,8).map(s=>"<li>"+esc(s)+"</li>").join("")+(d.sc.length>8?"<li>외 "+(d.sc.length-8)+"개</li>":"")+"</ul>":"");
      tip.style.display="block";
      const x=Math.min(e.clientX-b.left+12,b.width-tip.offsetWidth-8);tip.style.left=Math.max(8,x)+"px";tip.style.top=(e.clientY-b.top+12)+"px";})
    .on("mouseleave",()=>tip.style.display="none")
    .call(d3.drag().on("start",(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y})
      .on("drag",(e,d)=>{d.fx=e.x;d.fy=e.y}).on("end",(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  sim.on("tick",()=>{link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
    node.attr("cx",d=>d.x).attr("cy",d=>d.y)});
}
function r(d){return 3+Math.sqrt(d.s)*1.4}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function label(s){return {fresh:"통과",partial:"부분 검증",stale:"재검증 필요",failing:"실패",broken:"검사 오류",unverified:"미검증",hold:"보류"}[s]||s}
document.getElementById("only").addEventListener("change",e=>draw(e.target.checked));
draw(false);
</script></body></html>
`;
writeFileSync(outPath, html);
console.log(JSON.stringify({ files: nodes.length, links: links.length, count, bytes: html.length }));
