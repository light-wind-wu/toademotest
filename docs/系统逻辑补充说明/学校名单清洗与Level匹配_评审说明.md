# 学校名单清洗与 Institution Level 匹配（评审版）

核对日期：2026-09-17。

本次仅清洗用户提供的学校名单及匹配现有三个 Institution Level，不修改申请资格、权限、筛选逻辑或生产数据。原始名单和《【03】Dictionary Management》均未覆盖。

## 1. 结果文件

[新加坡学校名单清洗与Level匹配.xlsx](../../outputs/institutions-20260917/新加坡学校名单清洗与Level匹配.xlsx)

Excel 包含两张表：

- **初始名单候选**：183 个去重后的候选条目。其中 172 个来自原名单清洗，11 个来自官方来源补充。均已填写建议 Institution Level，但仍需业务确认。
- **原始名单处理记录**：保留全部 1,238 个原始条目、原始行号、建议名称、处理结论、Level、历史名称对应的现名、重复标记、处理理由及参考来源。黄色列可填写确认结果和复核意见。

这是一份静态清洗快照。Excel 的业务确认列不会自动同步到 Dictionary MD 或系统，也不会自动改写其他工作表的决定。

## 2. 已确认的初始范围

- 位于新加坡的学校或办学校区。
- 中学及以上。
- 包含私立院校、国际学校及艺术院校。
- 小学不纳入本次初始名单。
- 对同时开办小学及中学的学校，可保留该学校，但仅赋予本次范围内的 Level。
- 不将“有海外大学合作学位课程”直接等同于“海外大学在新加坡设有校区”。

“新加坡范围”不代表本次已穷尽所有新加坡私立、国际或专门学校；本次以用户原名单为基础，并对明确发现的缺项作单独补充。

## 3. Level 匹配口径

使用 Dictionary MD 中已有的固定值，不新增枚举：

| 办学阶段 | 建议 Institution Level | 说明 |
|---|---|---|
| 中学阶段 | Secondary | 包括学校实际开办的中学课程。 |
| JC、MI、大学预科、IB Diploma、Polytechnic Diploma、ITE 等非学位阶段 | Post-Secondary (Non-University) | 国际学校的 G11–G12 需结合实际课程判断，不能只凭“High School”名称。 |
| 学士、硕士、博士等学位阶段 | University | 为 TOA 业务分类，不代表该机构法律身份一定是大学。 |
| 同一办学机构覆盖多个上述阶段 | 多个 Level | 不根据学校品牌、IP 标志或名称中的 University 一词直接决定。 |

### 具体例子

| 学校 | 建议 Level | 理由 |
|---|---|---|
| Nanyang Girls' High School | Secondary | MOE 列为 S1–S4；有 IP 不等于该校自身开办 JC。 |
| Raffles Institution | Secondary；Post-Secondary (Non-University) | MOE 列为 S1–JC2。 |
| NUS High School of Mathematics and Science | Secondary；Post-Secondary (Non-University) | 不是 University；按 MOE 的实际阶段匹配。 |
| Ngee Ann Polytechnic | Post-Secondary (Non-University) | Polytechnic。 |
| National University of Singapore | University | 大学。 |
| LASALLE College of the Arts / Nanyang Academy of Fine Arts | Post-Secondary (Non-University)；University | 文凭及学位阶段均覆盖。两所院校分别保留。 |
| PSB Academy / MDIS / SIM | Post-Secondary (Non-University)；University | 根据实际文凭及合作学位课程提出双 Level 建议，业务须确认采用“办学阶段”口径。 |

Level 不能直接代替申请人的 Education Level、实际课程或 Intern Category。一个学校有多个 Level，不代表每个学生都符合全部实习类别。

## 4. 清洗规则及处理结果

### 4.1 名称规范化

- 去除首尾空格，统一用于比对的大小写、标点和 Government/Govt 形式。
- 展示名称优先采用官方目录或院校名称。MOE 全大写名称转为可读大小写，保留 CHIJ、NUS 等缩写。
- 拼写修正及别名归并建议保留在原始记录中，不能作为无须确认的历史数据迁移指令。
- 同名重复标记不等于已确认是同一法人、校区或机构。

典型处理：

- `Eunioa Junior College` → `Eunoia Junior College`：拼写修正建议。
- `Laselle` → `LASALLE College of the Arts`：拼写归并建议，保留原始值供确认。
- `Kaplan Higher Education Institue` → `Kaplan Higher Education Institute`：仅修正拼写，不自动合并至 Academy。
- `School of the Arts Singapore (SOTA)` → `School of the Arts, Singapore`：统一学校展示名。

### 4.2 原始条目核对结果

下表以原始行计数，不是去重后的院校数量。各组互斥，总计 1,238 行。

| 处理结果 | 原始行数 | 后续处理 |
|---|---:|---|
| 建议纳入 | 219 | 合并为 172 个候选院校，等待业务确认。 |
| 暂不纳入：小学 | 183 | 本次初始范围外；保留原始记录。 |
| 暂不纳入：占位或非院校值 | 9 | 不生成学校下拉选项。 |
| 暂不纳入：培训或专业组织 | 33 | 不直接作为学历院校；需要时另行确认配置范围。 |
| 已识别的历史名称或已注销机构 | 15 | 保留历史记录，不直接初始化为 Active。 |
| 待核实 | 779 | 暂不纳入候选初始值，详见下表。 |
| 合计 | 1,238 | 所有原始条目均可追溯。 |

另发现 47 行同名重复（忽略大小写及首尾空格）；这些行已经包含在上述各组内，不能再加一次。

### 4.3 待核实项目

| 待核实类别 | 原始行数 | 未解决事项 |
|---|---:|---|
| 境外院校 / 本地校区 | 334 | 未逐一确认新加坡校区。不能声称这些条目全部已确定为境外。 |
| 办学范围 | 160 | 是否提供正式教育，是否仍注册，是否只是培训或认证机构。 |
| 旧名 / 所在地 | 131 | 当前名称、历史沿革或地理范围。未在 MOE 当前目录匹配不能证明已经关闭。 |
| 联合办学或多机构名称 | 74 | 应区分就读机构、学位授予机构和联合项目，不生成拼接院校。 |
| 名称 / 所在地 | 66 | 缺乏足够的身份及所在地证据。 |
| 记录粒度 | 5 | ITE 总称、大学下属学院等是否独立建档。 |
| 实体 | 5 | 品牌名、Academy/Institute、School 42 等对应实体。 |
| 所在地 | 2 | Auston Australia 等名称不能直接归并新加坡机构。 |
| 校区 | 1 | 原始 INSEAD 未指明校区，虽已核实新加坡校区存在，也不能覆盖原始历史记录。 |
| 名称 | 1 | Auston 旧称与当前机构名称的对应关系。 |
| 合计 | 779 | 本次只完成初筛，未完成全部身份核验。 |

对于这些条目，已填写的 Level 只是名称或已取得材料支持的建议。空白表示不适用或证据不足，不是默认最低 Level。

## 5. 官方补充候选

以下 11 项单独标为“官方补充”，未假装来自原始名单：

1. INSEAD (Singapore)
2. ITE College Central
3. ITE College East
4. ITE College West
5. Jurong Pioneer Junior College
6. Kaplan Higher Education Academy
7. Loyang View Secondary School
8. St Andrew's School (Secondary)
9. St. Margaret's School (Secondary)
10. University of the Arts Singapore
11. Yishun Innova Junior College

补充候选中也包含原名单旧校名对应的当前名称，并非 11 所全新学校。University of the Arts Singapore 与 LASALLE / NAFA 为大学与成员学院关系，不能按重复学校删除。

## 6. 需要优先确认的三件事

1. **私立及艺术院校的双 Level**：建议继续按 Dictionary MD 的“办学阶段”定义，将有文凭和学位课程的机构同时归入两个 Level。不是将这些机构认定为法定大学。
2. **记录粒度**：建议 ITE 使用三个 College；NIE、RSIS、TDSI 等大学下属机构先不要与大学并列启用，直到确认学校字段究竟记录大学还是学院。原始记录先保留。
3. **联合办学记录**：例如 `Singapore Institute of Technology/University of Glasgow`，先确认就读机构及授予学位机构的存储位置。不要直接创建一个带斜杠的新 Institution。

历史就读学校仍可能需要迁移。本次“不进入 Active 初始下拉”不代表删除历史学校，也不代表禁止历史记录展示。

## 7. 来源、覆盖及局限

- 用户原始名单：`pasted-text.txt`，1,238 个非空条目，无独立国家、地址、UEN 或校区标识。
- [MOE General information of schools](https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view)：337 个学校记录，覆盖 2026 年，更新日期 2026-04-17。按 `mainlevel_code` 映射，包括 158 个非纯小学记录。不涵盖完整私立及国际院校名单。
- [MOE Post-Secondary Education Overview](https://www.moe.gov.sg/post-secondary/overview?toggle-id=polytechnics)：Polytechnic、ITE、艺术院校及政府关联机构类型与课程层级。
- [ITE Colleges](https://www.ite.edu.sg/about-ite/colleges/) 及 [ITE Higher Nitec 课程](https://www.ite.edu.sg/course-finder/higher-nitec-in-electronics-engineering/)：三个学院及对应课程阶段。
- [SSG / TPGateway Deregistered PEIs](https://www.tpgateway.gov.sg/resources/information-for-private-education-institutions-(peis)/deregistered-peis)：核对已注销私立教育机构。注销 PEI 不一定代表该法人停止所有其他培训业务。
- [MOE 2019 JC 合并名称](https://www.moe.gov.sg/-/media/files/news/press/2018/named-of-jcs-merging-in-2019-annex-a.pdf)：合并前学校与现名关系。
- 其他院校课程及历史网页：逐项记录在 Excel 的参考来源列，包括 SUSS、LASALLE/NAFA、SIM、PSB、MDIS、BCA、Kaplan、INSEAD、OFS、UWCSEA 等。

本次使用公开目录和课程网页进行初始匹配，不是对全部私立院校注册有效性、所有海外校区或学历认可进行完整审计。查证日期也不等于官方数据实时更新日期。正式加载前，应确认名单及粒度，并对私立机构复核当前注册情况。

## 8. 与 Dictionary MD 的关系

《【03】Dictionary Management》中的三个 Level、字段结构与配置行为保持不变。本次结果只作为待确认的初始数据附件。

下一步在名单和上述三项口径确认后，再将批准后的学校名单及 Level 写入正式 MD；当前不把“学校名单及 Level 已全部解决”标记为完成。Institution Code 规则和字段最大长度也不在本次清洗中擅自确定。
