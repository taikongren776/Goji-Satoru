# LIMITLESS A6 · 资产路线最终决策

2026-10-17 · 仓库基线 `330722c` / `character-rebuild`。

**推荐：SNOW + PROFESSIONAL CHARACTER ARTIST。停止点：OPTION B，等待用户决定是否委托专业角色美术进行肩袖与双手试作。**

这是制作路线推荐，**不是最终资产批准**。Snow有可检查的面、手、肩结构和明确授权，足以作为专业人工制作的起点；成年日漫造型、高领长袖、握拳/对掌和实时变形仍未完成。没有任何角色被准入，**Milestone A — BLOCKED BY ART ASSET QUALITY** 保持不变。

## 两路线决策矩阵

不设总分或加权平均。`INSUFFICIENT EVIDENCE`意味着未获证据，不意味着合格，也不自动意味着资产有缺陷。最终仅比较PolyOne和Snow，CC3+历史记录保留但不参与本次决策；没有新增候选。

| 指标 | PolyOne | Snow |
|---|---|---|
| License certainty | Superhive指示CC BY4.0；交付包与部件授权未实检，其他渠道不可混用 | 已存官方来源、原包和CC BY4.0全文；允许衍生GLB，须署名/链接/变更记录 |
| Source quality | 只有作者图/声明，源文件未取得：PURCHASE REQUIRED FOR VERIFICATION | 原始v4.2 blend实际读取、源哈希留存；可编辑，但不是最终目标角色 |
| Face topology | 图中有环线；严格侧脸/控制网格细节不足 | 实检眼口环线及三维鼻唇下颌；需要成年日漫重塑 |
| Hand topology | 五指远景可见，掌背/指缝/指根细节不足 | 连续掌指、指节环线和指甲轮廓存在；近景还需精修 |
| Thumb | 对掌/甲床/指根变形：INSUFFICIENT EVIDENCE | 鱼际和拇指基底可见；对掌及握拳尚未验证，不能套用旧手修复结论 |
| Shoulder topology | A Pose轮廓和骨架图；局部边流未核验 | 可编辑人体肩部及连续作者短袖，已看线框；目标制服须另作 |
| Deformation readiness | SHOULDER DEFORMATION UNKNOWN；无合格拳态演示 | 原生部分抬臂已测；腋下凹痕仍在；LBS转换尚未解决 |
| Rig quality | 骨架布局可见，轴/权重/修正未知 | 专业原生控制体系可检查；DQ/B-bone/Lattice等增加实时转换成本 |
| UV | 作者UV示意；源布局/重叠未测 | 源UV存在；新部件要重展，UDIM路径/网页适配待处理 |
| Material readiness | 包内贴图与实际GLB未知 | 原材质槽存在，但skin UDIM加载警告；目标动漫材质未制作 |
| Anime suitability | 健壮硬朗的西式男性，不能直接当日漫目标 | 青年西式比例，也不是目标；可编辑结构便于人工重塑 |
| Gojo / Satoru adaptation potential | 潜在可用，关键变形证据不足 | 有证据支持专业改造起点；面发制服仍需大量原创制作 |
| Evidence quality | A5作者图12张；A6补查没有取得关键动态证据 | A5原文件统计/20张真实图，加A3实际有损导出对照与失败记录 |
| Additional art effort | HIGH–VERY HIGH（预估）；不确定源质量可能进一步增加，低价不代表低总成本 | VERY HIGH，已分解12类任务，未编造金额/工期 |
| Risk | 采购前无法确认正好对应历史失败点；交付渠道许可需锁定 | 工作范围大、手势未验、LBS重绑/修形成本高；需要专业美术承接 |
| Overall | **WAITING FOR SELLER EVIDENCE / NOT APPROVED** | **ARTIST CUSTOMIZATION RECOMMENDED / NOT FINAL ASSET APPROVED** |

## 为什么选择这条路线

Snow的优势是已经能检查真实源网格、边流、原生变形和失败处，能够向美术师提出具体任务。它避免把预算先投到一个尚未证明手肩变形的付费资产上。推荐不依赖免费或品牌，也不意味着当前自动化环境能把Snow自动加工成最终角色。

主要代价是 **VERY HIGH** 的专业美术工作量。A3简化LBS探针相对原生最大偏差可达约31.53mm，已有证据反对“直接导出就可以”。因此首先委托有动漫角色、服装、手部和实时蒙皮经验的美术做小范围试作；该试作的报价/排期仍需对方评估。若用户不愿投入专业制作，两条路线都不能靠现有自动化保证达到目标，应继续保持阻塞，不能恢复旧生成器。

PolyOne不被判REJECT，但当前不足以成为BUY CANDIDATE。用户可选择自己发送询问，获得证据后再比较；本轮不联系作者、不买、不以验证为由支付。没有理由因两者尚未最终准入就扩大搜索：Snow的专业制作路线并未被判失败。

## 交付与证据索引

- [PolyOne售前证据](asset-candidates/polyone-presale-evidence.md)：查过的渠道、公开资料边界、未知和门槛。
- [PolyOne英文询问模板](asset-candidates/polyone-presale-questions.md)：可复制，未发送。
- [Snow工作量与风险](asset-candidates/snow-production-assessment.md)：分工、定性成本、原生→实时风险。
- [Artist Production Brief](artist-production-brief.md)：可交美术师估价；六项中性渲染最低7/10。
- [A5真实图报告](../output/milestone-a5/report.html)、[A3失败/对照报告](../output/milestone-a3/report.html)。这是沿用旧证据，A6没有新模型、新渲染或新变形修复。
- [A6校验记录](asset-candidates/evidence/a6-validation.json)：本轮实际文档/证据/资产保护检查，不是美术PASS。

## 当前完成范围与用户决定

已完成：限定两路线的公开尽调、源证据复核、卖家询问草稿、工作量/风险评估、路线比较、制作简报及文档交付校验。

未完成：肩袖新试作、Snow拳态/对掌验证、成年比例/面发制服制作、最终实时骨架和六动作、最终角色美术批准。没有购买、付款、付费注册、卖家联络或委托。

受阻：当前没有获用户确认的专业美术制作资源；自动化工具不能替代该角色的精细人工造型。所有正式资产、UI、VFX、动画和适配器保持原状，历史退化面FAIL不删除。

**现在需要用户决定：是否采用Snow路线，并委托专业角色美术先制作肩袖与双手的独立试作。** 同意路线不自动授权任何报价、付款或外部联系。可先由用户提供拟合作美术师/作品集和试作预算供评估；若选择PolyOne，则先由用户决定是否发送现有售前清单。按A6要求，本轮在此停止，不进入B–E。
