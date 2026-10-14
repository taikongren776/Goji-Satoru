# LIMITLESS · 五条悟

使用 Blender 从零制作的风格化五条悟模型，以及 Three.js 驱动的本地交互展示台。包含眼罩 / 六眼切换和「苍、赫、茈」三段技能演出。

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

- `blender/gojo.blend`：Blender 5.2.1 源文件；角色网格、材质、38 个骨骼、四个 Action 和预览灯光均可编辑。
- `public/models/gojo.glb`：网页模型，约 790 KiB、18,665 个三角形，内嵌材质和骨骼动画，无外部纹理依赖。
- `scripts/build_character.py`：完整的确定性建模、绑定、动画和导出脚本。
- `src/experience.ts`：加载、卡通材质、镜头、场景与碎石运动。
- `src/effects.ts`：能量球、旋涡粒子、冲击波和紫色能量轨迹。
- `src/timeline.ts`：技能状态与统一演出时间轴。
- `output/blender/`、`output/playwright/`：模型及网页验收截图。

GLB 为米制，Y 轴向上、正 Z 朝前、脚底位于原点。技能挂点为 `FX_Hand_L`、`FX_Hand_R`、`FX_Center`；`Blindfold` 父节点负责眼罩显隐。动画名称固定为 `Idle`（4 秒）、`CastBlue`（5 秒）、`CastRed`（4 秒）、`CastPurple`（8 秒）。网页按材质名称重建卡通材质，能量特效在网页运行时生成。

Blender 内保留了预览相机与灯光，默认待机姿势、佩戴眼罩。切换 Action 可以编辑施法动作；重新运行建模脚本会重建源文件，因此手工修改后请另存新文件。

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

重新生成 Blender 模型和预览图：

```powershell
& 'C:\Users\48749\AppData\Local\Programs\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/build_character.py
npm run validate:model
npm run build
```

其他电脑请替换 Blender 可执行文件路径。模型生成不依赖 Blender MCP 连接、在线生成服务或第三方角色模型。

## 运行范围

主要验收环境为桌面 Chromium 浏览器（Chrome / Edge / Codex 内置浏览器）。提供手机宽度布局与触屏操作，实际帧率取决于设备；建议较弱设备使用「流畅」模式。

项目不含战斗 AI、角色移动或线上部署。角色为从零制作的同人风格化模型，不是官方模型。相关角色和作品归原权利人所有。

实际检查结果见 `VALIDATION.md`。
