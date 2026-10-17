# 人物外观优化候选（2026-10-17）

已实际修改 CC0 HairSample_Male 的现有网格：收窄眼部纵向比例、微调下颌、缩短垂落刘海、增加发顶高度、调整头身比和腿长；白发、蓝眼、深色服装。没有生成新的完整人物、手部或肩袖。

打开 `http://127.0.0.1:5173/character-study.html`，可切换原正式粗模 / VRoid 原始资产 / 本次候选，旋转缩放并检查固定视角和绑定姿势。这个独立预览页也包含在 `npm run build` 的产物中。

交付：

- `public/models/candidates/limitless-whitehair-study.vrm`
- `blender/candidates/limitless-whitehair-study.blend`（已保存并重新打开；glTF 回退材质，不是原生 MToon 编辑器）
- `public/models/candidates/limitless-whitehair-study.LICENSE.md`
- `output/playwright/character-style/report.html`（真实对比截图，含原始资产）

真实结果：脸部、分束头发与肩臂整体性比旧粗模改善明显。但新候选仍偏少年，发型仍非五条悟造型，衣服仍是连帽衫。抬臂时腋下仍拉扯，握拳的拇指包覆和指节造型尚需调整。没有眼罩和六段技能 / 揭眼动作，不满足正式替换条件。不能把有限姿势下没有非有限顶点理解为无穿模或全动画通过。

没有修改正式模型、正式 active manifest、LIMITLESS UI、experience.ts、effects.ts 或 audio.ts。**当前是外观候选，不是正式角色完成。**

验证与复现（先运行 `npm run dev`）：

```powershell
node scripts/style_vrm_candidate.mjs
node scripts/validate_styled_vrm.mjs
node scripts/capture_character_style.mjs
& 'C:/Users/48749/AppData/Local/Programs/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/import_styled_vrm.py
node scripts/report_character_style.mjs
npm test
npm run build
node scripts/test-character-production-build.mjs
```

实测：17,669 个属性顶点，24,858 个三角形。源拓扑、UV、权重保持一致；绑定矩阵最大误差 5.73e-8 以下。两份 VRM 共 14 组静态姿势测量无非有限顶点，浏览器无脚本错误；这不是自动美术评分。原有 14 个单元测试通过，类型检查 / 生产构建通过（保留 Three.js 大包提示）。

源文件和旧正式资源均保留。新的二进制按现有 Git LFS 规则管理。`.blend` 的骨架、蒙皮和形态键可编辑，但 VRM 的次级动画元数据与 MToon 不通过 Blender 默认 glTF 导入器往返；浏览器中的 `.vrm` 是此次外观参考。
