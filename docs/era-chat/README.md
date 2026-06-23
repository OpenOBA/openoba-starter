# ERA-Chat 总览

> OpenOBA 最不一样的地方：AI 执行官住在 ERA-Chat 里，能**读自己的代码、改自己的代码、运营自己的业务**——这套能力建立在 **7 项发明专利**之上

## ERA-Chat 是什么

ERA-Chat 是 OpenOBA 内置的对话界面（前端路由 `/chat`，菜单标题"ERA-Chat"）。它不是普通的 AI 聊天框，而是一个 **自指（self-referential）的执行环境**——里面的 AI 执行官（Agent）通过 ReAct 推理循环调用工具，可以：

- **读自己的代码**：通过 Meta-Mirror 自动扫描项目的 Entity/API/DTO/规则/约定，注入到 Agent 上下文
- **改自己的代码**：通过 `file-edit` skill 编辑源文件，改完自动跑 `tsc-check` 验证，形成"修改→编译验证→错误反馈→自动修正"闭环
- **运营业务**：通过 18 个内置 skill 查询/写入/导入/导出/分析业务数据，覆盖商品/上架/销售/履约/客服/分析六大业务引擎
- **记住教训**：工具调用失败时自动记录错误，任务完成后自我审查提取教训，下次自动避免重复犯错
- **交付产物**：改动打包成 Deliverable（含 changelog + 文件清单 + 版本），人工 Review 后发布

这就是 OpenOBA 在开源生态里的差异化定位：**不是 AI 辅助开发，是 AI 自己开发自己**。

## 与传统 AI 助手的区别

| 维度 | 普通 AI 助手（ChatGPT/Copilot） | OpenOBA ERA-Chat |
|------|-------------------------------|-------------------|
| 上下文 | 你手动粘贴代码 | Meta-Mirror **自动扫描**注入 |
| 输出格式 | 依赖 Prompt 约束，常失败 | Action Guard **四格式自适应解析**（FC/JSON/XML/文本） |
| 工具调用 | 并行全量执行，可能做无用功 | **每轮单工具**，基于真实结果再决策 |
| 改代码 | 你复制到 IDE 里 | AI 直接 `file-edit` 改，自动编译验证 |
| 错误处理 | 报错给你看 | AI **自我纠错**，错误自动转为记忆 |
| 交付 | 对话记录 | 结构化 **Deliverable**（可版本化、可审批） |
| 安全 | 无约束 | SOUL 铁律 + 三重数据库校验 + 四层防线 |
| 记忆 | 无（每次从零开始） | 数据库化持久记忆 + 按作用域精准注入 |

## 七层专利架构

ERA-Chat 的"自开发自运营"能力由 7 项发明专利协同支撑，从下到上构成完整栈：

```
┌─────────────────────────────────────────────────────────────┐
│  L7 · 六引擎协同运营（P07）                                   │
│  商品/上架/销售/履约/客服/分析 — 单 Agent 全业务闭环          │
├─────────────────────────────────────────────────────────────┤
│  L6 · Agent 记忆与自进化（P06）                               │
│  错误→记忆转化链 · 按作用域精准注入 · 版本化生命周期          │
├─────────────────────────────────────────────────────────────┤
│  L5 · Meta-Mirror 自省引擎                                    │
│  扫描 Entity/API/DTO/规则/约定 → 知识库 → 精准上下文注入      │
├─────────────────────────────────────────────────────────────┤
│  L4 · SOUL 人格系统                                           │
│  身份 + 能力边界 + 铁律三层约束（securityClearance/canEditCode）│
├─────────────────────────────────────────────────────────────┤
│  L3 · ReAct 单工具决策（P03）                                 │
│  每轮一个工具 · 三层思考事件 · 五类SSE · 四层防线             │
├─────────────────────────────────────────────────────────────┤
│  L2 · Action Guard 协议转换（P02）                            │
│  四格式自适应解析 · 三级校验 · 输出清洁 · 一键回退            │
├─────────────────────────────────────────────────────────────┤
│  L1 · ERDL 规则与数据操作（P01 + P04）                        │
│  五层语义模型 · 热替换 · 三向翻译 · 编译验证闭环              │
└─────────────────────────────────────────────────────────────┘
```

### L1 · ERDL 规则与数据操作（P01 + P04）

**专利**：P01 企业资源定义语言、P04 语义字段映射数据库操作

ERDL 是整个系统的语义地基，用 YAML 声明企业数据结构，让 AI 可读可写可安全操作。

**五层语义模型**（P01）：

| 层 | 作用 | 示例 |
|----|------|------|
| **Entity** | 实体与物理表映射 | `ProductSku` → `product_sku` 表 |
| **Relation** | 实体间关联 | ManyToOne / OneToMany / ManyToMany |
| **Rule** | 校验与策略规则 | `effect_required: skinToneEffect 不可为空` |
| **Alias** | 行业术语双向映射 | `"售价" ↔ retailPrice` |
| **Action** | LLM 可执行操作 | `erdl_crud_create` / `file_edit` |

**核心技术机制**：

1. **零停机热替换**（P01）：文件监听器检测 `.erdl` 变化 → SHA256 哈希对比 → 原子替换（先注销旧 AST 再注册新 AST），无需重启
2. **13 项语义校验**（P01）：解析前静态检查实体引用存在性、字段引用存在性、操作符合法性（eq/ne/gt/gte/lt/lte/in/contains/match/exists）、validate 动作完整性等，校验失败拒绝加载
3. **三向翻译**（P01/P04）：LLM 行业术语 → 别名层映射为语义字段名 → 实体层映射为物理列名 → 拼接参数化 SQL。例："售价" → `retailPrice` → `retail_price` → `VALUES (?)`
4. **三重安全校验**（P04）：白名单校验（Entity 已注册）→ 禁止表校验（黑名单）→ 只读保护校验（readonly 标记），任一失败立即终止
5. **编译验证闭环**（P01）：`file-edit` 改完文件后**自动调用 TypeScript 编译器**，编译结果内嵌在工具返回值里——通过则 Agent 确认完成，失败则 Agent 根据错误信息（文件路径/行号/错误代码）自我修正后重试，循环直至通过
6. **DTO 一致性审计**（P01）：自动扫描 Controller 的 `@Min`/`@Max`/`@IsNotEmpty`/`@IsEnum` 注解，与 ERDL 规则逐字段交叉比对，输出 5 态审计报告（OK/ERDL_STRICTER/CODE_STRICTER/ERDL_MISSING/CODE_MISSING）
7. **精准上下文注入**（P01）：Skill 定义中的 `mirror_refs` 声明需要的 entities/apis/rules，注入器只提取声明范围内容，相比全量注入**节省约 90% Token**

> 💡 **为什么不用 Text-to-SQL？** P04 专利明确指出 Text-to-SQL 的致命缺陷：LLM 可能编造列名、可能拼入恶意输入造成注入、无法在执行前结构化校验。OpenOBA 用**确定性四步翻译链**（别名→语义名→物理列名→参数化 SQL）替代概率性方案，每一步都是 O(1) 查表，从根本上消除字段编造和 SQL 注入。

### L2 · Action Guard 协议转换（P02）

**专利**：P02 基于意图解析的 AI 输出协议转换方法

Action Guard 是 LLM 原始输出与系统执行之间的**统一协议转换层**，解决"LLM 输出格式不可预测"这一行业痛点。

**四模块流水线**：

```
LLM 原始输出（任意格式）
 │
 ▼
① Intent Parser    四格式自适应解析（FC > JSON > XML > 文本）
 │
 ▼
② Action Validator 三级校验（定义查证 → 别名映射 → 完整性校验）
 │
 ▼
③ Action Router    Action → Service 路由执行
 │
 ▼
④ Output Cleaner   剥离 <invoke> 标签，保护前端
 │
 ▼
确定性系统执行
```

**核心技术机制**：

1. **四格式自适应解析**（P02）：同一套系统同时支持原生 Function Calling、JSON 代码块、XML `<invoke>` 标签、纯文本意图。当一种格式未命中自动尝试下一种，按 FC > JSON > XML 优先级去重
2. **三级校验**（P02）：定义查证（Action 是否注册）→ 别名映射（"框型" → `shapeCode`）→ 完整性校验（必填/枚举/类型）。校验失败的结构化错误信息回传 LLM 重试
3. **输出清洁**（P02）：用正则 `<invoke[\s\S]*?<\/invoke>` 剥离 LLM 文本中的协议标签，用户永远看不到系统内部细节
4. **一键回退**（P02）：环境变量 `ERDL_ACTION_GUARD=false` 即时关闭整个转换层，回到传统 FC 路径，无需代码回滚或重新部署

> 💡 **核心理念**："软输入、硬校验"——LLM 可以以任意格式输出操作意图（软输入），但 Action Guard 确保只有经过完整校验的操作才会被实际执行（硬校验）。这从根本上解决了"Prompt 约束 LLM 行为不可靠"的痛点。

### L3 · ReAct 单工具决策（P03）

**专利**：P03 AI Agent 的思考-行动-观察循环决策方法

这是 Agent 的核心决策机制，区别于主流的"并行工具调用"。

**核心创新：单工具限制策略**

每轮决策循环**只执行一个工具**（`actions[0]`），即使 LLM 请求了多个工具调用。执行完成后立即将结果回填对话上下文，LLM 在下一轮基于真实结果重新决策。这避免了"并行全量执行"的根本缺陷——LLM 在没看到前一个工具结果时就决定了后续工具参数，可能执行无用操作。

**四层防线**（P03）：

| 防线 | 机制 | 防什么 |
|------|------|--------|
| Token Budget 截断 | 超阈值时截取最近若干轮 + 插入摘要 | 上下文超限 |
| 用户中止检测 | 响应 AbortSignal 外部信号 | 用户主动停止 |
| 死循环检测 | 连续若干轮相同工具+相同参数 | Agent 卡死 |
| 软上限 | 超过预设轮次强制退出 + 生成摘要 | 无限循环 |

**五类 SSE 事件**（P03）：`thought`（推理）→ `tool_start`（行动开始）→ `tool_end`（行动完成，含耗时）→ `observation`（结果观察）→ `round_done`（本轮结束）。前端按时间序流式渲染，用户实时追踪完整推理链。

**三层思考事件生成**（P03）：优先级 `reasoning_content`（DeepSeek 思维链）→ `content`（普通回复）→ 前端降级（工具名+参数生成标签），确保任何模型下推理链可视化不中断。

### L4 · SOUL 人格系统

SOUL 为每个 Agent 构建三层约束（非专利，但整合了专利层的安全边界）：

| 层 | 内容 | 来源 |
|----|------|------|
| **身份** | agentCode / agentName / agentType / securityClearance | `AgentIdentity` |
| **能力** | tools（可用工具列表）/ canWrite / canEditCode | `RoleCapability` |
| **铁律** | 系统铁律 / 角色铁律 / 任务铁律 | `IronRuleSet`（system/role/task） |

低权限 Agent 根本看不到 `file-edit` skill；高权限 Agent 改代码也受铁律约束（禁止改 `.env`、禁止 `rm -rf` 等）。

### L5 · Meta-Mirror 自省引擎

Meta-Mirror 让 AI **读自己的代码**，是自指架构的认知基础：

| 扫描器 | 扫描什么 | 生成什么 |
|--------|---------|---------|
| `entity.scanner` | TypeORM Entity 类 | 实体索引（字段/关系/注释） |
| `api.scanner` | Controller 路由 | API 清单（路径/方法/参数） |
| `dto.scanner` | DTO 类 | 数据结构定义 |
| `rule.scanner` | ERDL 规则文件 | 规则索引 |
| `module.scanner` | NestJS 模块 | 模块依赖图 |
| `erdl-audit.scanner` | 规则与 DTO 一致性 | 5 态审计报告（P01 机制） |

扫描结果注入每个 Agent 的上下文，AI 能说出"我可以通过 `InventoryService.lowStockQuery()` 查低库存"，因为它**扫到了**这个 API。

### L6 · Agent 记忆与自进化（P06）

**专利**：P06 AI Agent 的持久记忆与自进化方法

这是让 Agent **不重复犯错**的关键机制，传统 AI 每次会话从零开始，OpenOBA 的 Agent 会积累教训。

**核心创新：错误到记忆的自动转化链**

```
工具调用失败
  ↓
agent_error_log 记录错误详情
  ↓
任务完成后触发自我审查
  ↓
LLM 读取推理轨迹 + 错误记录
  ↓
提取教训 → 创建 agent_memory
  ↓
建立记忆到错误/任务的关联
  ↓
下次同类任务 → 记忆自动注入 System Prompt
```

**记忆结构化字段**（P06）：

| 字段 | 说明 | 示例 |
|------|------|------|
| `category` | 类别 | lesson / rule / discovery / preference |
| `severity` | 优先级 | block / warning / info / success |
| `scope` | 作用域 | global / task_type / entity / agent |
| `scope_value` | 作用域值 | `product_listing` |

**精准注入**（P06）：按 `scope + scope_value` 过滤，每次会话只注入 **≤8 条**相关记忆，按 severity 排序，在 Token 消耗和知识覆盖间取得平衡。

**版本化生命周期**（P06）：修改记忆时创建新版本，旧版本标记 deprecated 并建立版本链。记忆自动经过 `active → stale（30天）→ archived（90天）` 生命周期。

> 💡 **效果**：Agent 第一次创建 SPU 时编造了编码导致失败，自我审查后生成记忆"SPU 编号必须使用真实标准编码"。下次商品上架任务启动时，这条记忆被注入，Agent 会先查询可用结构标准再创建。

### L7 · 六引擎协同运营（P07）

**专利**：P07 基于 AI 的眼镜行业多主体协同运营系统

这是"自己运营自己"的业务层实现——单一 Agent 配备全业务工具集和行业全局知识，自主驱动企业完整运营闭环。

**六大业务引擎**（P07）：

| 引擎 | 职责 | 典型任务 |
|------|------|---------|
| **商品引擎** | SPU/SKU 创建 + 色彩开发 + 美学校验 | "上架春季新品" |
| **上架引擎** | 定价 + 库存 + 渠道同步 | "给这批镜架定价并上架" |
| **销售引擎** | 推荐 + 订单 + 镜片锚定 | "给 VIP 客户推荐新品" |
| **履约引擎** | 分单 + 库存锁定 + 物流 | "处理今天的待发货订单" |
| **客服引擎** | 售后 + 退款 + 关怀 | "处理这批退货申请" |
| **分析引擎** | 销售分析 + 库存预警 + 用户洞察 | "生成本月经营分析报告" |

**任务状态机**（P07）：`pending → analyzing → executing → reporting → completed`，失败分支：`failed → retrying（3 次）→ escalated（人工）`。每步操作记录到 `cognitive_log`，完整可追溯。

## 一次"自开发"的完整流程

以"在客户表加一个'生日'字段"为例，展示七层架构如何协同：

```
You: 在客户表加一个"生日"字段

[L3 ReAct 第1轮]
  [L5 Meta-Mirror] 上下文已注入 Customer Entity 结构
  [L2 Action Guard] 解析 LLM 输出 → ParsedAction{erdl_crud, read, Customer}
  [L3 单工具] 执行 erdl_crud read → Observation: Customer 无 birthday 字段

[L3 ReAct 第2轮]
  [L2 Action Guard] 解析 → ParsedAction{file_edit, replace, customer.entity.ts}
  [L3 单工具] 执行 file_edit replace
    [L1 编译验证闭环] 改完自动跑 tsc --noEmit → 0 errors
  → Observation: 文件已更新 + 编译通过

[L3 ReAct 第3轮]
  [L2 Action Guard] 解析 → ParsedAction{git_diff, stat}
  [L3 单工具] 执行 git_diff → Observation: + birthday?: Date;

Agent: 已添加 birthday?: Date，类型检查通过。
       Diff 已打包为 Deliverable #v1，请 Review 后发布。
```

## 安全边界：四道防线

"AI 能改自己的代码"听起来危险，OpenOBA 用四道防线约束（整合了专利层机制）：

| 防线 | 机制 | 专利来源 |
|------|------|---------|
| **1. SOUL 铁律** | securityClearance + canEditCode + 铁律文本 | L4 |
| **2. Skill 权限白名单** | `file-edit` allowPatterns: src/skills/erdl/packages | L1 |
| **3. 三重数据库校验** | 白名单 + 禁止表 + 只读保护 | P04 |
| **4. Deliverable 审批流** | AI 改完打包，必须人工 Review 才发布 | — |
| **5. cognitive_log 审计** | 每次 tool 调用写日志，erdl-audit 周期审计 | P01/P07 |

## 下一步

- 🛠️ [ERA-Chat 开发指南](./development-guide.md) — 用自然语言开发新功能（含编译验证闭环详解）
- 📊 [ERA-Chat 运营指南](./operations-guide.md) — 用自然语言运营业务（含六引擎场景）
- 🏗️ [架构总览](../architecture/overview.md) — 系统分层设计
- 🔒 [安全架构](../security/security-architecture.md) — 认证授权 + 三重数据库校验
