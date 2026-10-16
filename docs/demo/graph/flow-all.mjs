// apps/web 전체 import 관계를 입구(page, route)부터 왼쪽→오른쪽으로 그린다.
// 실행: 레포 루트에서  node docs/demo/graph/flow-all.mjs
//
// graph.html(심볼 단위, 뭉치 배치)과 같은 graph.json을 쓰되, 파일 단위로 합치고
// FSD 층(app → widgets → features → entities → server → shared → packages)을 열로 쓴다.
// 역방향 import는 lint가 막고 있어서 0개다. 그래서 전체를 그려도 한 방향으로 흐른다.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HERE = path.dirname(new URL(import.meta.url).pathname);
const g = JSON.parse(readFileSync(path.join(HERE, "graphify-out/graph.json"), "utf8"));
const outPath = path.join(HERE, "flow-all.html");

const COLUMNS = ["app (page · route)", "widgets", "features", "entities", "server", "shared", "packages/ui"];
const LAYER_COLOR = ["#5b7fd6", "#8e6bd6", "#3fa7a0", "#d6a04a", "#d66b6b", "#7f8aa3", "#5f9e5f"];
const norm = (p) => (p ?? "").replace(/\\/g, "/");
function layerOf(f) {
  const m = f.match(/^apps\/web\/src\/(app|widgets|features|entities|server|shared)\//);
  if (m) return ["app", "widgets", "features", "entities", "server", "shared"].indexOf(m[1]);
  if (/^packages\/ui\/src\//.test(f)) return 6;
  return -1;
}
const skip = (f) => /\.(test|stories)\.[tj]sx?$/.test(f) || /\/__tests__\//.test(f);

const fileOf = new Map(g.nodes.map((n) => [n.id, norm(n.source_file)]));
const symbols = new Map();
for (const f of fileOf.values()) {
  if (f && layerOf(f) >= 0 && !skip(f)) symbols.set(f, (symbols.get(f) ?? 0) + 1);
}
const edgeW = new Map();
for (const l of g.links) {
  const a = fileOf.get(l.source), b = fileOf.get(l.target);
  if (!a || !b || a === b || !symbols.has(a) || !symbols.has(b)) continue;
  edgeW.set(`${a}|${b}`, (edgeW.get(`${a}|${b}`) ?? 0) + 1);
}
const incoming = new Map();
for (const k of edgeW.keys()) incoming.set(k.split("|")[1], (incoming.get(k.split("|")[1]) ?? 0) + 1);

let backward = 0;
const edges = [...edgeW.entries()].map(([k, w]) => {
  const [from, to] = k.split("|");
  if (layerOf(from) > layerOf(to)) backward++;
  return { from, to, w };
});
const short = (f) =>
  f.replace(/^apps\/web\/src\/(app|widgets|features|entities|server|shared)\//, "").replace(/^packages\/ui\/src\//, "ui/");
const nodes = [...symbols.keys()].map((f) => ({
  id: f,
  label: short(f),
  level: layerOf(f),
  symbols: symbols.get(f),
  entry: !incoming.has(f),
  inbound: incoming.get(f) ?? 0,
}));
const stats = {
  files: nodes.length,
  imports: edges.length,
  backward,
  entries: nodes.filter((n) => n.entry).length,
  byLayer: COLUMNS.map((c, i) => `${c} ${nodes.filter((n) => n.level === i).length}`),
};
console.log(JSON.stringify(stats));
const data = { columns: COLUMNS, colors: LAYER_COLOR, nodes, edges, stats, commit: g.built_at_commit ? String(g.built_at_commit).slice(0, 7) : "" };

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>import 흐름 (전체)</title>
<style>
:root{--bg:#171a22;--fg:#e6e8ef;--muted:#8b92a5;--panel:#1f2330;--line:#323848}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif}
header{padding:12px 16px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 24px;align-items:baseline}
h1{font-size:17px;margin:0}.sub{color:var(--muted);font-size:12px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--muted)}.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.ctl{font-size:12px;color:var(--muted)}.ctl label{cursor:pointer;margin-right:12px}
#wrap{position:relative;height:calc(100% - 62px);display:flex}#net{flex:1;min-width:0}
#side{width:320px;border-left:1px solid var(--line);background:var(--panel);padding:14px 16px;overflow:auto;font-size:13px}
#side h2{font-size:14px;margin:0 0 6px;word-break:break-all}#side .muted{color:var(--muted)}#side ul{padding-left:18px;margin:6px 0}#side li{word-break:break-all}
#side .hint{color:var(--muted);font-size:12px;margin-top:12px}
@media (max-width:900px){#side{display:none}}
</style></head><body>
<header>
<div><h1>import 흐름 (apps/web 전체)</h1><div class="sub">파일 ${stats.files}개 · import ${stats.imports}개 · 역방향 ${stats.backward}개 · 입구 ${stats.entries}개 · 그래프 커밋 ${data.commit}</div></div>
<div class="legend">${COLUMNS.map((c, i) => `<span><i class="dot" style="background:${LAYER_COLOR[i]}"></i>${c}</span>`).join("")}</div>
<div class="ctl"><label><input type="checkbox" id="hub" checked> 많이 쓰이는 파일(들어오는 import 8개 이상)은 접기</label><label><input type="checkbox" id="entries"> 입구만 밝게</label></div>
</header>
<div id="wrap"><div id="net"></div><aside id="side"><div class="muted">점을 누르면 그 파일에서 시작해 오른쪽으로 닿는 파일과, 그 파일을 쓰는 왼쪽 파일만 밝게 남습니다.</div><div class="hint">열은 FSD 층입니다. 상위 층이 하위 층만 import할 수 있고 역방향은 lint가 막습니다. 그래서 선이 전부 왼쪽에서 오른쪽으로만 갑니다.</div></aside></div>
<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"></script>
<script id="data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>
const D=JSON.parse(document.getElementById("data").textContent);
const css=getComputedStyle(document.documentElement);const col=k=>css.getPropertyValue("--"+k).trim();
const HUB=8;
const isHub=n=>n.inbound>=HUB;
const nodes=new vis.DataSet(D.nodes.map(n=>({
  id:n.id,label:n.label,level:n.level,
  shape:"dot",size:Math.max(6,Math.min(20,5+Math.sqrt(n.symbols)*2)),
  color:{background:D.colors[n.level],border:n.entry?"#ffffff":D.colors[n.level],highlight:{background:D.colors[n.level],border:"#ffffff"}},
  borderWidth:n.entry?2:1,
  font:{color:col("fg"),size:11,face:"system-ui",background:"rgba(23,26,34,.8)"}
})));
const levelOf=id=>D.nodes.find(n=>n.id===id).level;
const sameLayer=e=>levelOf(e.from)===levelOf(e.to);
const edges=new vis.DataSet(D.edges.map((e,i)=>({
  id:i,from:e.from,to:e.to,
  color:{color:D.colors[D.nodes.find(n=>n.id===e.from).level],opacity:.45},
  width:Math.min(3,0.6+Math.log1p(e.w)*0.5),arrows:{to:{enabled:true,scaleFactor:.5}},
  smooth:sameLayer(e)?{type:"curvedCW",roundness:.35}:{type:"cubicBezier",forceDirection:"horizontal",roundness:.4}
})));
const net=new vis.Network(document.getElementById("net"),{nodes,edges},{
  layout:{hierarchical:{enabled:true,direction:"LR",sortMethod:"directed",levelSeparation:260,nodeSpacing:44,treeSpacing:20,blockShifting:true,edgeMinimization:true,parentCentralization:true}},
  physics:false,interaction:{hover:true,dragNodes:true,zoomView:true,dragView:true},nodes:{shadow:false},edges:{selectionWidth:1}
});
net.on("afterDrawing",ctx=>{
  const pos=net.getPositions();const xs={};let minY=Infinity;
  for(const n of D.nodes){const p=pos[n.id];if(!p)continue;xs[n.level]=p.x;if(p.y<minY)minY=p.y;}
  ctx.font="600 13px system-ui";ctx.textAlign="center";ctx.fillStyle=col("muted");
  for(const [lv,x] of Object.entries(xs)) ctx.fillText(D.columns[lv],x,minY-40);
});
const byId=new Map(D.nodes.map(n=>[n.id,n]));
const out=new Map(),inn=new Map();
for(const e of D.edges){(out.get(e.from)??out.set(e.from,[]).get(e.from)).push(e.to);(inn.get(e.to)??inn.set(e.to,[]).get(e.to)).push(e.from);}
const walk=(start,adj,stopAtHub)=>{const s=new Set([start]),q=[start];while(q.length){const c=q.shift();for(const n of adj.get(c)||[]){if(s.has(n))continue;s.add(n);if(!(stopAtHub&&isHub(byId.get(n))))q.push(n);}}return s;};
let selected=null;
function apply(){
  const hub=document.getElementById("hub").checked, onlyEntries=document.getElementById("entries").checked;
  const keep=selected?new Set([...walk(selected,out,hub),...walk(selected,inn,hub)]):null;
  nodes.update(D.nodes.map(n=>{
    let op=1;
    if(keep&&!keep.has(n.id))op=.12;
    else if(!keep&&onlyEntries&&!n.entry)op=.25;
    return {id:n.id,opacity:op,hidden:false};
  }));
  edges.update(D.edges.map((e,i)=>{
    let op=.45;
    if(keep)op=(keep.has(e.from)&&keep.has(e.to))?.9:.04;
    else if(hub&&isHub(byId.get(e.to)))op=.06;
    else if(sameLayer(e))op=.2;
    return {id:i,color:{color:D.colors[byId.get(e.from).level],opacity:op}};
  }));
  const side=document.getElementById("side");
  if(!selected){side.innerHTML='<div class="muted">점을 누르면 그 파일에서 시작해 오른쪽으로 닿는 파일과, 그 파일을 쓰는 왼쪽 파일만 밝게 남습니다.</div><div class="hint">열은 FSD 층입니다. 상위 층이 하위 층만 import할 수 있고 역방향은 lint가 막습니다. 그래서 선이 전부 왼쪽에서 오른쪽으로만 갑니다.</div>';return;}
  const n=byId.get(selected);const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const down=[...walk(selected,out,hub)].filter(x=>x!==selected),up=[...walk(selected,inn,hub)].filter(x=>x!==selected);
  side.innerHTML='<h2>'+esc(n.label)+'</h2><div class="muted">'+esc(n.id)+'</div><div style="margin-top:8px">'+D.columns[n.level]+' · 심볼 '+n.symbols+' · 이 파일을 쓰는 곳 '+n.inbound+'개'+(n.entry?' · <b>입구</b>':'')+(isHub(n)?' · 많이 쓰이는 파일':'')+'</div>'
    +'<div class="hint">오른쪽으로 닿는 파일 '+down.length+'개</div><ul>'+down.slice(0,25).map(x=>'<li>'+esc(byId.get(x).label)+'</li>').join('')+(down.length>25?'<li>외 '+(down.length-25)+'개</li>':'')+'</ul>'
    +'<div class="hint">이 파일을 쓰는 왼쪽 파일 '+up.length+'개</div><ul>'+up.slice(0,25).map(x=>'<li>'+esc(byId.get(x).label)+'</li>').join('')+(up.length>25?'<li>외 '+(up.length-25)+'개</li>':'')+'</ul>';
}
net.on("click",p=>{selected=p.nodes[0]||null;apply();});
document.getElementById("hub").addEventListener("change",apply);
document.getElementById("entries").addEventListener("change",apply);
apply();
net.once("afterDrawing",()=>net.fit({animation:false}));
</script></body></html>
`;
writeFileSync(outPath, html);
console.log(path.relative(ROOT, outPath));
