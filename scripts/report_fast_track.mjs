import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root='output/playwright/fast-track';
const read=async f=>JSON.parse(await readFile(`${root}/${f}`,'utf8'));
const before=await read('before/capture.json'),after=await read('after/capture.json'),tests=await read('regression/results.json');
if(!tests.some(x=>x.touch==='PASS')||!tests.some(x=>x.retry==='PASS'))throw new Error('Regression is not complete');
const image=(src,alt)=>`<a href="${src}" target="_blank"><img src="${src}" alt="${alt}" loading="lazy"></a>`;
const labels={idle:'待机：角色未更换',blue:'苍 · 2.05 s',red:'赫 · 1.58 s','purple-fusion':'茈 · 融合 3.95 s','purple-release':'茈 · 释放 4.95 s'};
const pairs=Object.entries(labels).map(([key,label])=>`<section><h2>${label}</h2><div class="compare"><img src="before/${key}.png" alt="旧版"><img class="after" src="after/${key}.png" alt="新版"><span class="old-label">旧 VFX</span><span class="new-label">新 VFX</span><i></i></div><label>拖动比较 <input aria-label="${label}前后对比" type="range" min="0" max="100" value="50"></label></section>`).join('');
const fps=tests.filter(x=>x.cycle===1).map(x=>({skill:x.id,observedFPS:x.during.fps,geometriesAfter:x.after.geometries,texturesAfter:x.after.textures}));
await writeFile(`${root}/report.html`,`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>LIMITLESS · FAST TRACK 实测对照</title><style>
*{box-sizing:border-box}body{margin:0;background:#0b1018;color:#d5e1f0;font:15px/1.8 system-ui,'Microsoft YaHei',sans-serif}main{max-width:1500px;margin:auto;padding:40px 28px}h1{font-size:32px;letter-spacing:2px}h2{font-size:20px;margin:36px 0 12px}p{max-width:1100px;color:#9eafc6}a{color:#a6bfff}section{margin:28px 0 50px}.compare{position:relative;--cut:50%;aspect-ratio:16/9;border:1px solid #35435c;overflow:hidden}.compare img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.after{clip-path:inset(0 0 0 var(--cut))}.compare i{position:absolute;left:var(--cut);top:0;bottom:0;width:2px;background:#c1cfe7}.old-label,.new-label{position:absolute;top:12px;padding:4px 12px;background:#101726dc;border:1px solid #526780}.old-label{left:12px}.new-label{right:12px}label{display:flex;align-items:center;gap:20px;padding-top:12px;color:#91a5c2}input{flex:1;accent-color:#a99bfa}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.grid img{width:100%;display:block}.notice{border-left:3px solid #e9ac66;padding:12px 22px;background:#1b202b}pre{white-space:pre-wrap;background:#141d29;padding:20px;font-size:13px}@media(max-width:700px){main{padding:20px 12px}.grid{grid-template-columns:repeat(2,1fr)}}</style><main>
<h1>LIMITLESS / FAST TRACK</h1><p>2026-10-17 · 同一正式模型、同一摄影机与技能时刻的真实 Edge / Three.js 截图。无 AI 图像。拖动分隔线查看新旧差异，图片可在下方原始证据目录中查看。</p>
<p class="notice">选择 fallback C：旧角色继续作临时资产；本轮没有获得达到6/10目标的已批准新角色。Snow路线已停止。下列变化证明VFX改进，不证明角色造型合格。</p>
${pairs}
<h2>一次免费候选实测：HairSample_Male / VRM 0 / MToon</h2><p>官方CC0条目与文件内许可一致。完整humanoid骨架，0条动画；默认青年卫衣风格，不符合目标成年白发高领角色。未替换、未伪造六动作或眼罩。单次查看涵盖正/侧/45°、脸、双面手部、90°/120°肩部姿势，不是完整施法动画验收。</p><div class="grid">${['front','45','side','face','hand','hand-back','shoulder90','shoulder120'].map(x=>image(`candidate/${x}.png`,x)).join('')}</div>
<h2>运行与复位</h2><p>三技能各完整播放两次、互斥、逐一取消、镜头复位、眼罩切换、低画质/减少动态、窄屏、真实触屏按钮与加载失败重试通过。页面/着色器未记录错误。低画质粒子预算90，高画质270；减少动态关闭画面扭曲和震屏。原6动作与时间轴不变。</p>
<p>下列FPS来自1920×1080 Edge无头浏览器第二轮播放快照；不是逐帧最低值，不等于所有设备或前台窗口性能保证。初次加载的shader编译卡顿不包含在这些暖机样本中。</p><pre>${JSON.stringify(fps,null,2)}</pre>
<div class="grid">${image('regression/low-reduced.png','低画质减少动态')}${image('regression/mobile.png','390×844')}</div>
<p><a href="before/capture.json">旧版采样记录</a> · <a href="after/capture.json">新版采样记录</a> · <a href="regression/results.json">完整回归数据</a> · <a href="candidate/inspection.json">VRM骨架与许可</a> · <a href="/">打开当前网页</a></p></main>
<script>document.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>input.closest('section').querySelector('.compare').style.setProperty('--cut',input.value+'%')));</script></html>`);
console.log(JSON.stringify({report:`${root}/report.html`,before:before.length,after:after.length,warmFPS:fps},null,2));
