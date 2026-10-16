# Milestone A3 实际交付 — 2026-10-16

**结论：Milestone A 未通过。已找到并取得合法、可编辑的专业基础资产；已制作肩部试样，但尚未具备可靠交付完整高质量制服的制作能力。停止扩大建模范围，不进入 B–E。**

本轮不是只交诊断文件：新增了实际 Blender 肩袖试样、一个明确标注有损的线性蒙皮试验、可运行的 GLB，以及左拇指局部修复候选。它们均未替换正式模型。没有将试样或局部修复冒充最终美术资产。

图集：`output/milestone-a3/report.html`。运行 `npm run dev` 后访问 http://127.0.0.1:5173/output/milestone-a3/report.html 。包含原生 Blender、实际控制网格、权重、简化 LBS Blender / Three.js 和失败画面。机器可读汇总：`output/milestone-a3/summary.json`。

## 1. 三条路线的实证比较

| 要求 | A：Blender Studio Snow v4.2 | B：现有 MakeHuman | C：专项服装制作 |
|---|---|---|---|
| 资产是否存在、能否获取 | 官方 111,580,346 字节 ZIP 已下载；8,377,421 字节源 blend 已实际打开 | 仓库已有 `makehuman-reference.blend`、原 OBJ/骨架/权重及来源记录 | 以 A 的作者上衣作为可编辑起点，实际建立本轮试样；没有取得已合格的五条悟制服 |
| 许可 | 官方页面 CC BY 4.0，允许修改、再分发衍生网格，需署名、附许可及修改说明 | 既有图形数据 CC0；不引入 AGPL 程序代码 | 修改 Snow 上衣时遵守 CC BY 4.0；委托新网格时需明确网页衍生 GLB 分发权 |
| 拓扑 | 身体 5,828 顶点、5,767 四边形；头部 3,719 顶点、3,631 四边形；独立上衣 1,839 顶点、1,783 四边形。肩、腋下有组织边流，见实际线框 | 13,380 顶点、13,378 四边形的人体；已接受手部来自此资产。新增前举120°/侧举90°人体渲染，仅作人体参考 | 本轮沿既有领口控制环改形，没有重新生成肩部。袖窿沿用作者上衣。高领结构、完整长袖和制服体积仍不合格/未完成 |
| 动画与可编辑面部 | 完整 CloudRig；脸部表情形态、手指和锁骨；可以在 Blender 编辑。未对五条悟脸部辨识度作验收 | 已有163骨参考绑定；人体可编辑，但不是最终日漫脸型/发型 | 需要服装美术设计、蒙皮、逐姿修形；当前工具能够编辑数据，不等于已获得这些美术成果 |
| GLB / Three.js | 原绑定含 B-bone、DQ、CorrectiveSmooth、驱动修正形态，不能直接照搬。已做10骨LBS试验并实际导出/浏览器验证 | 已有手部候选通过LBS与浏览器对照；尚没有基于它的合格制服 | 须使用普通变形骨/辅助骨与≤4权重；必要修正形态需烘焙为 glTF 动画，不能只留 Blender 驱动器 |
| 人工工作 | 必须修改成年修长比例、人物面部/发型及服装；不能把 Snow 原造型称为五条悟 | 必须从服装裁片和袖窿设计独立制服，人体外扩壳不成立 | 必须人工建立领座、袖窿、腋下活动量、长袖与逐姿体积；本轮仍缺这部分稳定产出能力 |
| 环境是否能完成 | 已证明能取得、编辑、绑定试验、真实渲染和导出；没有证明能自动完成最终美术 | 可保留并继续验证既有手部；不能凭已有工具宣布新制服可完成 | 有 Blender 5.2.1 和工程工具；瓶颈是精细角色服装制作与修形能力，不是再加一个程序化生成器 |

**选择：A 的专业作者网格作为长期制作起点，结合 C 的人工服装改造；保留 B 已通过的手部成果。** Snow 的上衣、脸部和绑定为后续 B/C/D 提供更好的起点，但不代表人物已好看，也没有实施后续阶段。E 的技能 VFX 未改。

源文件：`assets/vendor/snow/extracted/Snow/snow_v4.2.blend`。官方来源 https://studio.blender.org/characters/snow/v4/ 。许可、下载地址和 SHA-256：`assets/licenses/blender-studio-snow/`。要求署名 **Snow Rig (CC) Blender Foundation | studio.blender.org**。

下载前已从官方页面核实许可；先前 HEAD 请求403，正常官方下载GET成功。所有打开均使用 `--disable-autoexec`，未运行下载工程中的 `cloudrig.py`。没有付费、没有提取游戏资产、没有引入之前许可冲突的 catsuit。原始压缩包/贴图保存在忽略目录，不塞入普通Git历史。

## 2. 肩部原型：确实制作，但未通过

文件：`blender/candidates/a3-snow-shoulder-study.blend`。

- 使用作者独立上衣，不使用旧 `UniformAndBoots`、放样肩部或皮肤外扩壳。
- 对既有领口附近控制环作坐标编辑，同时对现有形态键施加同一偏移，保留源修正差值；改动顶点清单在 `shoulder/collar-edits.json`。肩袖仍采用作者拓扑，本轮不声称自己完成了全新肩袖重拓扑。
- 保留锁骨、分段肩骨/上臂骨、作者蒙皮与形态修正。使用固定灯光、相机和采样设置，10种姿势各有渲染、线框、右上臂联合权重图；另有5种姿势背侧局部图，共45张。
- 测试自然垂臂、前举45/90/120°、侧举45/90/120°、上臂旋转60°、弯肘、组合施术。真实上臂方向记录在 manifest / summary 中。人体手部在部分横向姿势超出画面，肩袖验收区域完整；这不是全身造型图。

**真实可见结果：** 肩顶更连续，袖山没有旧制服同样明显的块状尖角；背侧线框可见肩/腋下边流。但前举120°时领口形成尖点与下陷，腋下有明显拉伸凹痕；领口仍是T恤领口改形，缺少独立领座、厚度和正式制服结构。自然姿态胸前仍有V形牵引痕。没有完成长袖，弯肘画面只能证明人体/骨架能弯曲，不能证明不存在的长袖合格。

这些问题来自服装设计与领口周边权重/修正形态尚未重新设计，不能用更多平滑解决。按本轮决策门槛，完成一轮试样后不扩大到整个角色。

### 实时绑定试验的有效结论

`blender/candidates/a3-snow-lbs-probe.blend` / `output/milestone-a3/lbs-web/audit.glb` 是**有损诊断试验**：上衣保留作者控制网格和形态键，使用10根普通变形骨、最多4权重，烘焙10个保持姿势；去掉 B-bone 分段、DQ 和 CorrectiveSmooth。不等于完成实时绑定转换，也不是动画品质成品。

最初试验中导出脚本在新骨骼长度为零时写入矩阵，造成绑定朝向错误。已修复并加入矩阵断言；原错误截图和数据保存在 `lbs-rejected-bind/`，其约240mm偏差不能作为资产质量证据。修正后绑定矩阵残差约5.96e-7，截取4权重的丢失量为0。

正确试验中，源绑定与LBS的同索引控制网格最大位置差：自然垂臂21.292mm、前举45°25.762mm、前举90°25.123mm、前举120°21.591mm、侧举45°5.135mm、侧举90°1.703mm、侧举120°3.457mm、上臂旋转31.527mm、弯肘12.899mm、组合施术26.175mm。完整RMS和每姿数据见 `lbs-web/loss.json`。未将DQ、B-bone、平滑和变换分解的贡献单独归因。

**Three.js 与这个LBS版本**的11个姿势对照全部通过，最大误差0.000395mm；这证明GLB正确传输了简化结果，不能证明简化结果等价于原生绑定。下一步需要真正的游戏骨架/辅助骨与修正形态转换，不宜将原1494骨CloudRig直接塞进正式网页。

## 3. 左拇指：定位、修复范围与剩余问题

候选：`blender/candidates/gojo-a3-thumb-distal.blend`、`public/models/candidates/gojo-a3-thumb-distal.glb`。

CastPurple 第90帧，相交发生在三角形1545（顶点775/788/790）与1698（868/875/874）之间。该处是拇指末节薄层表面，交线约0.397mm，**不是穿透深度**。顶点775沿末节骨轴位于IP关节远端约8.01mm，而末节骨长约16.50mm。该顶点混合 Thumb2.L 87.5% 与 Thumb1.L 12.5%；另5个涉及顶点完全跟随末节。

实际消融：关闭 Thumb0.L 或 Thumb1.L 仍有相交；关闭 Thumb2.L 后消失。因而这项局部缺陷由末节相对转动与薄层的不一致权重触发；本次没有证据支持用全局掌骨旋转轴改造来修它。没有把所有手部问题归结为权重，也没有宣称原拓扑的指甲厚度和掌根体积已完善。

**唯一资产改动**：顶点775删除近节权重并设为 Thumb2.L 100%。没有改变任一顶点坐标、拓扑、UV、骨架、骨骼轴、六段动画或挂点。`verify_a3_preservation.py` 对以上内容逐项比较通过。

完整接触回归804个时间样本：左手六段动画检出的自交均为0；茈双手相交仍为0/241。右手赫原有最多3对自交不变。该检测不排除共面重叠、完全包容、采样间碰撞和低于0.2mm交线门槛的情况。

**仅接受此局部技术修复。** 未制作拇指对掌新手势，未声称握拳体积或指垫接触合格；之前已撤回的A2掌骨优化没有重新使用。需要继续由美术设计对掌与握拳形态，必要时局部修形；当前证据不足以断言必须替换整个手部网格。

## 4. 测试与工程保护

- 起点 `character-rebuild@0f66e41`，工作区干净。本轮正式模型、A1/A2已接受候选、`src/`、UI、VFX、已有诊断脚本不变。
- 备份 `output/backups/pre-milestone-a3/`：A2 blend/glb、A2报告、关键诊断源码，共5文件；逐文件SHA匹配，备份blend实际打开并运行定位脚本成功。
- 变形回归1570个动画时间样本；严重边长异常样本0。全局状态仍为 **FAIL**，旧头发12个退化面仍报告；角色候选中的旧肩部也未被偷偷标为已重建。
- 浏览器QA：肩袖LBS 11姿通过；拇指角色QA 11姿通过；生产GLB 7姿通过。角色顶点最大差约0.042438mm。仅为采样姿势几何/挂点一致性，不冒充完整过渡连续性或1080p帧率测试。
- `npm run check`、7项 `npm test`、`npm run build`、6项接触内核测试通过。Three.js 552.65kB 分块警告仍存在。
- 候选GLB接口通过：8网格、56骨、111244三角形、6动作；Idle4s、Blue5s、Red4s、Purple8s、Reveal/Cover2.4s与挂点保持。新增肩袖试验是独立工具资产，不冒充满足正式角色接口。
- 正式/拇指候选应用冒烟及加载失败重试通过；包括重复触发拦截、取消、眼罩切换、完整茈、设置和缩放，结果在 `application-smoke/application-smoke.json`。
- 新blend/glb沿用Git LFS，最大候选约8.48MB。原始ZIP111.58MB不进Git。`output/`是真实本机证据与备份，仍被Git忽略，不等同异地备份。

## 5. 重现命令

在项目根目录的PowerShell中设置：

```powershell
$blender = 'C:/Users/48749/AppData/Local/Programs/Blender Foundation/Blender 5.2/blender.exe'
& $blender -b assets/vendor/snow/extracted/Snow/snow_v4.2.blend --disable-autoexec --python scripts/inspect_a3_source.py -- output/milestone-a3/snow-inspection.json
& $blender -b assets/vendor/snow/extracted/Snow/snow_v4.2.blend --disable-autoexec --python scripts/prototype_a3_shoulder.py -- --save
& $blender -b blender/candidates/a3-snow-shoulder-study.blend --disable-autoexec --python scripts/prototype_a3_shoulder.py -- --view back-close --cases natural,front120,side120,twist,casting --out output/milestone-a3/shoulder-back
& $blender -b blender/candidates/a3-snow-shoulder-study.blend --disable-autoexec --python scripts/export_a3_lbs_probe.py
& $blender -b blender/candidates/gojo-a2-purple-spacing.blend --disable-autoexec --python scripts/probe_a3.py
& $blender -b blender/candidates/gojo-a2-purple-spacing.blend --disable-autoexec --python scripts/repair_a3_thumb.py
& $blender -b --disable-autoexec --python scripts/audit_contacts.py -- --asset blender/candidates/gojo-a3-thumb-distal.blend --out output/milestone-a3/thumb-contacts.json
& $blender -b --disable-autoexec --python scripts/audit_deformation.py -- --asset blender/candidates/gojo-a3-thumb-distal.blend --out output/milestone-a3/thumb-deformation.json --baseline output/milestone-a2/spacing-deformation.json
& $blender -b --disable-autoexec --python scripts/verify_a3_preservation.py
& $blender -b --disable-autoexec --python scripts/export_character.py -- --source blender/candidates/gojo-a3-thumb-distal.blend --output public/models/candidates/gojo-a3-thumb-distal.glb --replace-candidate
& $blender -b --disable-autoexec --python scripts/render_character_audit.py -- --asset blender/candidates/gojo-a3-thumb-distal.blend --out output/milestone-a3/thumb-blender --export-dir output/milestone-a3/thumb-web --cases rest,half-fist,fist,red-40,red-44,red-48,blue-46,purple-90,purple-132,shoulder-front,shoulder-side --size 640 --samples 12
```

另一个终端保持 `npm run dev`，然后运行：

```powershell
node scripts/capture_character_audit.mjs --assets output/milestone-a3/lbs-web --out output/milestone-a3/lbs-browser
node scripts/capture_character_audit.mjs --assets output/milestone-a3/thumb-web --out output/milestone-a3/thumb-browser
node scripts/capture_character_audit.mjs --assets output/milestone-a3/thumb-web --out output/milestone-a3/thumb-production --model /models/candidates/gojo-a3-thumb-distal.glb
node scripts/smoke_character_integration.mjs --candidate public/models/candidates/gojo-a3-thumb-distal.glb --out output/milestone-a3/application-smoke
npm run check
npm test
npm run build
node scripts/validate-model.mjs public/models/candidates/gojo-a3-thumb-distal.glb
node scripts/summarize_a3.mjs
node scripts/check_a3_report.mjs
```

原型脚本仅应在许可源工程或它生成的肩部试样上运行。重跑会覆盖同名试验输出；正式模型不在这些输出路径中。

## 6. 下一步需要的人工作品及接入条件

可以直接使用已取得的 Snow，无需再购买人体。实际缺少的是**角色服装建模/绑定人员交付的合格网格与修形**。可选：由用户提供自有/已授权的高领长袖上身blend，或安排美术在本轮CC BY源文件上制作。若委托采购，先确认供应商、报价和许可再下单，本轮没有进行采购。

最小交接规格：

1. 可编辑四边形制服上身，成年修长比例；独立领座、高领内外侧和厚度、完整长袖；肩线/袖窿/腋下具备合理边流和活动余量，不以皮肤壳或旧体素网格平滑代替。
2. 保留可识别的锁骨/肩/上臂/前臂骨关系及必要辅助骨；LBS每顶点≤4影响、归一权重。允许形态修正，但须提供可烘焙数据，而非仅依赖Blender自定义驱动。
3. 在本轮10种姿势及额外内外旋、前后组合中，实际检查肩顶、腋下、领口、袖口和长袖弯肘体积；交付带姿势的blend、线框及固定光照图。
4. 保留原六动作时长与公开名称、Blindfold、FX_Hand_L/R/Center；新骨架通过适配层重定向，不直接改变UI/VFX。沿用米制、脚底原点、GLB Y向上/正Z朝前约定。
5. 拇指对掌/握拳需实际指垫接触设计、掌根体积检查；保留已修复单点和原双手间距，任何覆盖需回归证据。

建议工作量供人工制作排期，不是已执行或工期保证：上身服装设计/重拓扑约3–6人日，肩肘LBS绑定和修正约2–4人日，拇指对掌/握拳修形约1–2人日，导出接入与回归约1–3人日；先交独立上身，不扩展整角。面部/发型、最终材质与动作美术另行评估。

现有自动化能承担资产哈希保护、来源记录、关节消融、接触/形变扫描、导出约束、双端顶点校验和真实截图。**不能据此声称已具备独立制作精致五条悟的美术能力。** 当前的整体角色约3/10评价没有被本轮局部成果推翻。

## 7. 文件与状态

新增：本报告；`assets/licenses/blender-studio-snow/`3个许可文件；3个候选blend；拇指候选GLB及export.json；`inspect_a3_source.py`、`probe_a3.py`、`prototype_a3_shoulder.py`、`export_a3_lbs_probe.py`、`repair_a3_thumb.py`、`verify_a3_preservation.py`、`summarize_a3.mjs`、`check_a3_report.mjs`。

已完成：合法源资产获取和检查、真实肩袖试样与一轮十姿测试、有损GLB试验和浏览器校验、拇指单点修复及完整现有回归、保护与许可记录。

未完成：合格高领长袖制服、原生绑定到实时绑定的质量保真转换、对掌与握拳美术验收、完整高质量角色。

受阻：稳定的人工服装网格设计与逐姿修形制作能力；不是缺Blender、不是缺可合法使用的基础人体。已停止继续编写低质量角色生成器。
