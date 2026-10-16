# FAST TRACK — 实际交付结果

2026-10-17，基线 `7cc8adb`。采用 **fallback C：临时旧角色 + 新VFX**。Snow重建停止，没有采购、联络卖家或开启委托。没有获得达到目标6/10的新角色，也没有将历史美术FAIL改成PASS。

直接打开 http://127.0.0.1:5173/ 。服务未启动时在项目根目录执行 `npm run dev`。

## 已交付

- 苍：暗色核心、碎裂汇聚边缘、短促内吸笔触、独立定向粒子、折射和碎石回收。
- 赫：压缩亮核、短闪光、外射碎片、断裂冲击波、散逸粒子和残余扭曲。
- 茈：蓝红融合、压缩、暗色侵蚀通道、双色能量边缘、分层高速尾迹和压力波。
- 移除能量球的球面/Fresnel高光着色；降低Bloom（正常0.26，减少动态0.10），展示台改为哑光。未修改角色几何、材质、六动作、时间轴、相机调度、UI或音频。
- 新增只读特效诊断，验证取消/收招后所有层、灯光与扭曲复位；低画质粒子270→90。

## 一次免费角色尝试

本机安装记录及常见程序/用户资产目录未发现VRoid Studio或现有VRM/VROID。仅下载并测试一个明确CC0的beta样例 **HairSample_Male**；[来源与许可](public/models/candidates/fast-track-hairsample-male.LICENSE.md)随候选保存。VRM共18,947,896字节，Git LFS管理；SHA256 `4af2194f90ba846f3b13c00b50b14262419062d2171d17de922bcce2f89979c7`。

实际使用three-vrm/MToon生成8张浏览器截图：正、侧、45°、脸、手的两个方向、肩部90°/120°。有完整humanoid映射，无内置动画。脸部比旧粗模连贯、头发分束完整，但仍是年轻默认脸、黑发白色卫衣；掌指近景偏扁、棱角明显，手姿未通过施法验证。未对其做新的拓扑/权重改造，也未编造六动作/眼罩接入。

对本项目目标的静态观察评分：Face 6、Hair 6、Body 6、Hands 5、Shoulder 5、Overall 5。整体分不取平均：默认青年休闲剪影、服装和年龄感不满足目标；这些静态分也不是动画批准。故候选仅留作参考，不替换正式角色，不扩大搜索或重建。运行时依然只使用原角色的一套眼睛和眼罩。

## 真实证据与验证

对照页：`output/playwright/fast-track/report.html`，可通过 http://127.0.0.1:5173/output/playwright/fast-track/report.html 打开。包含5组旧/新同机位技能截图、VRM实测及原始JSON。所有图片都是实际浏览器渲染。

- `npm test`：14/14通过。
- `npm run check`、`npm run build`：通过；仍有Three.js分包>500kB提示。
- `node scripts/test_fast_track.mjs`：通过。三技能各完整两次、重复触发拦截、镜头恢复、逐一取消、揭/戴眼罩、低画质/减少动态、窄屏、触屏按钮、加载失败重试。
- 暖机后资源稳定：48 geometries / 25 textures。1920×1080 Edge无头第二轮三技能快照均约240 FPS；这是暖机快照，不是逐帧最低性能或前台设备保证，初次shader编译卡顿未纳入该值。
- 15个历史二进制资产及Snow源文件哈希均未变，生产active映射未变。

复现截图：`node scripts/capture_fast_track.mjs --label after`；复现VRM查看：`node scripts/audit_fast_track_vrm.mjs`；回归后生成对照：`node scripts/report_fast_track.mjs`。旧版before截图在修改前采集，重采旧版需要先在独立目录检出基线，不能用当前源码覆写before冒充旧版。

限制：旧模型的玩具脸、锥束头发和块状肩部仍存在；新VFX并未修复这些缺陷。本轮是技能视觉改进交付，不是“完成高质量新角色”的声明。VRM依赖仅供开发验收，不进入当前正式应用包。
