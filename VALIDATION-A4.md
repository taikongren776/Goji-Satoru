# LIMITLESS — Milestone A4 真实交付记录

日期：2026-10-16。美术冻结基线：`character-rebuild@f006c13`。

**Milestone A — BLOCKED BY ART ASSET QUALITY**

当前工程技术管线已经能够接入和验证新的角色资产，但高质量高领长袖制服仍需要专业角色美术进行实际网格制作、拓扑设计和逐姿修形。继续使用当前自动化程序化建模方式无法可靠达到项目目标。

## 已完成：工程接口与接入证据

- `src/character-contract.ts`：六个逻辑动画、三个技能挂点、资产映射及人工评分契约。
- `src/character-adapter.ts`：任意唯一节点/骨骼/动画名称映射，骨骼或 helper 挂点及局部偏移，当前动画/技能/进度/眼罩状态与角色根节点。没有顶点编号依赖，没有固定骨骼或 mesh 数量假设。
- `src/character-assets.ts`：明确的资产入口、开发候选预览、生产人工批准记录与 GLB SHA-256 核对。失败保留重试，不自动替换正式资产。
- `src/legacy-character-materials.ts`：隔离旧外观处理；专业资产 `authored` 模式保留原材质和纹理。
- `src/experience.ts`：通过 Adapter 消费逻辑接口，继续使用既有技能时间轴、镜头、眼罩交互。
- `public/models/character-production/active.json`：仍指向旧正式展示文件，并明确标记 `legacy-reference`，不代表美术批准。
- `scripts/validate-production-character.py`：GLB 数据检查、实际 Blender 导入、蒙皮/骨架/动画/UV/材质/纹理/节点/坐标检查，以及人工评分和证据门禁。只输出报告，不发布资产。
- `docs/character-art-spec.md`：人体、脸、发束、制服、手部、逐姿及中性灯光验收规格。
- `docs/character-review.template.json`：全部未评分；禁止用技术测试结果自动填高分。
- `docs/character-integration.md`：美术交付、映射、校验、预览、人工批准、正式入口更新和回滚流程。

测试资产 `public/models/character-production/fixtures/gojo-final.glb` 来自 A3 的 `gojo-a3-thumb-distal.glb`。仅改名 69 个节点、mesh 和 6 段动画元数据，整个二进制数据块逐字节保持相同。左手挂点改用父骨骼加原局部变换，以验证稳定骨骼挂接。文件名模拟未来交付，**不是真正的最终角色**。来源、哈希和变换见同目录 `provenance.json`。

## 实际测试结果

| 检查 | 结果与范围 |
|---|---|
| TypeScript | `npm run check` 通过 |
| 单元测试 | `npm test`，14/14 通过，其中 7 项为新 Adapter 测试 |
| 生产构建 | `npm run build` 通过；保留 Three.js chunk 约 552.65 kB 的构建体积警告 |
| 真实浏览器 Adapter | 六段动画各 3 个时间采样，共 18 点；原候选与改名候选三个挂点最大世界坐标误差 0 m；材质身份保留 |
| 实际 LIMITLESS 操作 | 三个技能完整播放、重复触发拦截、Esc、摘戴眼罩、提前取消、缺挂点拒绝及重试、未批准生产资产拒绝及恢复均通过 |
| 现有应用 smoke | 原正式展示、A3 候选接入、加载失败重试通过；覆盖画质、减少动态、缩放、复位和预热后几何计数 |
| 真实生产构建 | 开发预览参数被忽略；`integration-test` 入口被拒绝；重试恢复；无页面异常 |
| Blender 验证器 | 8 个正反例符合预期：集成候选、粗模生产拒绝、缺挂点、缺动画、缺 skin、错误单位、非有限权重、坏 GLB 头 |
| 当前候选严格生产检查 | **FAIL（预期）**：UV、纹理、朝向标记、生产用途与人工批准记录不足 |
| 冻结检查 | 24 个既有文件、14 个 LFS 资产保持 A3 基线；另实际核对候选/fixture 哈希及二进制块一致 |
| Git / LFS | `git diff --check`、`git lfs fsck` 通过；新 fixture 3,919,816 字节，使用 LFS |

证据：

- [真实浏览器截图和结果](output/playwright/milestone-a4/adapter-results.json)
- [导入验证正反例](output/milestone-a4/validator-tests.json)
- [生产构建门禁](output/milestone-a4/production-build-smoke.json)
- [现有应用回归](output/milestone-a4/application-smoke/application-smoke.json)
- [冻结核对](output/milestone-a4/freeze-verification.json)
- [本地截图报告](output/milestone-a4/report.html)

截图是 Edge 中实际 Three.js 模型渲染；六段动作保存在 `output/playwright/milestone-a4/`。中性灯光 Idle 图仍可见肩顶平切、袖子块状、尖锐发束及粗糙整体轮廓。**本轮未改善或重新评分美术质量。** 本轮没有新的 Blender 美术渲染；实际 Blender 操作是导入验证，A3 既有渲染和诊断继续保留。

## 备份和未改变的范围

`output/backups/pre-milestone-a4/` 保存正式 blend/glb、A3 blend/glb 和 `source-f006c13.zip`。四组源文件/备份 SHA-256 一致；源码 ZIP 的 46 项已全部读取，解压数据共 262,117 字节。二进制没有经过重新保存；本轮未再次在 Blender 打开备份 blend，不能把哈希读取核对描述成新的视觉验收。

所有旧候选、Snow/MakeHuman 来源、失败证据和诊断保留。正式模型、UI、`src/effects.ts`、`src/audio.ts` 均未修改。旧头发 12 退化面与全局 FAIL 结论保留；本轮未重跑完整 A3 变形测试，也没有把它改成 PASS。未进入 B–E。

## 复现命令

在仓库根目录运行：

```powershell
npm run check
npm test
npm run build
node scripts/test-production-character-validator.mjs
node scripts/verify-character-freeze.mjs
node scripts/test-character-production-build.mjs
# 保持另一个终端的 npm run dev 运行在 127.0.0.1:5173
node scripts/test-character-adapter.mjs
node scripts/smoke_character_integration.mjs --candidate public/models/candidates/gojo-a3-thumb-distal.glb --out output/milestone-a4/application-smoke
node scripts/report-character-a4.mjs
```

独立严格导入命令见 `docs/character-integration.md`。测试验证器调用本机 Blender；生产构建 smoke 自动启动并关闭端口 4175 的本地 preview。

## 未完成与受阻

尚无经过视觉批准的专业五条悟完整资产。本轮没有新肩袖、脸、头发、手部拓扑或权重修改，没有专业资产生产通过案例，没有证明异构第三方完整角色的最终美术质量。

Adapter 不自动重定向动画。`fit` 只缩放时间，不保证释放/眼罩接触时刻匹配；艺术人员仍需按规格制作事件时序。坐标标记的语义与截图是否真实证明质量必须人工核验。当前验证器明确拒绝 sparse accessor 和未支持的必需压缩扩展。完整动画变形、接触和双端视觉对照仍需在新资产交付时执行。

运行时批准记录检查不是数字签名，也不能取代严格导入和人工审核；仓库维护者负责生产映射。技术测试通过不等于美术通过。未宣称 1080p/60 FPS 达标。

下一步条件：专业角色美术交付符合规格的可编辑 Blender 工程、GLB、合法许可/来源和真实逐姿证据，完成技术与人工视觉验收后，再决定是否替换正式入口。本阶段在工程接入准备完成处停止。
