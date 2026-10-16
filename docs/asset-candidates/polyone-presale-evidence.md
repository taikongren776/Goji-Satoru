# A6 · PolyOne 售前证据报告

2026-10-17 · 基线 `330722c` · **WAITING FOR SELLER EVIDENCE / NOT APPROVED**。

结论：仍缺少本项目最重要的手与肩的动态证据，不推荐现在付款。源文件实检状态为 **PURCHASE REQUIRED FOR VERIFICATION**（除非卖家另行提供授权评估包）；本轮没有购买、下载付费包、注册服务或联系作者。

## 调查范围与来源

只调查 PolyOne Studio 的 **Base Mesh Pack - Stylized Male (Rigged)**，没有把作者其他角色、手部包或动作包的展示当成本产品的证据，也没有新增候选。

| 来源 | 本轮取得的信息 | 证据边界 |
|---|---|---|
| [Superhive 产品](https://superhivemarket.com/products/base-mesh---stylized-male) | 页面仍列 Blender/FBX/MA、UV、rigged、全四边形；显示 US$8 | 是作者声明和网页标价，非实际文件检查，也非含税报价 |
| [平台许可说明](https://superhivemarket.com/page/creative-commons-license) | 产品链接指向 CC BY 4.0 说明 | 交付包及各部件授权尚未实检 |
| [作者 ArtStation 产品](https://polyonestudio.artstation.com/store/3LYLv/base-mesh-pack-stylized-male-rigged) | 同名产品与图片/文件列表 | A5已记录其 Standard Use License；不能套用另一渠道的CC许可 |
| [作者官网](https://polyonestudio.com/) | 产品分类和官方渠道链接 | 读取的主页没有本产品关节变形实录 |
| [作者 YouTube](https://www.youtube.com/@Polyone-studio) | 确认产品页链接的频道地址 | 文本抓取只返回页面框架；未观看到合格演示，不能断言频道没有视频 |
| [同款 Fab 页面](https://www.fab.com/listings/97d79475-c36b-4bc2-8ec5-111832626445) | 图集与文件格式信息，含平台转换格式标签 | 未取得文件；“Converted GLB”不证明含正确蒙皮/动画，不作为Superhive交付内容承诺；未选择其许可 |
| [同款 Sketchfab 页面](https://sketchfab.com/3d-models/base-mesh-pack-stylized-male-rigged-9b050cad4ff8472c94301c7d0858fa38) | 搜索索引有同名作者产品；直接读取403 | 未操作3D查看器、未获取网格；无新增可核验变形证据 |

定向查询记录：`"PolyOne" "stylized male" rig deformation hands`、`"polyonestudio" "stylized male" shoulder video`、`site:youtube.com "PolyOne" male rig`、`"base mesh" "stylized male" "PolyOne" thumb`；补查 `site:youtube.com/@Polyone-studio "male"` 以及该产品的 `deformation / fist / rig demo`。结果包含同名商品页及无关结果，未取得对应的90°/120°抬臂、握拳、对掌演示。无关模型、来源不明下载站未作为证据。

这是有范围的公开尽调，不是对全网不存在演示的证明。新页面的文本/格式标签不能补齐A5图像缺项。

## 逐项证据与未知

视觉依据复用 [A5候选记录](candidate-01.md) 和 [实际截图报告](../../output/milestone-a5/report.html)：12张作者图片已在真实浏览器检查，位于 `output/playwright/milestone-a5/polyone-gallery-1.png` 至 `12.png`，精确来源在 [web-sources.json](evidence/web-sources.json)。这些是卖家宣传素材，**不是本地源模型渲染**。A6没有把网页图集数量变化解释为新增变形实测。

| 检查 | 可观察到的内容 | 判定 / 还缺什么 |
|---|---|---|
| 面部正面、斜面 | 鼻梁、鼻尖、口唇、下颌有三维体积；成人硬朗、西式风格 | 有重塑潜力；严格侧脸、鼻底/耳后/眼睑闭合：**INSUFFICIENT EVIDENCE** |
| 面部线框 | 可见眼口环线、眼球和口内构件 | 叠线不能核定极点、焊接、所有面类型；需正交局部控制网格 |
| 五指独立 | 远景张手能看见五指与伸出的拇指 | 指缝、指根、掌弓、甲床、指甲是否仅贴片、腕部连接：**INSUFFICIENT EVIDENCE** |
| 手部动态 | 未取得符合要求的演示 | 张手近景、握拳、半握拳、拇指对掌及腕旋转全部未验证 |
| 肩部静态 | A Pose三角肌轮廓有体积，骨架图含锁骨/上臂 | 静态不能证明胸肩、腋下抬臂连续性 |
| 肩部动态 | 无可核验90°/120°抬臂证据 | **SHOULDER DEFORMATION UNKNOWN**；肩峰塌陷、腋下拉裂、弯肘均未知 |
| 肩袖 | 当前图不是目标高领长袖制服 | 衣物袖窿/袖山需要另做；即使皮肤通过也不能判制服通过 |
| Rig / weights | 骨架示意有躯干、四肢、手指 | 轴向、权重、LBS≤4、修正形态、面部rig及烘焙依赖：**INSUFFICIENT EVIDENCE** |
| UV / GLB | 有UV示意；跨平台列出转换格式 | UV重叠、纹理完整性、逆绑定矩阵、动画实际导出未检 |

没有打美术分。`rigged`、`quads`、低价或“适合游戏”的宣传不能替代本项目失败点的证据。

## 许可边界与卖家证据门槛

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)允许商业修改和再分发，要求署名、链接、变更说明，不得追加限制原许可权利的条款。这里的判断仅针对Superhive页面指示的许可；仍需确认具体交付包、第三方部件及纹理的覆盖范围。基础网格授权不等于取得五条悟角色设计的权利。

下一步清单见 [可直接复制的英文询问](polyone-presale-questions.md)，**未发送**。需要收到：手/肩/肘/脸控制线框、严格侧脸；张手/握拳/对掌及90°/120°抬臂视频；骨骼/权重/修正说明；文件清单与完整许可，明确浏览器公开可下载的衍生GLB和项目内可编辑源交付。

若上述证据充分且无关键缺陷，才可更新为 `BUY CANDIDATE`，由用户另行决定购买；购买候选仍不等于最终资产批准。若需要源文件才能判定，则保留 `PURCHASE REQUIRED FOR VERIFICATION`，不以付费赌验证结果。当前没有证据支持 `REJECT`，也没有证据支持 `BUY CANDIDATE`。
