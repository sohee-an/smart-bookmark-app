// 프로젝트 전체를 "묶음(slice)" 단위로 합쳐 입구부터 왼쪽→오른쪽으로 그린다. 노선도 버전.
// 실행: 레포 루트에서  node docs/demo/graph/flow-map.mjs
//
// flow-all.html은 파일 132개를 다 세워서 복잡하다. 여기서는 features/bookmark, shared/lib 같은
// 폴더 묶음으로 합쳐 점 수를 줄였다. 점을 누르면 그 묶음 안의 파일과 파일 단위 import가 옆에 뜬다.
// 익스텐션은 웹 왼쪽 열에 둔다. 익스텐션 → 웹은 import가 아니라 fetch라 graph.json에 없어서 점선으로 손으로 넣었다.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HERE = path.dirname(new URL(import.meta.url).pathname);
const g = JSON.parse(readFileSync(path.join(HERE, "graphify-out/graph.json"), "utf8"));
const outPath = path.join(HERE, "flow-map.html");

// 열 번호(level) → 제목. 익스텐션은 음수, 웹은 0부터
const COLUMNS = {
  "-3": "extension (입구)",
  "-2": "extension components",
  "-1": "extension lib",
  0: "app (page · route)",
  1: "widgets",
  2: "features",
  3: "entities",
  4: "server",
  5: "shared",
  6: "packages/ui",
};
const LAYER_COLOR = {
  "-3": "#c97b3a", "-2": "#c97b3a", "-1": "#c97b3a",
  0: "#5b7fd6", 1: "#8e6bd6", 2: "#3fa7a0", 3: "#d6a04a", 4: "#d66b6b", 5: "#7f8aa3", 6: "#5f9e5f",
};
const norm = (p) => (p ?? "").replace(/\\/g, "/");
const skip = (f) => /\.(test|stories)\.[tj]sx?$/.test(f) || /\/__tests__\//.test(f) || /\.config\.[tj]s$/.test(f);
function layerOf(f) {
  let m;
  if ((m = f.match(/^apps\/web\/src\/(app|widgets|features|entities|server|shared)\//)))
    return ["app", "widgets", "features", "entities", "server", "shared"].indexOf(m[1]);
  if (/^packages\/ui\/src\//.test(f)) return 6;
  if (/^apps\/extension\/entrypoints\//.test(f)) return -3;
  if (/^apps\/extension\/components\//.test(f)) return -2;
  if (/^apps\/extension\/lib\//.test(f)) return -1;
  return null;
}
const scopeOf = (f) => (/^apps\/extension\//.test(f) ? "ext" : /^packages\/ui\//.test(f) ? "both" : "web");
// 묶음 이름: 폴더 기준. app은 라우트 폴더, 나머지는 레이어/슬라이스
function sliceOf(f) {
  let m;
  if ((m = f.match(/^apps\/web\/src\/app\/api\/([^/]+)/))) return `app/api/${m[1]}`;
  if ((m = f.match(/^apps\/web\/src\/app\/(\([^)]+\))\/([^/]+)\//))) return `app/${m[1]}/${m[2]}`;
  if ((m = f.match(/^apps\/web\/src\/app\/(\([^)]+\))\//))) return `app/${m[1]}`;
  if ((m = f.match(/^apps\/web\/src\/app\/(auth|demo|privacy)\//))) return `app/${m[1]}`;
  if (/^apps\/web\/src\/app\//.test(f)) return "app/(root)";
  if ((m = f.match(/^apps\/web\/src\/(widgets|features|entities)\/([^/]+)/))) return `${m[1]}/${m[2]}`;
  if ((m = f.match(/^apps\/web\/src\/shared\/(api\/supabase|lib\/overlay|ui|lib|config)/))) return `shared/${m[1]}`;
  if (/^apps\/web\/src\/server\//.test(f)) return "server/services";
  if (/^packages\/ui\/src\//.test(f)) return "packages/ui";
  if ((m = f.match(/^apps\/extension\/entrypoints\/([^/.]+)/))) return `extension/${m[1]}`;
  if (/^apps\/extension\/components\//.test(f)) return "extension/components";
  if (/^apps\/extension\/lib\//.test(f)) return "extension/lib";
  return null;
}
// 익스텐션 → 웹 API. import가 아니라 fetch라서 graph.json에 없다. 코드에서 확인해 손으로 적음
const HTTP = [
  ["apps/extension/entrypoints/popup/App.tsx", "apps/web/src/app/api/extension/save-bookmark/route.ts", "save-bookmark"],
  ["apps/extension/components/ImportView.tsx", "apps/web/src/app/api/extension/bulk-import/route.ts", "bulk-import"],
  ["apps/extension/components/BookmarkManager.tsx", "apps/web/src/app/api/extension/organize/route.ts", "organize"],
];

const fileOf = new Map(g.nodes.map((n) => [n.id, norm(n.source_file)]));
const files = new Map(); // file -> {slice, layer, symbols}
for (const f of fileOf.values()) {
  if (!f || layerOf(f) === null || skip(f)) continue;
  const e = files.get(f) ?? { slice: sliceOf(f), layer: layerOf(f), symbols: 0 };
  e.symbols++;
  files.set(f, e);
}
const fileEdges = new Map();
for (const l of g.links) {
  const a = fileOf.get(l.source), b = fileOf.get(l.target);
  if (!a || !b || a === b || !files.has(a) || !files.has(b)) continue;
  fileEdges.set(`${a}|${b}`, (fileEdges.get(`${a}|${b}`) ?? 0) + 1);
}

const slices = new Map();
for (const [f, e] of files) {
  const s = slices.get(e.slice) ?? { id: e.slice, layer: e.layer, scope: scopeOf(f), files: [], symbols: 0 };
  s.files.push(f);
  s.symbols += e.symbols;
  slices.set(e.slice, s);
}
const sliceEdges = new Map(); // "a|b" -> {w, pairs, kind}
const addEdge = (a, b, kind, label) => {
  const sa = files.get(a).slice, sb = files.get(b).slice;
  if (sa === sb) return;
  const k = `${sa}|${sb}|${kind}`;
  const e = sliceEdges.get(k) ?? { from: sa, to: sb, kind, w: 0, pairs: [], labels: [] };
  e.w += 1;
  e.pairs.push([a, b]);
  if (label) e.labels.push(label);
  sliceEdges.set(k, e);
};
for (const [k, w] of fileEdges) {
  const [a, b] = k.split("|");
  for (let i = 0; i < w; i++) addEdge(a, b, "import");
}
for (const [a, b, label] of HTTP) {
  if (!files.has(a) || !files.has(b)) {
    console.warn(`HTTP 연결의 파일이 그래프에 없음: ${a} -> ${b}`);
    continue;
  }
  addEdge(a, b, "http", label);
}
// pairs 중복 정리 (같은 파일 쌍이 여러 심볼로 잡힌 것)
for (const e of sliceEdges.values()) {
  const seen = new Set();
  e.pairs = e.pairs.filter((p) => !seen.has(p.join("|")) && seen.add(p.join("|")));
  e.label = e.labels.length ? [...new Set(e.labels)].join(", ") : undefined;
  delete e.labels;
}
const incoming = new Map();
for (const e of sliceEdges.values()) if (e.kind === "import") incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
let backward = 0;
const edges = [...sliceEdges.values()].map((e) => {
  if (slices.get(e.from).layer > slices.get(e.to).layer) backward++;
  return e;
});
const nodes = [...slices.values()].map((s) => ({
  id: s.id,
  label: s.id.replace(/^apps\/web\/src\//, ""),
  level: s.layer,
  scope: s.scope,
  files: s.files.sort(),
  symbols: s.symbols,
  entry: !incoming.has(s.id),
  inbound: incoming.get(s.id) ?? 0,
}));
const stats = {
  slices: nodes.length,
  files: files.size,
  edges: edges.length,
  fileImports: fileEdges.size,
  backward,
  ext: { slices: nodes.filter((n) => n.scope === "ext").length, files: [...files.values()].filter((e) => e.layer < 0).length },
};
console.log(JSON.stringify(stats));
const data = { columns: COLUMNS, colors: LAYER_COLOR, nodes, edges, stats, commit: g.built_at_commit ? String(g.built_at_commit).slice(0, 7) : "" };

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>import 노선도</title>
<style>
:root{--bg:#171a22;--fg:#e6e8ef;--muted:#8b92a5;--panel:#1f2330;--line:#323848;--http:#e0b24a}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font:14px/1.5 system-ui,-apple-system,"Segoe UI","Malgun Gothic",sans-serif}
header{padding:12px 16px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px 24px;align-items:baseline}
h1{font-size:17px;margin:0}.sub{color:var(--muted);font-size:12px}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--muted)}.legend span{display:inline-flex;align-items:center;gap:6px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}.ln{width:22px;height:0;border-top:2px dashed var(--http);display:inline-block}
.ctl{font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center}.ctl label{cursor:pointer}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}.seg label{padding:3px 10px;cursor:pointer;color:var(--muted)}.seg input{display:none}.seg input:checked+span{color:var(--fg)}.seg label:has(input:checked){background:#2a3040}
#wrap{position:relative;height:calc(100% - 62px);display:flex}#net{flex:1;min-width:0}
#side{width:340px;border-left:1px solid var(--line);background:var(--panel);padding:14px 16px;overflow:auto;font-size:13px}
#side h2{font-size:14px;margin:0 0 6px;word-break:break-all}#side .muted{color:var(--muted)}#side ul{padding-left:18px;margin:6px 0}#side li{word-break:break-all}
#side .hint{color:var(--muted);font-size:12px;margin-top:12px}#side code{font-size:12px;color:var(--fg)}
@media (max-width:900px){#side{display:none}}
</style></head><body>
<header>
<div><h1>import 노선도 (묶음 단위)</h1><div class="sub" id="sub"></div></div>
<div class="legend">
<span><i class="dot" style="background:${LAYER_COLOR["-3"]}"></i>extension</span>
${[0, 1, 2, 3, 4, 5, 6].map((i) => `<span><i class="dot" style="background:${LAYER_COLOR[i]}"></i>${COLUMNS[i]}</span>`).join("")}
<span><i class="ln"></i>fetch (익스텐션 → 웹 API)</span>
</div>
<div class="ctl">
<span class="seg"><label><input type="radio" name="scope" value="both" checked><span>둘 다</span></label><label><input type="radio" name="scope" value="web"><span>웹만</span></label><label><input type="radio" name="scope" value="ext"><span>익스텐션만</span></label></span>
<label><input type="checkbox" id="entries"> 입구만 밝게</label><label><input type="checkbox" id="weights"> 선 굵기 = import 수</label>
</div>
</header>
<div id="wrap"><div id="net"></div><aside id="side"></aside></div>
<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js"></script>
<script id="data" type="application/json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>
const D=JSON.parse(document.getElementById("data").textContent);
const css=getComputedStyle(document.documentElement);const col=k=>css.getPropertyValue("--"+k).trim();
const byId=new Map(D.nodes.map(n=>[n.id,n]));
const DEFAULT_SIDE='<div class="muted">점 하나가 폴더 묶음입니다. 누르면 안에 든 파일과, 어느 파일이 어느 파일을 import하는지 여기에 뜹니다.</div><div class="hint">열은 FSD 층입니다. 역방향 import는 lint가 막아서 0개이고, 그래서 선이 전부 왼쪽에서 오른쪽으로만 갑니다. 익스텐션은 웹 코드를 import하지 않고 웹 API를 fetch로 부릅니다(점선).</div>';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const base=f=>f.replace(/^apps\\/web\\/src\\//,"").replace(/^packages\\/ui\\/src\\//,"ui/").replace(/^apps\\/extension\\//,"extension/");
const XGAP=260,YGAP=56;
const nodes=new vis.DataSet(),edges=new vis.DataSet();
const net=new vis.Network(document.getElementById("net"),{nodes,edges},{
  layout:{hierarchical:false},physics:false,interaction:{hover:true,dragNodes:true,zoomView:true,dragView:true},nodes:{shadow:false},edges:{selectionWidth:1}
});
let scope="both",selected=null,visibleNodes=[],visibleEdges=[];
const inScope=n=>scope==="both"||n.scope==="both"||n.scope===scope;
// 자리 계산: 열 = 층, 열 안 순서 = 이웃의 평균 높이(barycenter), 열마다 세로 가운데 정렬
function layout(ns,es){
  const nb={};for(const e of es){(nb[e.from]??=[]).push(e.to);(nb[e.to]??=[]).push(e.from);}
  const levels=[...new Set(ns.map(n=>n.level))].sort((a,b)=>a-b);
  const byLevel=levels.map(l=>ns.filter(n=>n.level===l));
  const Y={};byLevel.forEach(c=>c.forEach((n,i)=>Y[n.id]=i));
  for(let pass=0;pass<6;pass++){
    const cols=pass%2?[...byLevel].reverse():byLevel;
    for(const c of cols){
      const key=n=>{const ys=(nb[n.id]||[]).filter(m=>byId.get(m).level!==n.level).map(m=>Y[m]);return ys.length?ys.reduce((a,b)=>a+b)/ys.length:Y[n.id];};
      c.sort((a,b)=>key(a)-key(b)||a.label.localeCompare(b.label)).forEach((n,i)=>Y[n.id]=i);
    }
  }
  const POS={};byLevel.forEach(c=>{const n=c.length;c.forEach(nd=>POS[nd.id]={x:levels.indexOf(nd.level)*XGAP,y:(Y[nd.id]-(n-1)/2)*YGAP});});
  return POS;
}
const widthOf=(e,on)=>on?Math.min(6,0.8+Math.log1p(e.w)*1.2):(e.kind==="http"?2:1.4);
function build(){
  // 공용(packages/ui)은 지금 보는 쪽과 실제로 이어져 있을 때만 보인다
  const inner=D.nodes.filter(n=>scope==="both"||n.scope===scope);
  const innerIds=new Set(inner.map(n=>n.id));
  const linked=new Set();for(const e of D.edges){if(innerIds.has(e.from))linked.add(e.to);if(innerIds.has(e.to))linked.add(e.from);}
  visibleNodes=D.nodes.filter(n=>innerIds.has(n.id)||(n.scope==="both"&&linked.has(n.id)));
  const ids=new Set(visibleNodes.map(n=>n.id));
  visibleEdges=D.edges.map((e,i)=>({...e,i})).filter(e=>ids.has(e.from)&&ids.has(e.to));
  const POS=layout(visibleNodes,visibleEdges);
  nodes.clear();edges.clear();
  nodes.add(visibleNodes.map(n=>({
    id:n.id,label:n.label+" ("+n.files.length+")",x:POS[n.id].x,y:POS[n.id].y,fixed:{x:true,y:false},
    shape:"dot",size:Math.max(8,Math.min(26,6+Math.sqrt(n.symbols)*1.6)),
    color:{background:D.colors[n.level],border:n.entry?"#ffffff":D.colors[n.level],highlight:{background:D.colors[n.level],border:"#ffffff"}},
    borderWidth:n.entry?2:1,font:{color:col("fg"),size:12,face:"system-ui",background:"rgba(23,26,34,.85)"}
  })));
  edges.add(visibleEdges.map(e=>({
    id:e.i,from:e.from,to:e.to,label:e.kind==="http"?e.label:undefined,dashes:e.kind==="http"?[6,5]:false,
    color:{color:e.kind==="http"?col("http"):D.colors[byId.get(e.from).level],opacity:.6},
    width:widthOf(e,false),arrows:{to:{enabled:true,scaleFactor:.5}},
    font:{color:col("muted"),size:11,strokeWidth:0,background:"rgba(23,26,34,.9)"},
    smooth:{type:"cubicBezier",forceDirection:"horizontal",roundness:.45}
  })));
  const ext=visibleNodes.filter(n=>n.scope==="ext"),web=visibleNodes.filter(n=>n.scope!=="ext");
  const imp=visibleEdges.filter(e=>e.kind==="import"),http=visibleEdges.filter(e=>e.kind==="http");
  const back=imp.filter(e=>byId.get(e.from).level>byId.get(e.to).level).length;
  document.getElementById("sub").textContent=
    (scope==="ext"?"익스텐션":scope==="web"?"웹":"웹 + 익스텐션")+" · 묶음 "+visibleNodes.length+"개 (파일 "+visibleNodes.reduce((a,n)=>a+n.files.length,0)+"개) · 묶음 간 import "+imp.length+"개"+(http.length?" · fetch "+http.reduce((a,e)=>a+e.pairs.length,0)+"개":"")+" · 역방향 "+back+"개 · 입구 "+visibleNodes.filter(n=>n.entry).length+"개 · 그래프 커밋 "+D.commit;
  if(selected&&!ids.has(selected))selected=null;
  apply();
  setTimeout(()=>net.fit({animation:false}),0);
}
const out=new Map(),inn=new Map();
for(const e of D.edges){(out.get(e.from)??out.set(e.from,[]).get(e.from)).push(e.to);(inn.get(e.to)??inn.set(e.to,[]).get(e.to)).push(e.from);}
const walk=(start,adj,ids)=>{const s=new Set([start]),q=[start];while(q.length){const c=q.shift();for(const n of adj.get(c)||[])if(ids.has(n)&&!s.has(n)){s.add(n);q.push(n);}}return s;};
function apply(){
  const ids=new Set(visibleNodes.map(n=>n.id));
  const onlyEntries=document.getElementById("entries").checked, weights=document.getElementById("weights").checked;
  const keep=selected?new Set([...walk(selected,out,ids),...walk(selected,inn,ids)]):null;
  nodes.update(visibleNodes.map(n=>({id:n.id,opacity:keep?(keep.has(n.id)?1:.12):(onlyEntries&&!n.entry?.25:1)})));
  edges.update(visibleEdges.map(e=>({id:e.i,width:widthOf(e,weights),color:{color:e.kind==="http"?col("http"):D.colors[byId.get(e.from).level],opacity:keep?((keep.has(e.from)&&keep.has(e.to))?.9:.05):.6}})));
  const side=document.getElementById("side");
  if(!selected){side.innerHTML=DEFAULT_SIDE;return;}
  const n=byId.get(selected);
  const outs=visibleEdges.filter(e=>e.from===selected), ins=visibleEdges.filter(e=>e.to===selected);
  const kindTxt=e=>e.kind==="http"?' <span class="muted">(fetch)</span>':'';
  side.innerHTML='<h2>'+esc(n.label)+'</h2><div class="muted">'+esc(D.columns[n.level])+' · 파일 '+n.files.length+'개 · 심볼 '+n.symbols+(n.entry?' · <b>입구</b>':'')+'</div>'
    +'<div class="hint">안에 든 파일</div><ul>'+n.files.map(f=>'<li>'+esc(f.split("/").pop())+'</li>').join('')+'</ul>'
    +'<div class="hint">이 묶음이 가져다 쓰는 곳 '+outs.length+'개 (파일 단위 '+outs.reduce((a,e)=>a+e.pairs.length,0)+'개)</div><ul>'+outs.map(e=>'<li><b>'+esc(byId.get(e.to).label)+'</b>'+kindTxt(e)+'<br>'+e.pairs.slice(0,6).map(p=>'<code>'+esc(p[0].split("/").pop())+' → '+esc(base(p[1]))+'</code>').join('<br>')+(e.pairs.length>6?'<br><span class="muted">외 '+(e.pairs.length-6)+'개</span>':'')+'</li>').join('')+'</ul>'
    +'<div class="hint">이 묶음을 가져다 쓰는 곳 '+ins.length+'개</div><ul>'+ins.map(e=>'<li>'+esc(byId.get(e.from).label)+kindTxt(e)+' <span class="muted">('+e.pairs.length+')</span></li>').join('')+'</ul>';
}
net.on("afterDrawing",ctx=>{
  const pos=net.getPositions();const xs={};let minY=Infinity;
  for(const n of visibleNodes){const p=pos[n.id];if(!p)continue;xs[n.level]=p.x;if(p.y<minY)minY=p.y;}
  ctx.font="600 13px system-ui";ctx.textAlign="center";ctx.fillStyle=col("muted");
  for(const [lv,x] of Object.entries(xs)) ctx.fillText(D.columns[lv],x,minY-36);
});
net.on("click",p=>{selected=p.nodes[0]||null;apply();});
document.getElementById("entries").addEventListener("change",apply);
document.getElementById("weights").addEventListener("change",apply);
for(const r of document.querySelectorAll('input[name=scope]'))r.addEventListener("change",e=>{scope=e.target.value;build();});
build();
</script></body></html>
`;
writeFileSync(outPath, html);
console.log(path.relative(ROOT, outPath));
