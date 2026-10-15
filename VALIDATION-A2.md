# Milestone A 第二阶段实际记录 — 2026-10-15

**结论：Milestone A 未通过。** 本轮没有完成肩袖拓扑重建，也没有修好拇指对掌和握拳体积。实际保留的资产改动只有 `CastPurple` 的双臂/手腕轨迹；不能将其描述成角色基础结构重建完成。正式网页仍加载原正式模型。

可浏览报告：`output/milestone-a2/report.html`。启动 `npm run dev` 后打开 <http://127.0.0.1:5173/output/milestone-a2/report.html>。本报告和图集包含失败试作，不只展示有利画面。

## 项目保护

- 起点为 `character-rebuild` 分支 `64e9ad9`，开始时工作区干净。
- 本轮备份：`output/backups/pre-milestone-a2/`，含上轮 `.blend/.glb`、验收文档和相关脚本，共6个文件；逐文件SHA-256一致，备份Blender工程实际打开成功。
- 保留上轮 `gojo-hand-fit`，新资产使用不同候选路径。正式 `.blend/.glb`、上轮候选 `.blend/.glb` 的哈希在实施后仍匹配。
- `.blend/.glb` 延续 Git LFS。最大新增二进制约3.94MB，未向普通Git历史直接加入二进制。`output/` 为本机证据目录，不进入Git，不等于异地备份。
- 未修改 `src/` 正式应用代码、`effects.ts`、UI、交互和原技能时间轴。

## 肩袖：检查完成，重建未完成

Blender实际读取显示：`UniformAndBoots` 为旧制服/鞋靴合并网格，34,632顶点、53,719面，其中38,638个三角面、15,053个四边形。这里是整个对象的计数，不冒充肩部局部计数。旧代码记录与本轮线框均支持其体素融合/减面来源，肩袖缺少有组织的袖窿与腋下边流。

真实渲染中可见自然下垂的肩顶平切；前举和弯臂的袖山鼓成硬块；侧举120°腋下出现局部凹陷、折线。增加平滑、细分或重新分配同一旧网格权重不能算结构重建，本轮没有这样冒充交付。

本地 MakeHuman 参考为人体，不能未经服装设计直接用作制服。本轮检查官方组织的服装候选：

- 固定仓库版本：`makehumancommunity/communityassets-wip@f4e7477ced97c814ee41ff2d54f596f19ddd30ae`。
- `clothes/catsuit/catsuit.mhclo` 声明作者 Bad Wolf Labs、许可 AGPL3。
- 同仓库根README声明提交内容默认CC0，并附带其他许可例外。
- 具体文件与总说明存在冲突，**没有下载/引入其OBJ，也没有将它归入本项目CC0资产**。元数据检查记录见 `output/milestone-a2/catsuit-metadata.txt`。
- 固定版本来源：[文件许可](https://github.com/makehumancommunity/communityassets-wip/blob/f4e7477ced97c814ee41ff2d54f596f19ddd30ae/clothes/catsuit/catsuit.mhclo)、[仓库说明](https://github.com/makehumancommunity/communityassets-wip/blob/f4e7477ced97c814ee41ff2d54f596f19ddd30ae/README.md)。这只说明该候选不适合直接引入，不表示互联网上没有其他合法资产。

**实际缺口：** 当前没有已验收的制服肩袖基础资产；本轮也未能通过可用操作交付可靠的人工服装重拓扑。锁骨、肩部辅助骨、前臂扭转骨和对应肩袖蒙皮均未建立。需要许可明确的连续制服上身网格，或人工在Blender中完成肩线、袖窿、腋下重拓扑，再进行绑定与逐姿修形。不是工具能打开Blender就等于具备已完成的高质量美术资产。

## 拇指试作：验证后拒绝

保留两个独立失败试作：

- `blender/candidates/gojo-a2-motion-study.blend`
- `blender/candidates/gojo-a2-motion-v2.blend` 和同名候选GLB

试作校准了Thumb0/1/2的局部轴，组合CMC多轴旋转与MCP/IP屈曲，按指尖目标拟合，第二版增加骨段间距约束。没有生成另一套手部网格，也没有改动MakeHuman手部拓扑与权重。

**拒绝原因：** 目标点接近不代表真实指垫接触。v2实际截图中对掌仍不自然，完整动作检查显示揭眼罩右手新增最多33对自交三角形，茈右手最多64对；握拳和掌根仍有挤压。因此最终保守候选从A1重新生成，撤回全部拇指绑定轴/动画试作，保持原手指动作。

图集里最终候选的 `thumb-index`、`thumb-middle` 明确标记为**不支持该姿势，展示中立姿态**；不能当作对掌完成证据。试作对掌图单独列在“拒绝的试作”中。

## 实际保留的候选：仅改善茈的空间关系

工程：`blender/candidates/gojo-a2-purple-spacing.blend`。

导出：`public/models/candidates/gojo-a2-purple-spacing.glb`，3,919,512字节、111,244三角形、56骨骼、8网格、原6个动画，无外部资源。

- 仅修改 `CastPurple` 中左右 `UpperArm`、`Forearm`、`Hand` 共6根骨骼的动画轨道。
- 双手定位使用不同位置，形成阶段保留高低及前后层次；释放时右手前伸、左手回落。
- 阶段标记：准备0、分立能量31、定位73、成势108、释放138、收势197帧；总长仍240帧/8秒。
- 使用两段骨骼解算、关键姿态之间的平滑过渡并逐帧烘焙；手腕旋转约束在50°以内，连续四元数符号，防止插值翻转。
- 不添加运行时约束，不改变GLB使用的线性蒙皮方式。
- 实际比较验证：所有网格坐标/面/UV/权重、所有绑定骨、其他五个完整动画、茈的其余曲线、动画范围、锚点局部变换均保持一致。结果 `output/milestone-a2/preservation.json` 为PASS。
- `FX_Hand_L/R` 随修改后的手部轨迹移动，局部绑定未修改；`FX_Center` 未修改。采样位置的Blender/Three误差小于0.001mm。没有宣称旧VFX的艺术构图已重新验收。

这个候选只减少双手交叠；肩袖形状仍失败，双手造型与释放表现力仍需人工动画设计。

## 全区间真实结果

变形检查按60Hz，6段共1,570个时间点；赫40–48帧额外四分之一帧采样。接触检查按30Hz，共804个动画时间点（含赫额外子帧）。

| 动画 | 变形采样 | 双手最大边长比 | 接触采样 |
|---|---:|---:|---:|
| Idle | 241 | 1.325 | 121 |
| CastBlue | 301 | 1.314 | 151 |
| CastRed | 257 | 1.789 | 145 |
| CastPurple | 481 | 1.896 | 241 |
| RevealEyes | 145 | 1.731 | 73 |
| CoverEyes | 145 | 1.731 | 73 |

全区间双手未检出超过3倍的边长；多条件确认严重伸长记录为0。总诊断仍 **FAIL**，保留旧头发12个近零面积面，另有812条人工复核记录。812不是独立穿模数量，也不能与A1不同采样范围的662直接当作退步比较。

茈的左右手表面相交采样从A1的43/241变为0/241；候选左右手顶点到对侧表面最小距离约92.09mm。**仍有左拇指局部自交**：21–135、187–209帧各最多1对三角交叉，交叉线段长约0.21–0.40mm。这不是穿透深度。右手茈自交为0；赫右手仍保留基线最多3对自交。不能写成“所有手部无穿模”。

新检测器采用BVH粗筛和三角形/线段精确交叉，排除共享顶点/边与小于0.2mm的擦边交叉；记录帧、三角形、顶点、骨骼和交叉位置。6项已知几何内核测试实际通过。仍不覆盖共面重叠、完全包容、采样间隙和肩袖自身交叉；手腕藏在袖口中的合法包覆不能直接算严重错误。仍须看真实渲染。

## 真实截图与工程验收

- A1基线、拒绝的v2、最终保守候选各28张Blender截图；各28张真实Edge/Three截图。
- 最终生产GLB另外15张实际姿势截图。
- 肩部8种姿态×正面/侧面/45°/特写，共32张；3张线框、3张权重图。
- 对照关键画面使用相同相机、Cycles24采样、720×720。线框/权重900×900。双端光照算法不同，不声明像素一致。
- 保守候选QA最大顶点误差0.04523mm；生产GLB15姿势最大误差0.04523mm。全部已采样姿势一致性检查通过。
- 类型检查、7项原单测、生产构建、候选GLB接口校验通过；Three构建块仍超过500KB警告。
- 实际应用回归通过：6动画加载、数字键、互斥、禁用按钮、取消、赫按钮、眼罩切换、完整茈演出、画质、减少动态、复位、窗口缩放、预热后资源数量稳定和失败重试。
- 未测1080p帧率；未做连续动画混合/取消全过程的逐顶点双端比较。不能给出60FPS或整体视觉质量达标结论。

## 实际文件

新增：`scripts/inspect_phase2.py`、`phase2_kinematics.py`、`refine_phase2_animation.py`（拒绝试作的制作脚本）、`refine_purple_spacing.py`（保守候选）、`audit_contacts.py`、`test_contact_kernel.py`、`verify_phase2_preservation.py`、`render_phase2_shoulders.ps1`、`summarize_phase2_audit.mjs`，本文件及候选资产。

修改：`scripts/character_common.py`（扩展姿态/相机）、`audit_deformation.py`（6段完整检查、历史缺陷分区）、`render_character_audit.py`（固定相机、权重图、线框、不支持姿态标记）、`smoke_character_integration.mjs`（指定候选/输出目录），A1报告增加本报告链接。

## 复现命令

```powershell
$blenderExe = 'C:\Users\48749\AppData\Local\Programs\Blender Foundation\Blender 5.2\blender.exe'
# 制作脚本拒绝覆盖已有候选；本轮文件已经存在，不必重建。
# & $blenderExe --background --python-exit-code 2 --python scripts/refine_purple_spacing.py
& $blenderExe --background --python-exit-code 2 --python scripts/audit_deformation.py -- --asset blender/candidates/gojo-a2-purple-spacing.blend --out output/milestone-a2/spacing-deformation.json --baseline output/milestone-a/hand-fit-audit.json
# 上条预期为非零：全局诊断FAIL，不应隐藏退出码。
& $blenderExe --background --python-exit-code 2 --python scripts/audit_contacts.py -- --asset blender/candidates/gojo-a2-purple-spacing.blend --out output/milestone-a2/spacing-contacts.json
& $blenderExe --background --python-exit-code 2 --python scripts/test_contact_kernel.py
& $blenderExe --background --python-exit-code 2 --python scripts/verify_phase2_preservation.py
./scripts/render_phase2_shoulders.ps1

# 另一终端启动 npm run dev
node scripts/capture_character_audit.mjs --assets output/milestone-a2/spacing-web --out output/milestone-a2/browser-spacing
node scripts/capture_character_audit.mjs --assets output/milestone-a2/spacing-web --out output/milestone-a2/browser-production --model /models/candidates/gojo-a2-purple-spacing.glb
node scripts/smoke_character_integration.mjs --candidate public/models/candidates/gojo-a2-purple-spacing.glb --out output/milestone-a2
node scripts/validate-model.mjs public/models/candidates/gojo-a2-purple-spacing.glb
node scripts/summarize_phase2_audit.mjs
```

原始报告：`spacing-deformation.json`、`spacing-contacts.json`、`baseline-contacts.json`、`candidate-contacts.json`（拒绝v2）、`preservation.json`、`browser-*/parity.json`、`application-smoke.json`。

## 最终状态

**已完成：** 项目保护、实际资产/拓扑检查、隔离试作与拒绝回归、茈双手间距局部修整、永久接触诊断、六动画检查、真实双端截图和报告。

**未完成：** 肩袖拓扑、锁骨/肩辅助/前臂扭转、拇指对掌、握拳体积、自然的完整施术动作设计、肩袖自身穿模自动检测。

**受阻的美术交付：** 缺少可用且许可明确的制服肩袖网格，以及已完成的人工重拓扑与手部接触修形。当前环境能运行Blender，但本轮实际操作能力没有产出可验收的结构，不能用自动试作代替。没有擅自购买或引入许可冲突资产。等待用户检查，不进入下一阶段。
