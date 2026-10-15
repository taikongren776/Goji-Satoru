# Milestone A 实际执行记录 — 2026-10-14

后续第二阶段记录见 [VALIDATION-A2.md](VALIDATION-A2.md)。第二阶段仍未通过；本文件保留A1原始结果，不将后续局部动画改善回填为A1已完成的结构重建。

**结论：未通过。** 本轮交付了受保护的资产流程、可重复诊断、真实双端截图，以及使用许可基础网格制作的手部替换候选。没有完成可验收的肩袖重建，也没有达到最终手部美术质量。正式网页仍加载旧版角色。

## 已完成并验证

- 修改前备份了 25 个资产/源码文件，逐文件 SHA-256 一致；实际打开备份 `.blend`，读取备份 GLB 并确认六个动画。
- 备份路径：`output/backups/pre-milestone-a-20261014-132832/`，含 `manifest.json`。
- Git 基线：`3e6e5ab`；工作分支：`character-rebuild`。Git LFS 3.7.1 已启用，`.blend/.glb/.fbx/.obj` 使用 LFS。没有远程推送；本地 LFS 存储不等于异地备份。
- 正式 `.blend` SHA-256：`29d8bceac5c59fd3d28f08c2ec1d5c81076b40e1134abfa6d13b3c70fce2d65e`。
- 正式 `.glb` SHA-256：`79c057bb6592722466cd794a6247cdf4e3c4f1d2fb48738412584512f4a33d7e`。两者在实施后仍一致，未替换。
- 停用 `build_character.py` 的完整几何生成逻辑，入口现在只读取已制作资产并导出候选。旧代码保存在 Git 基线与备份中。

## 资产路线验证与实际修改

项目中原先只有旧角色及其历史版本，没有独立优质基础网格。Blender 5.2.1 可以读取和编辑连续网格，但这一能力不等同于自动生成高质量角色。

采用 MakeHuman 官方 `hm08` 基础网格、默认骨架与对应权重，固定版本为 `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`。官方许可明确覆盖基础网格、骨架和图形资产，采用 CC0，允许修改与分发。未使用未知来源的社区模型，未购买资产。原始资产与程序源码的许可证分别处理，本项目只导入图形数据。

- [官方固定版本许可](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md)
- 本地许可全文和哈希记录：`assets/licenses/makehuman/`。
- 原始数据缓存：`assets/vendor/makehuman/`，未重复提交进 Git；`scripts/fetch_reference_assets.ps1` 可按固定版本下载并校验 SHA-256。
- 参考工程 `blender/candidates/makehuman-reference.blend`：13,380 顶点、13,378 个四边形、163 骨骼。它是人体变形参考，不是五条悟，也不是合格制服。
- 手部候选 `blender/candidates/gojo-hand-fit.blend`：每只手 1,665 顶点、1,653 个四边形；没有体素重建、减面或四近邻跨指传权。
- 对应 GLB：`public/models/candidates/gojo-hand-fit.glb`；111,244 三角形、56 骨骼、六个原动画。全身面数变化不作为质量评分依据。
- 将作者制作的手部边流、UV 和权重按解剖标记适配到原手腕；增加左右 `Thumb0` 和各四根掌骨，共增加 10 骨。
- 长指局部屈曲轴适配现有正 X 旋转约定；腕部按前臂与掌根标记重建连续蒙皮过渡，保留手指分区。
- 手腕切口位于旧袖口内；每手 22 条合法开放边已记录，不能据此宣称已经完成最终袖口接合。

候选仍沿用旧头部、肩部和服装作为比较支架。许可基础网格的存在已经得到验证，但新的高质量制服肩袖资产尚不存在。

## 根因：拓扑、权重、骨架和动画分别处理

1. **拓扑已证实有问题。** 旧手的指间连接不仅存在于掌根。对右手进行高度切片后，`z < 0.954 m` 的连通分量仍包含中指与无名指的强权重区域，位置已超过相应 PIP 关节。最终诊断器按关节方向而非固定世界高度复核，旧左右手各发现一个远端跨指连通分量，候选为零。
2. **权重已证实有问题。** 旧手的异常边端点跨指混权、相邻顶点影响突变；但权重总和本身正常。单纯归一化不能修复。
3. **骨架适配影响变形。** 初次移植后手指屈曲方向与旧动画不兼容，已校准长指骨轴；供体与目标腕部长度不同，又造成茈中的腕部拉伸，已单独重绑腕部。拇指对掌尚未完成，新增 CMC 骨的存在不等于动作合格。
4. **动画仍需返工。** 茈的双手接触存在明显重叠，握拳体积与指节轮廓不自然。没有改动某一个关键帧或遮住问题来通过测试。保留动作名称和时长，但尚未完成针对新手结构的美术重定向。
5. **导出不是旧尖刺的唯一来源。** 原 `.blend` 和原正式 GLB 在相同采样姿势下均重现问题。双端顶点、绑定矩阵与锚点比较通过；这只覆盖实际采样姿势，不证明所有插值、混合和渲染细节都无问题。

## 自动检查的真实结果

完整采样 `CastBlue` 301 个时间点、`CastRed` 257 个时间点、`CastPurple` 481 个时间点；常规 60 Hz，赫的第 40–48 帧额外按四分之一帧采样。

| 完整动作区间，左右手最大值 | 旧模型最大边长比 | 手部候选最大边长比 |
|---|---:|---:|
| 苍 | 2.534 | 1.314 |
| 赫 | 15.499 | 1.789 |
| 茈 | 15.499 | 1.896 |

候选全区间双手没有超过三倍的边长拉伸；旧模型赫第 44 帧右手原有 241 条这样的边。多条件确认的严重拉伸“网格×采样时间”记录从 1,067 降到 0。该数量不是独立坏帧数，也不是视觉评分。

**诊断报告仍为 FAIL。** 候选保留的旧头发有 12 个面积小于 `1e-12 m²` 的面；另外存在 662 条需要人工复核的采样记录，主要涉及局部面积塌陷。这些记录不能当作 662 个独立已确认穿模。肩部高抬姿势检出局部面积塌陷，实际图像也能观察到腋下硬折和块状挤压。

工具同时记录非有限数据、权重异常、连通分量、关节矩阵、关键帧插值、边长/面积变化与局部变形不连续。跨指计数保留正常指蹼的可能性；自相交与碰撞未被全面自动求解，必须人工看图。

Blender/Three.js：旧版和候选各 15 个诊断姿势截图，另分别核对原正式 GLB 与候选生产动画 GLB 的 6 个采样姿势。候选 15 个姿势最大全模型位置误差约 0.0503 mm；六个生产动画样本约 0.0433 mm，均低于 0.5 mm 阈值。没有未匹配的导出顶点。绑定矩阵最大残差约 `7.03e-7`；已采样锚点误差小于 0.001 mm。

全部截图来自 Blender Cycles 或真实 Edge/Three.js。两个渲染器的灯光模型不同，不作像素一致性断言。没有 AI 生成图片。

## 新增与修改文件

| 文件 | 职责/状态 |
|---|---|
| `scripts/character_common.py` | 统一测试姿势、相机定位、素材读取辅助 |
| `scripts/audit_deformation.py` | 完整区间数值检查、基线比较、异常定位及证据渲染 |
| `scripts/render_character_audit.py` | 实际 Cycles 渲染、线框/异常边标记、QA 动画导出与顶点基准 |
| `scripts/capture_character_audit.mjs` | 真实 Edge 截图和蒙皮/锚点数值对照 |
| `src/character-audit.ts`、`character-audit.html` | 独立开发验收页，不由正式应用入口导入 |
| `scripts/import_reference_asset.py` | 导入官方作者制作网格、骨架与权重，不生成基础人体 |
| `scripts/fit_reference_hands.py` | 在隔离候选内拟合手部和绑定；不是最终美术制作器 |
| `scripts/fetch_reference_assets.ps1` | 固定版本下载和哈希校验 |
| `scripts/export_character.py`、`scripts/build_character.py` | 只读源工程、校验公开接口、限制到候选路径导出 |
| `scripts/validate-model.mjs` | 接受候选路径、取消固定 46 骨限制，保留接口检查 |
| `scripts/smoke_character_integration.mjs` | 正式/候选资产的实际浏览器交互回归 |
| `scripts/summarize_character_audit.mjs` | 生成可复查 JSON 摘要和图片比较页 |
| `.gitattributes`、`.gitignore` | LFS、备份/缓存排除 |
| `package.json`、`package-lock.json` | 新增 Playwright 开发依赖 |
| `README.md`、本文件 | 修正旧规格与制作路线，记录实际状态 |

`src/main.ts`、`src/style.css`、`src/experience.ts`、`src/effects.ts`、`src/timeline.ts` 和 `src/audio.ts` 没有修改。类型检查、既有 7 项单测、生产构建和两份 GLB 接口检查已实际通过。构建仍提示 Three.js chunk 超过 500 kB；本轮未做性能达标声明。

真实浏览器交互回归最终通过：正式模型与候选模型分别验证加载、数字键、技能互斥、禁用按钮、Esc 取消、赫按钮、揭开/戴回眼罩、完整茈演出、画质、减少动态效果、镜头复位、窗口缩放，以及预热后重复演出的几何资源数量稳定；另验证加载失败后的重试。候选只通过测试请求拦截加载，没有改变正式模型路径。首次测试曾错误地将延迟 GPU 上传视为资源增长，已改为比较预热后的重复完整演出并重新执行；不以放宽固定数量阈值掩盖增长。

阶段提交：`0793bbd`（工具与诊断）、`9d39281`（许可资产与手部候选）。大型资产均以 LFS 指针进入 Git，未将 `.blend1/.blend2`、原始下载缓存和整个输出目录加入普通 Git 历史。

## 复现命令

在项目根目录的 PowerShell 中运行。以下 `$blenderExe` 是本机已验证路径。

```powershell
$blenderExe = 'C:\Users\48749\AppData\Local\Programs\Blender Foundation\Blender 5.2\blender.exe'

# 诊断发现问题会返回非零退出码；请读取报告，不要将其掩盖为通过。
& $blenderExe --background --python-exit-code 2 --python scripts/audit_deformation.py -- --asset blender/gojo.blend --out output/milestone-a/baseline-audit.json --render-evidence
& $blenderExe --background --python-exit-code 2 --python scripts/audit_deformation.py -- --asset blender/candidates/gojo-hand-fit.blend --out output/milestone-a/hand-fit-audit.json --baseline output/milestone-a/baseline-audit.json --render-evidence

& $blenderExe --background --python-exit-code 2 --python scripts/render_character_audit.py -- --asset blender/candidates/gojo-hand-fit.blend --out output/milestone-a/blender-hand-fit --export-dir output/milestone-a/hand-fit-web --size 900 --samples 24

# 在另一终端保持 npm run dev 运行；以下使用本机 Edge。
node scripts/capture_character_audit.mjs --assets output/milestone-a/hand-fit-web --out output/milestone-a/browser-hand-fit
node scripts/capture_character_audit.mjs --assets output/milestone-a/hand-fit-web --out output/milestone-a/browser-hand-fit-production --model /models/candidates/gojo-hand-fit.glb
node scripts/smoke_character_integration.mjs
node scripts/summarize_character_audit.mjs

npm run check
npm test
npm run build
node scripts/validate-model.mjs public/models/candidates/gojo-hand-fit.glb
```

证据：`output/milestone-a/summary.json`、`report.html`、`*-audit.json`、`browser-*/parity.json`。`application-smoke.json` 记录实际交互断言；若执行中断，必须看记录完整性与进程退出码，不能只看文件存在。

## 未完成、受阻和下一步条件

**未完成：** 统一新骨架下的肩袖网格与锁骨/辅助骨绑定、拇指对掌动作、茈双手接触、握拳体积修正、最终袖口接合，以及完整动画混合/取消过程的逐顶点一致性检查。参考人体具有锁骨结构，但这些骨骼尚未移入五条悟候选，不能算肩部改造完成。

**资产/美术缺口：** 尚无已验收的高领制服肩袖拓扑。通用人体网格不能直接当作合格服装。下一步需要在 Blender 中实际设计肩线、袖窿与腋下边流，并在前举/侧举/高举姿势中修整权重和体积；不能继续通过圆管拼接或大幅平滑代替。现有工具与 CC0 手部来源可继续使用，不需要购买或额外授权。

**验收限制：** 目前未获得可据以宣布肩袖和最终手部质量合格的结果。任何自动数值改善都不代表 A 通过，更不代表全角色达到 5–6 或 7–8 分。后续修改必须在新的制作文件中进行，并重跑本记录的全部动作与多视角证据。
