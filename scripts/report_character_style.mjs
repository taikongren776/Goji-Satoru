import {writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const out='output/playwright/character-style';
const validation=JSON.parse(await readFile(`${out}/data-validation.json`,'utf8'));
const views=[['front','正面全身'],['45','45° 全身'],['side','左侧全身'],['hand','左手斜侧'],['hand-back','左手反面'],['right-hand','右手斜侧']];
const row=(view,title,assets=['legacy','styled'])=>`<section><h2>${title}</h2><div class="pair">${assets.map(id=>`<figure><figcaption>${{legacy:'原正式粗模',source:'CC0 基础资产',styled:'本次白发候选'}[id]}</figcaption><img src="${id}/${view}.png" alt="${id} ${title}"></figure>`).join('')}</div></section>`;
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>人物外观修改 · 真实渲染对比</title><style>body{margin:0;padding:26px;background:#121922;color:#e8edf6;font:15px/1.7 system-ui,sans-serif;max-width:1120px;margin:auto}h1{font-size:26px;margin:0}h2{font-size:18px;margin:12px 0}p{color:#b5c3d6}a{color:#a9d5ff}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}figcaption{padding:8px 12px;background:#263343}img{display:block;width:100%}section{margin:22px 0}.note{padding:16px;background:#252f3c;border-left:3px solid #92b9e6}code{overflow-wrap:anywhere}@media(max-width:650px){body{padding:12px}}</style>
<h1>人物外观修改 · 真实渲染对比</h1><p>采用现有 CC0 VRoid 网格；修改脸部比例、发束位置、身材及配色。以下均为实际 Three.js 截图；没有 AI 替代渲染、辉光或技能特效。</p>
<p><a href="/character-study.html">打开可旋转的三方对比页</a> · <a href="verification.json">浏览器测量</a> · <a href="data-validation.json">资产一致性</a> · <a href="blender-import.json">Blender 保存与重开</a></p>
<div id="face-comparison">${row('face','面部：旧粗模 → 新候选')}</div>
<div class="note">已改善：眼睑、鼻口和下颌具有连续动漫角色结构；头发由已有分束网格构成；身体和肩袖连接比旧几何拼接自然。<br>未完成：脸仍偏少年，眼神偏平；发型尚非五条悟的上扬蓬松轮廓；服装仍是连帽衫；没有眼罩与六段动作接入。此次不宣称正式角色完成或整体美术验收通过。</div>
${views.map(([v,t])=>row(v,t)).join('')}
${row('face','基础资产 → 本次编辑（同一 MToon 渲染）',['source','styled'])}
${row('front','基础资产 → 本次编辑（实际身材与配色）',['source','styled'])}
<h2>绑定检查</h2><p>两份 VRM 使用同一组测试姿势。源手部拓扑与权重没有修改，不能把源资产的优点称为本次手部重建成果。握拳拇指未充分包覆、指节仍较硬；抬臂腋下有拉扯。没有做全姿态自交检测，也未完成技能动画验收。</p>
${['side90','side120','forward90','half','fist','fist-right','blink'].map(v=>row(v,{side90:'侧举 90°',side120:'侧举 120°',forward90:'前举 90°',half:'半握拳',fist:'握拳 · 左手','fist-right':'握拳 · 右手',blink:'闭眼'}[v],['source','styled'])).join('')}
<p>数据检查：${validation.vertices.toLocaleString()} 个源属性顶点，${validation.triangles.toLocaleString()} 个三角形；拓扑 / UV / 权重与源文件相同。正式模型、体验逻辑和 VFX 哈希保持不变。数值一致性通过不等于美术通过。</p>
<p>VRM 已保存，Blender 工程已实际重新打开。Blender 使用 glTF 回退材质，未声称与浏览器 MToon 外观完全一致。</p></html>`;
await writeFile(`${out}/report.html`,html);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:1120,height:1000},deviceScaleFactor:1});await page.goto(`http://127.0.0.1:5173/${out}/report.html`);await page.waitForFunction(()=>[...document.images].every(im=>im.complete&&im.naturalWidth>0));await page.locator('#face-comparison').screenshot({path:`${out}/face-comparison.png`});console.log(`Report: ${await page.locator('img').count()} actual render images loaded.`);}finally{await browser.close();}
