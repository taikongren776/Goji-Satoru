# LIMITLESS v0.1.0-preview — 角色与技能交互预览

建议 Tag：`v0.1.0-preview`  
Target：`main`  
勾选 **Set as a pre-release**。本文件是发布草稿，尚未创建 Git 标签或 GitHub Release。

## 本次内容

- 白发、蓝眼、深色服装的动漫角色候选，保留可编辑 Blender 工程。
- 更接近动画宽幅轮廓的黑色布眼罩，支持揭开 / 戴上过渡。
- 自然分腿、一侧承重、另一侧轻微屈膝的放松站姿，施法收招与站姿衔接。
- 六段动画：Idle、CastBlue、CastRed、CastPurple、RevealEyes、CoverEyes。
- 苍、赫、茈的实时特效、镜头演出与合成音效；默认静音。
- 鼠标 / 触屏观察、数字键 1 / 2 / 3 施法、Esc 中止、画质与减少动态效果设置。
- Character Adapter、命名特效挂点、加载失败重试，以及真实浏览器截图和变形诊断脚本。

## 下载与启动

需要 **Git LFS + Node.js 20.19 或更新版本**（推荐 Node.js 24）。

```powershell
git lfs install
git clone git@github.com:taikongren776/Goji-Satoru.git
cd Goji-Satoru
git lfs pull
npm ci
```

Windows 双击 **`start-character-preview.cmd`** 打开最新角色预览。首次安装依赖需要网络；启动后通过本地网页操作。

也可执行 `npm run dev`，访问：

`http://127.0.0.1:5173/?character=/models/character-production/whitehair-preview.json`

注意：`start.cmd` / 默认生产构建仍使用保留的旧模型，不是本次新角色预览。源码仓库不包含 `node_modules`、`dist` 和本机生成的 `output`；这些可按文档重新生成。GitHub 自动生成的 Source code 压缩包是否带有完整 LFS 模型取决于仓库设置，推荐 Git 克隆后运行 `git lfs pull`。

## 主要资产

- `public/models/candidates/limitless-runtime.vrm`：带六段动画、眼罩与特效挂点的网页资产。
- `blender/candidates/limitless-runtime.blend`：可编辑骨架、网格与动画；已保存并重新打开验证。
- `public/models/candidates/limitless-runtime.LICENSE.md`：来源和许可记录。

VRM 使用二进制 glTF 容器及 VRM 扩展。Blender 默认 glTF 导入材质与网页 MToon 不完全一致。

## 验证与已知限制

- 14 项单元测试、类型检查及生产构建已通过；最近一次站姿更新后，连续施法、中止、互斥、镜头 / 特效复位、资源稳定、触屏及加载重试回归通过。
- 六段动画共 780 个帧样本完成变形检查；新站姿未检测到脚踝滑动，最低脚部顶点约距地面 0.4 mm。
- 保留赫动作的指缝拉伸警告，以及分腿姿势下裤裆短边的局部拉伸记录；不宣称全身蒙皮和碰撞无缺陷。
- 当前服装仍为连帽衫，脸部与发型尚非原作最终造型。眼罩摘戴采用抬升与淡出，不是布料模拟。
- 当前是本地交互预览，不含战斗 AI、角色移动、线上部署或最终美术验收。

最新候选基于 **VRoid Project / pixiv HairSample_Male（CC0）**；历史资产使用各自许可，见仓库来源记录。本项目为非官方同人展示，相关角色与作品权利归原权利人所有。
