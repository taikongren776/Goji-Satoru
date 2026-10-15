/** Summarize only files actually produced by Blender/Edge. Never infers an artistic pass. */
import {readFile,writeFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
const root='output/milestone-a2';
const read=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const [base,trial,final,def,preservation,manifest]=await Promise.all(['baseline-contacts.json','candidate-contacts.json','spacing-contacts.json','spacing-deformation.json','preservation.json','blender-spacing/manifest.json'].map(read));
for(const x of [base,trial,final])if(!x.completed)throw new Error('Incomplete contact run');
function contacts(r){return Object.fromEntries(Object.entries(r.clips).map(([name,rows])=>[name,{samples:rows.length,
  double_hand_crossing_samples:rows.filter(s=>s.pairs.left__right.crossing_pairs>0).length,
  max_left_self_crossing_pairs:Math.max(...rows.map(s=>s.pairs['HandMesh.L__self'].crossing_pairs)),
  max_right_self_crossing_pairs:Math.max(...rows.map(s=>s.pairs['HandMesh.R__self'].crossing_pairs)),
  min_left_right_vertex_surface_gap_mm:Math.min(...rows.map(s=>s.left_right_vertex_surface_gap_m))*1000}]))}
const deformation=Object.fromEntries(Object.entries(def.clips).map(([name,c])=>[name,{samples:c.meshes['HandMesh.R'].length,
  max_hand_edge_ratio:Math.max(...[...c.meshes['HandMesh.L'],...c.meshes['HandMesh.R']].map(s=>s.max_edge_ratio)),
  hand_edges_over_three_samples:[...c.meshes['HandMesh.L'],...c.meshes['HandMesh.R']].filter(s=>s.edges_over_3>0).length}]));
const parity={};for(const folder of ['browser-baseline','browser-candidate','browser-spacing','browser-production']){
  const r=await read(folder+'/parity.json');parity[folder]={captures:r.results.length,failures:r.results.filter(x=>x.status!=='SKINNING_PARITY_PASS').length,max_error_mm:Math.max(...r.results.map(x=>x.max_error_m))*1000,
  max_socket_error_mm:Math.max(...r.results.flatMap(x=>Object.values(x.socket_errors_m||{}).filter(v=>v!==null)))*1000,errors:r.errors};
}
const smoke=await read('application-smoke.json');if(smoke.length!==3||smoke.some(x=>x.status!=='PASS'))throw new Error('Integration run incomplete');
const summary={status:'MILESTONE_A_NOT_PASSED',candidate:'blender/candidates/gojo-a2-purple-spacing.blend',
  completed:['Protected original assets; independent candidate and verified preservation','Only CastPurple arm/wrist spacing changed; 8 seconds retained','Six-clip deformation/contact sampling and real Blender/Three captures'],
  incomplete:['Shoulder/axilla/sleeve topology replacement','Clavicle/shoulder helper/forearm twist integration','Reliable thumb opposition and fist volume','Complete shoulder self-intersection solver','Continuous production blending/cancel per-vertex parity','1080p frame-rate benchmark'],
  rejected:['motion-study and motion-v2 thumb retargeting introduced self-crossings; not recommended'],
  contacts:{baseline:contacts(base),rejected_v2:contacts(trial),spacing:contacts(final)},deformation,
  global_deformation:{status:def.status,blocker_samples:def.blocker_samples,review_samples:def.review_samples,historical:def.scope_results.historical_defects},
  parity,preservation:preservation.checks,application_smoke:smoke.map(x=>({asset:x.asset,check:x.check,status:x.status})),
  limitations:final.limitations,
  asset_gap:'No approved tailored uniform shoulder mesh. Existing MakeHuman reference is anatomy only. Queried catsuit has conflicting per-file AGPL3 and repository CC0 declarations and was not imported.'};
await writeFile(path.join(root,'summary.json'),JSON.stringify(summary,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const labels={'rest':'Rest · 上轮手部基线','open':'自然展开（基线与 Rest 相同）','half-fist':'半握拳 · 未通过体积验收','fist':'握拳 · 未通过体积验收','fist-palm':'握拳掌侧','thumb-open':'拇指自然展开','thumb-index':'不支持拇指碰食指：这里显示中立姿态','thumb-middle':'不支持拇指碰中指：这里显示中立姿态','red-44':'赫 · 第44帧','purple-132':'茈 · 第132帧 / 形成姿势','purple-138':'茈 · 第138帧 / 蓄力结束','purple-152':'茈 · 第152帧 / 释放','shoulder-natural-close':'旧肩袖 · 自然下垂','shoulder-front-90-close':'旧肩袖 · 前举90°','shoulder-side-120-close':'旧肩袖 · 侧举120°'};
const figure=(folder,id,caption)=>`<figure><a href="${folder}/${id}.png" target="_blank"><img loading="lazy" src="${folder}/${id}.png" alt="${esc(caption)}"></a><figcaption>${esc(caption)}</figcaption></figure>`;
const sections=manifest.poses.map(p=>`<section id="${p.id}"><h2>${esc(labels[p.id]||p.id)}</h2><div class="grid">${figure('blender-baseline',p.id,'A1 基线 · Blender')}${figure('blender-spacing',p.id,'仅调整茈 · Blender')}${figure('browser-spacing',p.id,'同一候选 · Three.js')}</div></section>`).join('');
const rows=Object.keys(summary.contacts.spacing).map(n=>{const b=summary.contacts.baseline[n],s=summary.contacts.spacing[n],r=summary.contacts.rejected_v2[n];return `<tr><td>${n}</td><td>${s.samples}</td><td>${b.double_hand_crossing_samples} → ${s.double_hand_crossing_samples}</td><td>${b.max_right_self_crossing_pairs} / ${r.max_right_self_crossing_pairs} / ${s.max_right_self_crossing_pairs}</td><td>${deformation[n].max_hand_edge_ratio.toFixed(3)}</td></tr>`}).join('');
const shoulders=(await readdir(path.join(root,'shoulder-views'))).filter(x=>x.endsWith('.png')).map(x=>figure('shoulder-views',x.slice(0,-4),x.slice(0,-4))).join('');
const topology=['shoulder-natural-close','shoulder-front-90-close','shoulder-side-120-close'].map(id=>`<div class="pair">${figure('shoulder-wire',id,'旧肩袖线框 · 未重建')}${figure('shoulder-weights',id,'UpperArm.R 权重 · 蓝0 / 绿0.5 / 红1')}</div>`).join('');
const rejected=['thumb-index','thumb-middle','fist-palm'].map(id=>figure('blender-candidate',id,'已拒绝的拇指试作 v2 · '+id)).join('');
await writeFile(path.join(root,'report.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIMITLESS · Milestone A2 实际验收</title><style>body{margin:0;background:#10151d;color:#e7edf5;font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1450px;margin:auto;padding:32px}h1{font-size:30px}h2{font-size:21px}p{max-width:1000px}.status{border-left:5px solid #ff967f;background:#302126;padding:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.pair{display:grid;grid-template-columns:repeat(2,1fr)}figure{margin:0;padding:6px}img{width:100%;display:block;background:#1a222e}figcaption{font-size:14px;color:#b9c8dc}section{padding:22px 0;border-top:1px solid #344051}table{border-collapse:collapse;width:100%}td,th{border:1px solid #344051;padding:9px;text-align:left}a{color:#9bcaff}nav{position:sticky;top:0;background:#10151df2;padding:10px;display:flex;flex-wrap:wrap;gap:16px;z-index:1}details{padding:12px;background:#18212d;margin:16px 0}@media(max-width:800px){.grid,.pair{grid-template-columns:1fr}main{padding:16px}table{font-size:12px}}</style><main>
<h1>LIMITLESS · Milestone A 第二阶段</h1><div class="status"><b>未通过。肩袖未重建，拇指对掌未修好。</b><br>可保留的局部成果：茈的双手间距与手腕轨迹调整、完整回归和真实渲染证据。正式角色、UI 和 VFX 未替换。</div>
<nav><a href="#metrics">实际数据</a><a href="#purple-132">茈对照</a><a href="#fist">握拳</a><a href="#topology">肩袖线框</a><a href="#shoulders">肩部多角度</a><a href="#rejected">拒绝的试作</a><a href="summary.json">原始摘要</a></nav>
<p>优先保留已验证的 A1 手部结构。两版拇指试作因为新增自交被拒绝；最终候选从 A1 重新生成，仅更改 CastPurple 的双侧 UpperArm、Forearm、Hand 六根骨骼动画。网格、权重、绑定骨、其他五个动画、手指曲线及锚点局部变换均逐项比对一致。</p>
<p>实际观察：双手有明确间隔和高低层次，但肩顶仍平切、弯臂袖山像硬块、侧举腋下有局部凹陷。手指仍缺少自然接触和握拳体积。镜头和算法通过均不能消除这些美术缺陷。</p>
<section id="metrics"><h2>完整动画检查</h2><table><tr><th>动画</th><th>接触采样</th><th>双手相交采样：基线 → 保守候选</th><th>右手最大自交三角对：基线 / 拒绝v2 / 保守候选</th><th>保守候选最大手部边长比</th></tr>${rows}</table>
<p>接触按30Hz采样，赫40–48帧增加四分之一帧；变形按60Hz，共1570个动画时间样本。自交数是三角形交叉对，不能当作独立缺陷数或穿透深度。袖口包覆手腕属于需区分的合法重叠，保留原始记录。检测尚不覆盖共面相交、完全包容、肩袖自身相交或采样间隙。</p>
<p>残余自交没有消失：茈左手最多 ${summary.contacts.spacing.CastPurple.max_left_self_crossing_pairs} 对三角交叉，主要为左拇指局部，交叉线段约0.21–0.40mm；赫右手仍最多3对。交叉线段长度不是穿透深度。</p>
<p>全局变形：${def.status}；多条件严重伸长样本 ${def.blocker_samples}；人工复核记录 ${def.review_samples}。旧头发12个近零面积面保留在历史缺陷中，属于B阶段；A不通过的独立原因是肩袖未重建和手部未达到验收标准。</p>
<p>真实双端核对：基线28姿势、拒绝v2试作28姿势、保守候选28姿势、保守候选生产GLB 15姿势。保守候选最大顶点误差 ${parity['browser-spacing'].max_error_mm.toFixed(4)} mm，生产GLB ${parity['browser-production'].max_error_mm.toFixed(4)} mm。仅证明已采样几何/锚点一致，不代表像素相同或美术合格。</p></section>
${sections}<section id="topology"><h2>旧肩袖线框与实际权重</h2><p>这是缺陷证据，不是重建成果。旧制服与鞋靴合并网格共有53,719面，其中38,638个三角面。肩部线框可见不规则三角化，缺少有组织的袖窿、腋下环线；当前没有锁骨或前臂扭转辅助骨。不得靠增加细分掩盖。</p>${topology}</section>
<section id="shoulders"><h2>肩部 8 个姿态 × 4 个视角</h2><p>自然下垂、前举45/90/120°、侧举45/90/120°、上臂旋转。当前骨架缺少锁骨协同，这些属于原结构的压力测试，不是合格人体运动示范。</p><div class="grid">${shoulders}</div></section>
<section id="rejected"><h2>保留的失败证据</h2><p>v2 虽减少部分拇指相交，但对掌没有形成自然接触；揭眼罩和茈新增单手自交。保守候选已撤回这些改动，不能把此处图片当作交付的手部修复。</p><div class="grid">${rejected}</div></section>
<section><h2>实际缺口与进入下一步的条件</h2><p>本地没有已验收制服肩袖资产。已查候选 catsuit 文件标AGPL3、仓库总说明标CC0，许可冲突，未引入。MakeHuman通用人体不是制服，未直接冒充替换。当前未能用可用操作交付合格肩袖重拓扑，需要一套许可明确且有袖窿/腋下环线的制服上身，或人工在Blender中完成肩线、袖窿与腋下重拓扑，然后接入锁骨/肩部辅助/前臂扭转并逐姿修权。拇指需要人工校准CMC对掌轴、鱼际过渡及接触弧线。</p><p>没有付费购买、外部发布或进入B/E阶段。源文件及测试命令见项目内 VALIDATION-A2.md。浏览器加载、原有交互回归和生产构建通过；尚未做1080p帧率测量。</p></section></main></html>`);
console.log(JSON.stringify({status:summary.status,contacts:summary.contacts.spacing,parity},null,2));
