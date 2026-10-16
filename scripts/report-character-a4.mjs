import {readFile,writeFile,access} from 'node:fs/promises';
const names=['Idle','CastBlue','CastRed','CastPurple','RevealEyes','CoverEyes'];
const adapter=JSON.parse(await readFile('output/playwright/milestone-a4/adapter-results.json','utf8'));
const validator=JSON.parse(await readFile('output/milestone-a4/validator-tests.json','utf8'));
const production=JSON.parse(await readFile('output/milestone-a4/production-build-smoke.json','utf8'));
const frozen=JSON.parse(await readFile('output/milestone-a4/freeze-verification.json','utf8'));
for(const name of names)await access(`output/playwright/milestone-a4/${name}.png`);
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIMITLESS A4 接入验证</title>
<style>body{margin:32px auto;padding:0 24px;max-width:1200px;background:#161b23;color:#e7ebf1;font:16px/1.7 system-ui,sans-serif}h1{font-size:30px}a{color:#91caff}.status{border-left:4px solid #ffbc70;padding:14px 20px;background:#29231e}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}figure{margin:0;background:#20252c}img{width:100%;display:block}figcaption{padding:12px}small{color:#aeb9c9}li{margin:8px 0}</style>
<h1>LIMITLESS · Milestone A4</h1><p class="status"><strong>Milestone A — BLOCKED BY ART ASSET QUALITY</strong><br>本轮完成资产接入工程准备。未制作专业制服，未进入 B–E。</p>
<p>2026-10-16 · 美术冻结基线 f006c13 · 以下为真实 Edge / Three.js 截图。测试 GLB 只修改名称元数据，几何、权重及动画二进制不变。彩色圆点为挂点调试标记。没有 AI 图片，没有新美术验收通过结论。</p>
<ul><li>改名资产接入：${adapter.status}；${adapter.samples} 个采样，挂点最大误差 ${adapter.maxSocketErrorMeters} m。</li><li>Blender 导入正反例：${validator.status}，${validator.rows.length} 项符合预期；粗模的严格生产检查仍 FAIL。</li><li>生产构建门禁：${production.status}；开发参数忽略、测试入口拒绝、重试恢复。</li><li>冻结检查：${frozen.status}；${frozen.frozenPaths.length} 个旧文件、${frozen.assets.length} 个 LFS 资产。</li></ul>
<p>肩部平切、袖子块状、发束生硬仍可见。本页证明加载、动画映射和节点接入；不证明模型好看，也不是完整逐姿美术验收。</p>
<section>${names.map(n=>`<figure><a href="../playwright/milestone-a4/${n}.png"><img src="../playwright/milestone-a4/${n}.png" alt="${n} 实际模型截图"></a><figcaption>${n} · 动画中点</figcaption></figure>`).join('')}</section>
<h2>交付与证据</h2><ul><li><a href="../../VALIDATION-A4.md">完整交付记录</a> · <a href="../../docs/character-art-spec.md">美术交付规格</a> · <a href="../../docs/character-integration.md">接入说明</a></li><li><a href="../playwright/milestone-a4/adapter-results.json">浏览器采样与交互结果</a> · <a href="validator-tests.json">Blender 验证正反例</a> · <a href="production-build-smoke.json">生产构建门禁</a> · <a href="freeze-verification.json">冻结核对</a></li></ul><p><small>解除阻塞需要专业人工网格制作、肩袖拓扑及逐姿修形，并通过真实视觉评分。自动检查不能替代人工美术验收。</small></p></html>`;
await writeFile('output/milestone-a4/report.html',html);console.log('Wrote output/milestone-a4/report.html; all six screenshot files exist.');
