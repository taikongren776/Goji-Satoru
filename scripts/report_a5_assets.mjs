// Summarize observed evidence; never creates an approval record or publishes a model.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const baseline='a13173c',out='output/milestone-a5';
await mkdir('docs/asset-candidates/evidence',{recursive:true});
const source=JSON.parse(await readFile(`${out}/snow-v2/inspection.json`,'utf8'));
const sources=JSON.parse(await readFile('output/playwright/milestone-a5/sources.json','utf8'));
const record=JSON.parse(await readFile('assets/licenses/blender-studio-snow/source.json','utf8'));
assert.equal(source.sha256,record.source_sha256);assert.equal(source.sourceUnchanged,true);assert.equal(source.views.length,20);
const paths=execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n');
assert.equal(execFileSync('git',['diff','--name-only',baseline,'--',...paths],{encoding:'utf8'}).trim(),'','Existing A4 files changed');
const binary=[];
for(const file of paths.filter(p=>/\.(blend|glb)$/.test(p))){
 const pointer=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'});
 const expected=pointer.match(/oid sha256:([a-f0-9]+)/)?.[1];assert.ok(expected,file);
 const actual=createHash('sha256').update(await readFile(file)).digest('hex');assert.equal(actual,expected,file);
 binary.push({file,sha256:actual});
}
const summary={date:'2026-10-16',baseline,status:'BLOCKED BY ART ASSET QUALITY',candidateCount:3,newModelsAcquired:0,newProductionAssets:0,
 frozen:{existingFileCount:paths.length,binaryAssetCount:binary.length,allUnchanged:true,binary},
 snow:{source:record.source,sha256:source.sha256,sourceUnchanged:source.sourceUnchanged,viewCount:source.views.length,bones:source.bones,deformBones:source.deformBones,segmentedBones:source.segmentedBones,
  meshes:source.meshes.filter(m=>['GEO-snow-body','GEO-snow-head','GEO-snow-shirt'].includes(m.name)),materialValidation:'NOT_PASSED: native skin UDIM loading warnings; neutral clay only'},
 vendorEvidence:{galleryImages:sources.filter(s=>s.name.startsWith('polyone-gallery-')&&s.status===200).length,failedRequests:sources.filter(s=>s.error).map(s=>({name:s.name,url:s.url,error:s.error}))},
 decisions:[{id:'01',name:'PolyOne Stylized Male',state:'HOLD_FOR_PREPURCHASE_EVIDENCE',purchased:false},{id:'02',name:'Reallusion CC3+ Male Base',state:'HOLD_FOR_EXPLICIT_RAW_GLB_PERMISSION',downloaded:false},{id:'03',name:'Blender Studio Snow v4.2',state:'AVAILABLE_FOR_PROFESSIONAL_MANUAL_ADAPTATION',artApproved:false}]};
await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2));
await writeFile('docs/asset-candidates/evidence/inspection-summary.json',JSON.stringify(summary,null,2));
await writeFile('docs/asset-candidates/evidence/web-sources.json',JSON.stringify(sources.map(({name,url,status,title,error})=>({name,url,status,title,error})),null,2));
const figure=(path,label)=>`<figure><a href="${path}"><img loading="lazy" src="${path}" alt="${label}"></a><figcaption>${label}</figcaption></figure>`;
const snow=source.views.map(v=>figure(`snow-v2/${v.name}.png`,v.name)).join('');
const vendor=[1,6,7,8,9,10,12].map(n=>figure(`../playwright/milestone-a5/polyone-gallery-${n}.png`,`PolyOne 官网图 ${n} · 非本地模型实测`)).join('');
for(const v of source.views)await access(`${out}/snow-v2/${v.name}.png`);
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIMITLESS A5 资产筛选证据</title>
<style>body{max-width:1280px;margin:32px auto;padding:0 24px;font:16px/1.75 system-ui,sans-serif;background:#191d23;color:#e8edf4}a{color:#9bd1ff}h1{font-size:30px}h2{margin-top:40px}.status{background:#342b21;border-left:4px solid #f3b569;padding:16px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}figure{margin:0;background:#262c34}img{display:block;width:100%}figcaption{padding:10px;font-size:14px}table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #49505b}small{color:#b1bccb}</style>
<h1>LIMITLESS · Milestone A5</h1><div class="status"><strong>Milestone A — BLOCKED BY ART ASSET QUALITY</strong><br>最多3个候选。0项购买，0个新模型引入，0个最终资产批准。</div>
<p>2026-10-16 · <a href="../../docs/asset-candidates/README.md">完整筛选记录</a> · <a href="summary.json">实检与冻结数据</a></p>
<table><tr><th>候选</th><th>决定</th><th>主要缺口</th></tr><tr><td><a href="../../docs/asset-candidates/candidate-01.md">PolyOne Stylized Male</a></td><td>待售前证据</td><td>未购买；缺侧脸、手部和抬臂实测</td></tr><tr><td><a href="../../docs/asset-candidates/candidate-02.md">Reallusion CC3+ Male</a></td><td>分发授权未核清</td><td>公开可提取GLB不能仅用“商用许可”推断</td></tr><tr><td><a href="../../docs/asset-candidates/candidate-03.md">Blender Studio Snow</a></td><td>保留人工改造备选</td><td>需成年日漫造型、制服与实时绑定转换</td></tr></table>
<h2>Snow：本机原始资产真实 Blender 渲染</h2><p>20张图，无VFX，无角色几何/权重修改。保留源绑定与修正；灰模覆盖不代表材质通过。源文件SHA-256不变。最终各视角使用固定灯光（含掌面补光）；线框副本去除Mask/细分以显示控制网格。第一轮欠曝/遮罩证据仍保留。可见原面部有体积与边流，但风格、服装及手势尚未达到项目目标。</p><section>${snow}</section>
<h2>PolyOne：卖家大图证据，不是我们的模型测试</h2><p>购买前只能核对这些图与许可。下图有面部、张手远景、骨架、线框和UV，但不足以批准握拳或抬臂质量。价格低和“全四边形”不构成推荐购买的充分理由。</p><section>${vendor}</section>
<h2>CC3+：厂商能力展示，不等于免费男性包实测</h2><p>手部材质/不同人物姿势演示不能替代目标文件验证；未经明确原生GLB分发授权，本轮不获取模型。</p><section>${figure('../playwright/milestone-a5/cc-hands.png','官方手部示例 · 非免费男性文件验收')}${figure('../playwright/milestone-a5/cc-poses.png','官方姿势与拓扑示例 · 非受控本地测试')}</section>
<p><small>保护检查：${paths.length}个既有文件未修改；${binary.length}个LFS二进制逐项哈希一致。没有修改正式模型、UI、技能VFX或Adapter。所有旧失败记录保留。基础资产仍需专业人工制作与真实逐姿验收。</small></p></html>`;
await writeFile(`${out}/report.html`,html);console.log(JSON.stringify({status:'EVIDENCE_READY_NOT_ART_APPROVED',snowRenders:source.views.length,existingFilesUnchanged:paths.length,binaryAssetsUnchanged:binary.length,polyoneGalleryImages:summary.vendorEvidence.galleryImages},null,2));
