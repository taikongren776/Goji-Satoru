# 已认可外观的动画接入候选

2026-10-17。基于用户认可的 `6e3b824` 外观候选，完成六段动作、眼罩、三个特效挂点与既有 Character Adapter 的接入。没有继续生成或修改人物核心网格。没有修改正式模型、UI、experience.ts、effects.ts、audio.ts 或 active.json。

## 打开

双击 `start-character-preview.cmd`。已有开发服务器时打开：

http://127.0.0.1:5173/?character=/models/character-production/whitehair-preview.json

按 1 / 2 / 3 施放苍 / 赫 / 茈，Esc 中止；揭开眼罩按钮播放摘戴动作。原 `start.cmd` / 生产构建仍显示旧正式资产；这个候选不会绕过现有发布验收门禁。

## 实际交付

- `public/models/candidates/limitless-runtime.vrm`：原生 MToon、91 根骨骼、六段原骨骼烘焙动作、眼罩和挂点。VRM 使用二进制 glTF 容器；未另行提供声称材质等价的普通 GLB。
- `blender/candidates/limitless-runtime.blend`：已保存并重新打开，六段 Actions / NLA tracks，14 张打包图像。默认 glTF 导入材质与网页 MToon 不等价；眼罩淡出抬升由网页适配器控制。
- `public/models/character-production/whitehair-preview.json`：仅开发预览配置。
- `output/playwright/vrm-integration/report.html`：真实截图与数值记录。输出目录按既有规则不进入 Git，可重跑生成。
- `public/models/candidates/limitless-runtime.LICENSE.md`：CC0 来源和新增部分记录。

## 已验证与保留问题

原网格、权重、UV、纹理、形态键二进制数据及原材质保持一致。Idle 4s、CastBlue 5s、CastRed 4s、CastPurple 8s、RevealEyes / CoverEyes 各 2.4s。预烘焙动画使用同一运行时时间轴，不运行实时 IK 或第二套 VRM 骨骼更新。

修正抬手的肘部弯曲平面，避免最初版本的袖肘过量扭转。眼罩从会陷入眼窝的皮肤逐点投射，改为跨眼窝且覆盖抬升轨迹的外轮廓。正面、侧面与摘戴近景已实际检查；眼睛不再穿出黑带，额头未见此前锯齿破洞。仍是简单眼带＋抬升淡出，不是布料摘戴模拟。

30 FPS 完整动作采样共 780 帧，手/肩关联边（绑定长度 > 1 mm）无非有限顶点。最大边长倍率：Idle 1.671、苍 2.317、赫 3.030、茈 2.628、揭眼 2.629、戴眼罩 2.628。**赫仍有 84 个超过 3 倍的边×帧事件**：中指/无名指指缝顶点 3314↔3316，最坏帧 34，1.49 mm → 4.51 mm。这是相邻手指不同弯曲引起的局部拉伸，不能描述为完全修复，也未做全身碰撞保证。

14/14 单元测试、类型检查与生产构建通过；生产构建拒绝 integration-test 且忽略开发 query 的回归通过。保留 Three.js 大包提示。真实浏览器交互回归通过三技能各两次播放、输入互斥、中止、资源计数稳定、镜头与特效复位、摘戴、低画质、减少动态、窗口变化、触屏、加载失败重试。眼罩最后调整后重跑真实截图与全动作变形采样。

1080p 无头 Edge 最后一次技能截图的瞬时读数约 219–240 FPS；这不是前台持续帧率或最低帧率保证。首次加载截图读数不作为稳定帧率。

用户接受的是现有外观方向；未把它写成专业角色美术逐项高分验收。少年感、连帽衫、非原作发型、袖肘与握拳体积限制仍在。当前交付是可玩动画候选，不宣称最终角色完成。

## 复现

### 眼罩外形调整（同日追加）

根据用户反馈，将原先等宽、横向突出的眼罩改为正面包覆、两侧收窄的弧形布带。头部轮廓采样避开耳朵的宽度，绑带向耳上方绕行；降低离肤间距，增加浅弧截面，并把纯黑观感调为低反光炭黑。未改动脸部、头发、动画数据、UI 或 VFX。

实际检查了正面、左右侧面、45°、摘戴正侧面及三技能网页截图；完整 780 帧变形结果与上一版相同，原指缝警告保留。资产契约验证通过，Blender 已重新保存和打开。新截图在 `output/playwright/vrm-integration/`；调整前正侧面对照保留在 `output/playwright/blindfold-refit/before/`。近景仍可看到简化布带结构，未宣称真实布料模拟。

### 动画宽幅眼罩调整（同日追加）

用户进一步要求接近动画中的眼罩：将正面设计宽度从约 64 mm 提升到约 110 mm，同时重新定位上下缘，让布带覆盖眉眼；侧后方保留宽幅包裹并绕到耳上方。新增两道浅斜向张力褶皱，采用更深的哑光黑材质。鼻梁下缘单独留空，避免宽幅布带穿入鼻梁。保留现有发型，不把这次配件调整描述为完整原作造型复刻。

实际正面、左右侧面、45°、摘戴近景和 780 帧骨骼采样已重新检查；原指缝警告未变化。修改前截图保存在 `output/playwright/blindfold-anime/before/`。可编辑 Blender 候选同步更新。

### 放松站姿调整（同日追加）

改为左侧承重、右腿微屈的非对称站姿：双脚横向相距约 27.5 cm，右脚向前约 7.5 cm，脚尖轻微外转；骨盆右左高度和上身倾斜作小幅配合。下肢 IK 在导出前烘焙，六段动作共用相同脚部位置，收招回到放松站姿。核心人物网格、权重、眼罩和动画时长未变。

新增正面揭眼、45°、侧面、完整施法截图。780 帧采样脚踝最大漂移约 1.72e-16 m，最低脚部顶点约 0.416 mm；未观察到脚底滑动。手肩指标随姿势略有变化，最终数值见 `deformation.json`，赫原有 84 个指缝警告仍保留。新增下肢诊断发现裤裆短边 6886↔6892（原长 2.09 mm）最大伸长约 4.714 倍至 9.85 mm，与原网格的髋部/左右大腿权重过渡有关。全身截图未见爆裂，但不据此声称下肢蒙皮无缺陷。候选文件与 Blender 动作均已同步更新。

先运行 `npm run dev`，再在另一个 PowerShell 执行：

```powershell
node scripts/prepare_vrm_runtime.mjs
node scripts/validate_vrm_runtime.mjs
node scripts/audit_vrm_runtime.mjs
node scripts/capture_fast_track.mjs --label vrm-integration --url 'http://127.0.0.1:5173/?character=/models/character-production/whitehair-preview.json'
& 'C:/Users/48749/AppData/Local/Programs/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/import_runtime_vrm.py
$env:LIMITLESS_TEST_URL='http://127.0.0.1:5173/?character=/models/character-production/whitehair-preview.json'
$env:LIMITLESS_TEST_OUTPUT='output/playwright/vrm-integration/regression'
$env:LIMITLESS_TEST_ASSET_ROUTE='**/models/candidates/limitless-runtime.vrm'
node scripts/test_fast_track.mjs
npm test
npm run build
node scripts/test-character-production-build.mjs
node scripts/report_vrm_runtime.mjs
```
