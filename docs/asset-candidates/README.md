# Milestone A5 — 基础资产筛选

检查日期：2026-10-16。起点 `character-rebuild@a13173c`，工作区干净。仅筛选下列 **3 个候选**，已停止扩大搜索。

**Milestone A — BLOCKED BY ART ASSET QUALITY**

本轮结论：尚未找到同时通过本项目许可、文件实检、成年动漫比例及肩手变形验收的新资产。没有把任何候选提升为最终角色，也没有因为付费或来自专业厂商就预设高分。

| 候选 | 许可 / 获取 | 实际证据 | 筛选决定 |
|---|---|---|---|
| [01 PolyOne Stylized Male](candidate-01.md) | Superhive 显示 $8、Creative Commons，链接明确 CC BY 4.0；同作者 ArtStation 渠道是不同许可 | 已查看 12 张官网大图，包括脸、全身、骨架、线框和 UV；未购买、无模型文件 | **待售前证据，不建议立即购买**。外观偏健壮英雄体型；关键手部、侧脸和抬臂未证实 |
| [02 Reallusion CC3+ Male Base](candidate-02.md) | 官方免费基础包；允许修改及若干商业用途，但现行条款对可提取模型分发有限制 | 官方产品/拓扑/手部/姿势资料；未下载或引入模型 | **公开原生 GLB 路线暂不准入**。需要权利方确认具体授权，不能将“商用”直接等同于本项目分发权 |
| [03 Blender Studio Snow v4.2](candidate-03.md) | 已取得原始文件、CC BY 4.0 许可与哈希记录 | 本轮原始 blend 实检及 20 张中性 Blender 图；此前 A3 证据继续保留 | **保留为专业人工改造备选**。取得与许可最明确；不等于五条悟完成品或自动制作路线 |

## 本轮实际做了什么

- 新增三份候选档案，区分官网声明、官网图片观察、本地文件统计、实际姿态渲染和未验证项目。
- PolyOne 大图均从实际产品页面解析的链接打开；只有浏览器截图，无采购、登录、下载源模型或联系作者行为。
- Snow 直接读取官方原始 `snow_v4.2.blend`，未执行内嵌 `cloudrig.py`，没有运行任何角色/肩袖生成器。源文件 SHA-256 前后不变。
- Snow 输出正面/侧面全身、正面/侧面/45°头部、面部线框、手掌/手背/指缝拇指/手部线框，以及垂臂、前举90°、侧举90°/120°、腋下背侧和人体肩部线框，共20图。
- 第一轮灰模掌面欠曝，人体肩部线框仍受源 Mask 遮挡。保留 `output/milestone-a5/snow/`；第二轮 `snow-v2/` 在全部视角统一加入下方补光，仅在线框副本移除 Mask/Subdivision 以显示完整控制网格。不改源几何或蒙皮，也不将照明改善算作资产质量提升。
- 原生材质存在 UDIM 路径读取警告。灰模图只评估形体、拓扑和有限姿态，不作为纹理完成度证明。

## 需要的下一步，按证据而非价格决定

1. 若希望推进付费候选：先要求 PolyOne 提供严格侧脸、掌心/手背/拇指及指缝近景、肩部前举90°/侧举120°的中性实录、未细分控制网格、可验证试用文件或明确售前保证，并确认购买渠道交付包附 CC BY 4.0。见候选01内可直接使用的询问清单。**本轮不请求立即付款，也没有擅自购买。**
2. 若选择现成合法起点：将 Snow 源文件及本轮证据交给专业角色美术做成年比例、日漫面部和完整制服制作评估；先交肩袖与手势小样。当前自动化方法仍不能承诺完成这一美术工作。
3. CC3+ 只有收到针对“浏览器直接请求、用户可保存并在 Blender 打开的衍生 GLB”及交付 blend 的明确许可后，才恢复资产准入。不以技术混淆或改扩展名绕过许可限制。

三者都没有现成合格的五条悟高领长袖制服、六段施法/眼罩动作及本项目挂点。合格人体拓扑不能替代服装网格制作。人体源许可也不自动授予《咒术回战》角色设计的商业权利；此处只筛查基础资产权利。

## 工程范围与验收边界

本轮没有改 `src/`、UI、VFX、audio、Adapter、正式模型、旧候选或生成器。没有生成替代角色，没有修改权重、动画或网格，没有新的 GLB 导出或生产资产接入测试。A4 已有工程通过结论继续有效，但本轮未重跑并冒称新的全套 PASS。

A4 的哈希与人工评分检查并不是自动法律审查；许可准入仍需来源文件和人工核实。本轮各候选许可条件单独记录，绝不把可加载、全四边形或卖家标注“game ready”作为美术验收。

## 文件与复现

- 真实图集：`output/milestone-a5/report.html`。
- Snow 原始检查：`output/milestone-a5/snow-v2/inspection.json`；同目录20张PNG。简要统计和来源记录已纳入本目录 `evidence/`。
- 官网证据：`output/playwright/milestone-a5/`，含产品/许可页截图、12张大图浏览器截图、CC资料、URL清单；这是卖家证据，**不是本地模型实测**。一次缩略图请求超时保留在记录中，不影响已成功的大图。
- 脚本：`scripts/inspect_a5_snow.py`、`scripts/capture_a5_sources.mjs`、`scripts/report_a5_assets.mjs`。前两者只做检查/截图，不保存或重建角色。

```powershell
& 'C:/Users/48749/AppData/Local/Programs/Blender Foundation/Blender 5.2/blender.exe' -b assets/vendor/snow/extracted/Snow/snow_v4.2.blend --disable-autoexec --python-exit-code 2 --python scripts/inspect_a5_snow.py
node scripts/capture_a5_sources.mjs
node scripts/report_a5_assets.mjs
```

`output/` 和原始下载包仍是本机证据，不属于远程备份。没有提交新的模型二进制；旧 Snow、MakeHuman、A3 修复、失败证据、全局 FAIL 和 Git/LFS 历史保留。
