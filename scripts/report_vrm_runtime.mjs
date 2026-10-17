import {readFile,writeFile} from 'node:fs/promises';
const out='output/playwright/vrm-integration';
const read=async n=>JSON.parse(await readFile(`${out}/${n}.json`,'utf8'));
const [contract,deformation,blend]=await Promise.all([read('contract'),read('deformation'),read('blender-import')]);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const figures=[['covered-face','眼罩正面'],['covered-side','眼罩侧面'],['uncovered-face','揭眼外观'],['blue','苍：无特效姿势'],['red-release','赫：无特效姿势'],['red-hand','赫：指缝近景'],['purple-fuse','茈：融合姿势'],['purple-release','茈：释放姿势'],['reveal-contact','揭眼过渡'],['cover-contact','戴眼罩过渡']];
figures.splice(2,0,['covered-45','眼罩 45°：弧形前缘与收窄绑带'],['covered-left','眼罩另一侧'],['reveal-side','摘戴侧面']);
figures.unshift(['idle-uncovered','放松站姿正面'],['idle-45','放松站姿 45°'],['idle-side','屈膝与脚底侧面'],['red-full','赫的完整站姿']);
await writeFile(`${out}/report.html`,`<!doctype html><meta charset="utf-8"><title>LIMITLESS 动画接入验收</title><style>body{background:#151a22;color:#e8edf5;font:16px/1.65 system-ui;max-width:1280px;margin:40px auto;padding:24px}a{color:#a8daff}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}figure{margin:0}img{width:100%}td,th{padding:10px;border-bottom:1px solid #465064;text-align:left}code{overflow-wrap:anywhere}h2{margin-top:40px}</style>
<h1>已认可外观 → 可操作动画候选</h1>
<p>实际 Three.js / Edge 截图。原正式资产与 UI / VFX 保持不变。没有自动美术 PASS 或最终角色完成的结论。</p>
<p><a href="/?character=/models/character-production/whitehair-preview.json">进入可操作候选（开发服务器）</a> · <a href="/character-study.html">外观对比</a></p>
<p>Idle / 苍 / 赫 / 茈 / 揭眼 / 戴眼罩均接入同一动画时钟。眼罩跨越眼窝并预留抬升空间，取代会穿眼的逐点皮肤投射。摘戴仍是抬升＋淡出效果，不是模拟布料解结。</p>
<h2>页面实际效果</h2><div class="grid">${['idle','blue','red','purple-fusion','purple-release'].map(n=>`<figure><img src="../fast-track/vrm-integration/${n}.png"><figcaption>${n}</figcaption></figure>`).join('')}</div>
<h2>中性场景近景与动作</h2><div class="grid">${figures.map(([n,label])=>`<figure><img src="${n}.png"><figcaption>${label}</figcaption></figure>`).join('')}</div>
<h2>完整动画采样</h2><p>30 FPS，手/肩关联边，相对绑定姿势；仅统计长度大于 1 mm 的边。该测量不能证明无自交，也不是美术评分。</p><table><tr><th>动画</th><th>采样帧数</th><th>最大长度倍率</th><th>超过 3 倍的边×帧事件</th></tr>${deformation.results.map(r=>`<tr><td>${r.name}</td><td>${r.frames}</td><td>${r.maxRatio.toFixed(4)}</td><td>${r.edgeFrameEventsOver3}</td></tr>`).join('')}</table>
<p>非有限顶点：${deformation.nonFinite}。浏览器脚本错误：${deformation.errors.length}。赫仍有 84 个边×帧警告：中指/无名指指缝 3314↔3316，1.49 mm → 4.51 mm，最大 3.03 倍。近景未见旧式爆裂，但局部拉伸未消除，未做全网格碰撞保证。</p>
<h2>工程与验证</h2><p>原外观二进制数据、材质和蒙皮保持一致。Blender 文件已重新打开：${blend.reopened}；${Object.values(blend.rigs).join(', ')} 根骨骼、六段动作、${blend.packed_images} 张打包图像。Blender 使用 glTF 回退材质，不宣称 MToon 一致。</p>
${deformation.stance?`<p>放松站姿：双脚间距约 27.5 cm，右脚前移 7.5 cm，重心偏向左腿。所有动作共用该下肢姿势，脚踝最大漂移 ${deformation.stance.maxAnkleDrift.toExponential(2)} m，最低脚部顶点 ${ (deformation.stance.minFootVertexY*1000).toFixed(2)} mm。下肢检查保留警告：裤裆顶点 6886↔6892 的 2.09 mm 短边最大伸长 ${deformation.stance.maxLegEdgeRatio.toFixed(2)} 倍（约 9.85 mm）；未修改原有蒙皮，不宣称全身变形通过。</p>`:''}
<p>14/14 单元测试、类型检查、生产构建及生产门禁回归通过；保留 Three.js 大包提示。交互回归覆盖连续施法、中止、互斥、镜头/特效复位、揭眼、低画质、减少动态、触屏和加载重试。完整结果见 <a href="regression/results.json">交互 JSON</a>。</p>
<p>候选 SHA-256：<code>${esc(contract.runtimeSha256)}</code>。</p>
<p>当前为开发预览；active.json 与正式 gojo 资源未切换。正式发布仍需现有逐项美术验收记录，未伪造人工评分。角色保留已接受的少年感、连帽衫和非原作发型；袖肘及握拳仍有美术改进空间。</p>`);
console.log(`${out}/report.html`);
