/** Compact reproducible evidence index. Does not turn numerical results into an art score. */
import {readFile,writeFile} from 'node:fs/promises';
const root='output/milestone-a';
const read=async p=>JSON.parse(await readFile(`${root}/${p}`,'utf8'));
const summary={milestone:'A',accepted:false,reason:'Shoulder garment has not been rebuilt; thumb opposition, hand contact and volume still need visual correction.',assets:{},parity:{}};
for(const name of ['baseline','hand-fit']){
  const r=await read(`${name}-audit.json`),hands={};
  for(const n of ['HandMesh.L','HandMesh.R']){
    const m=r.meshes[n];hands[n]={vertices:m.topology.vertices,faces:m.topology.faces,quads:m.topology.quads,distal_bridges:m.distal_interfinger_bridges?.length,invalid_weights:m.invalid_weight_count,clips:{}};
    for(const [clip,c] of Object.entries(r.clips)){
      const seq=c.meshes[n];hands[n].clips[clip]={samples:seq.length,max_edge_ratio:Math.max(...seq.map(s=>s.max_edge_ratio)),corroborated_blocker_samples:seq.filter(s=>s.severity==='blocker').length,max_edges_over3:Math.max(...seq.map(s=>s.edges_over_3))};
    }
  }
  summary.assets[name]={source:r.asset,sha256:r.sha256,status:r.status,blocker_samples:r.blocker_samples,review_samples:r.review_samples,hands,zero_area_faces:Object.fromEntries(Object.entries(r.meshes).filter(([,m])=>m.topology.zero_area_faces).map(([n,m])=>[n,m.topology.zero_area_faces]))};
}
for(const name of ['browser-baseline','browser-production-glb','browser-reference','browser-hand-fit','browser-hand-fit-production']){
  const r=await read(`${name}/parity.json`);
  const binds=r.results.map(s=>s.bind_rest_matrix_residual).filter(x=>x!==undefined);
  const sockets=r.results.flatMap(s=>Object.values(s.socket_errors_m||{}).filter(x=>x!==null));
  summary.parity[name]={captures:r.results.length,browser:r.browser,max_error_m:Math.max(...r.results.map(s=>s.max_error_m)),failures:r.results.filter(s=>s.status==='FAIL').length,unmatched:r.results.reduce((n,s)=>n+s.unmatched,0),max_bind_residual:binds.length?Math.max(...binds):null,max_socket_error_m:sockets.length?Math.max(...sockets):null,scope:'Captured poses only; does not prove full animation mixing or visual quality'};
}
await writeFile(`${root}/summary.json`,JSON.stringify(summary,null,2));
const cards=[['rest','Rest Pose'],['half-fist','半握拳'],['fist','握拳压力测试'],['red-44','CastRed 第44帧'],['purple-132','CastPurple 第132帧'],['shoulder-front','肩部前举'],['shoulder-side','肩部侧举'],['shoulder-high','大幅抬臂'],['wrist-flexion','手腕屈曲']];
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Milestone A 实际验收</title><style>body{font:16px/1.6 system-ui;background:#151a22;color:#e8edf4;margin:32px}h1{font-size:26px}.warning{color:#ffcb8d}section{margin:36px 0}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}img{width:100%;background:#222}figure{margin:0}pre{white-space:pre-wrap;background:#202731;padding:20px}a{color:#8cd4ff}</style><h1>Milestone A：未通过</h1><p class="warning">以下全部为实际 Blender 渲染或 Three.js 浏览器截图。候选只替换手部，旧肩部仍在；截图不是完成声明。</p><p>已确认旧手远端跨指连接与权重混合；候选保留 CC0 作者制作的四边形结构，加入掌骨并重绑腕部。拇指对掌、双手接触、制服肩袖和压力姿势仍需返工。基础网格来源：<a href="https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482">MakeHuman 固定版本 / CC0</a>。</p>${cards.map(([id,label])=>`<section><h2>${label}</h2><div class="row">${[['blender-baseline','旧版 Blender'],['blender-hand-fit','候选 Blender'],['browser-hand-fit','候选 Three.js']].map(([dir,title])=>`<figure><figcaption>${title}</figcaption><img loading="lazy" src="${dir}/${id}.png" alt="${title} ${label}"></figure>`).join('')}</div></section>`).join('')}<h2>实际数值摘要（不能代替美术验收）</h2><pre>${JSON.stringify(summary,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></html>`;
await writeFile(`${root}/report.html`,html);
console.log(JSON.stringify(summary,null,2));
