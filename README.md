# LIMITLESS · 五条悟

Blender 角色资产与 Three.js 本地交互展示台。包含眼罩 / 六眼切换和「苍、赫、茈」三段技能演出。正式角色仍是未通过视觉验收的旧版；重建候选使用许可明确的基础网格，状态见 `VALIDATION.md`。

## 打开网页

Windows 下双击 **`start.cmd`**。启动器会打开浏览器，默认地址是 <http://127.0.0.1:4173/>；端口被占用时使用下一个端口。保持启动窗口运行，关闭窗口或按 `Ctrl+C` 停止服务。

需要 Node.js 20.19+，推荐 Node.js 24。已附带构建完成的 `dist/`，直接运行无需安装 npm 依赖或访问外部 CDN。不要直接双击 `dist/index.html`，浏览器需要通过本地 HTTP 服务加载 GLB。

## 操作

| 操作 | 方法 |
|---|---|
| 旋转角色 | 鼠标左键拖动 / 单指拖动 |
| 缩放观察 | 滚轮 / 双指缩放；拉近时观察中心会向面部移动 |
| 苍 / 赫 / 茈 | 按钮，或键盘 `1` / `2` / `3` |
| 中止演出 | `Esc` 或「中止演出」按钮 |
| 眼罩和六眼 | 左侧「揭开眼罩 / 戴上眼罩」 |
| 恢复初始观察角度 | 右侧回转箭头 |
| 音效 | 右侧扬声器；默认静音 |
| 画质 / 减少动态效果 | 右侧设置；流畅模式降低粒子、分辨率并关闭辉光 |

技能演出期间锁定自由镜头和其他技能，结束或取消后恢复原观察角度。后台标签页暂停动画和声音。声音由 Web Audio 实时合成，没有下载或使用原作配音、音乐。

## 工程与模型

- `blender/gojo.blend`：保留的旧版 Blender 5.2.1 源文件，46 根骨骼、6 个 Action。
- `public/models/gojo.glb`：保留的正式网页模型，4,406,920 字节、131,546 个三角形，无外部纹理依赖。
- `blender/candidates/gojo-hand-fit.blend`：未验收的手部替换候选，56 根骨骼；肩部、头部和服装仍为旧版。
- `scripts/build_character.py`：已改为候选导出入口，不再生成核心人物网格。
- `src/experience.ts`：加载、卡通材质、镜头、场景与碎石运动。
- `src/effects.ts`：能量球、旋涡粒子、冲击波和紫色能量轨迹。
- `src/timeline.ts`：技能状态与统一演出时间轴。
- `output/blender/`、`output/playwright/`：模型及网页验收截图。

GLB 为米制，Y 轴向上、正 Z 朝前、脚底位于原点。技能挂点为 `FX_Hand_L`、`FX_Hand_R`、`FX_Center`；`Blindfold` 父节点负责眼罩显隐。动画名称固定为 `Idle`（4 秒）、`CastBlue`（5 秒）、`CastRed`（4 秒）、`CastPurple`（8 秒）。网页按材质名称重建卡通材质，能量特效在网页运行时生成。

Blender 内保留预览相机与灯光。切换 Action 可以编辑动作；导出脚本只读取源文件，不保存或覆盖源工程。资产导入和手部拟合脚本是实验加工工具，会重写各自的隔离候选；人工编辑前应另存为新的制作源文件，不能再次拟合覆盖手工修改。

## 开发与重建

```powershell
npm ci --registry=https://registry.npmjs.org
npm run dev
npm run check
npm test
npm run validate:model
npm run build
```

开发预览默认 <http://127.0.0.1:5173/>。源码改动后运行 `npm run build`，`start.cmd` 才会加载最新构建。

旧的完整程序化角色生成器已停用。`build_character.py` 现在只转交已制作资产的候选导出；旧实现保存在 Git 基线 `3e6e5ab`，不得作为核心建模路线继续使用。

导出已制作的候选模型（不会覆盖正式资源）：

```powershell
& 'C:\Users\48749\AppData\Local\Programs\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 2 --python scripts/export_character.py -- --source blender/candidates/gojo-hand-fit.blend --output public/models/candidates/gojo-hand-fit.glb
node scripts/validate-model.mjs public/models/candidates/gojo-hand-fit.glb
```

其他电脑请替换 Blender 可执行文件路径。候选使用 MakeHuman 官方 CC0 基础网格，许可与固定版本记录见 `assets/licenses/makehuman/`。它尚未通过美术与变形验收，不是正式角色。

## 运行范围

主要验收环境为桌面 Chromium 浏览器（Chrome / Edge / Codex 内置浏览器）。提供手机宽度布局与触屏操作，实际帧率取决于设备；建议较弱设备使用「流畅」模式。

项目不含战斗 AI、角色移动或线上部署。角色为从零制作的同人风格化模型，不是官方模型。相关角色和作品归原权利人所有。

实际检查结果见 `VALIDATION.md`。
