# 系统架构总览

> 理解 OpenOBA Starter 的分层设计、组件关系和数据流向

## 架构一句话

OpenOBA Starter 是一个 **自指（self-referential）的 Monorepo 双层系统**：上层是开源的 Eyewear ERP（MIT），下层是 OpenOBA Core 引擎（BSL）。它的核心特征不是"AI 嵌入 ERP"，而是 **AI 住在 ERA-Chat 里，能读自己的代码、改自己的代码、运营自己的业务**——这套能力建立在 **7 项发明专利**之上，形成从语义地基到业务协同的完整七层架构。

## 与传统开源 ERP 的根本差异

| 维度 | 传统开源 ERP | OpenOBA Starter |
|------|------------|-----------------|
| 二开入口 | README + 源码 | ERA-Chat 对话框 |
| 谁读代码 | 开发者 | AI（Meta-Mirror 自动扫描注入） |
| 谁改代码 | 开发者写 PR | AI 用 `file-edit` 改，自动编译验证闭环 |
| LLM 输出格式 | 依赖 Prompt 约束，常失败 | Action Guard 四格式自适应解析 |
| 工具调用 | 并行全量执行 | 每轮单工具，基于真实结果再决策 |
| 错误处理 | 报错给人看 | AI 自我纠错，错误自动转为持久记忆 |
| 谁运营 | 业务员找菜单填表单 | 业务员对 ERA-Chat 说话（六引擎协同） |
| 规则变更 | 改代码重新部署 | 写 ERDL YAML 热加载 |
| 交付单位 | Git Commit / PR | Deliverable（含 changelog + 文件清单 + 版本） |

这不是"AI 辅助开发"，是 **AI 自己开发自己**——这是 OpenOBA 在开源生态里的差异化定位。

## 分层架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户交互层                             │
│   ┌──────────────┐    ┌──────────────┐                  │
│   │  传统表单 UI  │    │  ERA-Chat    │  ← 自然语言对话   │
│   │  (Vue 3)     │    │  (Vue 3)     │                  │
│   └──────┬───────┘    └──────┬───────┘                  │
└──────────┼───────────────────┼──────────────────────────┘
           │  HTTP / WebSocket │
┌──────────┼───────────────────┼──────────────────────────┐
│          ▼                   ▼       应用层 (NestJS)     │
│   ┌─────────────────────────────────────────────────┐   │
│   │           Eyewear ERP（MIT 开源）                │   │
│   │  product │ customer │ order │ inventory │ ...   │   │
│   └──────────────────────┬──────────────────────────┘   │
│                          │ 依赖注入 + Entity 注册        │
│   ┌──────────────────────▼──────────────────────────┐   │
│   │        OpenOBA Core（BSL 引擎 · 7 项专利）       │   │
│   │                                                   │   │
│   │  L7 六引擎协同(P07) · L6 记忆自进化(P06)          │   │
│   │  L5 Meta-Mirror · L4 SOUL 人格                    │   │
│   │  L3 ReAct单工具(P03) · L2 ActionGuard(P02)        │   │
│   │  L1 ERDL规则+数据操作(P01+P04)                    │   │
│   └──────────────────────┬──────────────────────────┘   │
└──────────────────────────┼──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                    数据层                                │
│          ┌───────────────▼───────────────┐              │
│          │      MySQL 8.0 (utf8mb4)      │              │
│          │   128+ 表 (业务表 + sys_ 表)   │              │
│          └───────────────────────────────┘              │
│          ┌───────────────┬───────────────┐              │
│          │  Redis (可选)  │  LLM API      │              │
│          │   限流/缓存    │  DeepSeek等   │              │
│          └───────────────┴───────────────┘              │
└──────────────────────────────────────────────────────────┘
```

## 两大核心组件

### 1. Eyewear ERP（开源层，MIT）

眼镜行业的完整管理系统，包含传统 ERP 的所有表单操作：

- **商品管理**：SPU/SKU/套装/条码/分类/结构标准
- **客户管理**：客户档案/会员等级/C 端认证
- **订单管理**：订单/售后/评价
- **库存管理**：库存盘点/调拨/预警
- **系统管理**：用户/角色/权限/菜单/字典/审计
- **行业能力**：美学搭配规则/颜色设计/镜架结构

技术栈：NestJS 11 + TypeORM + MySQL，通过 `packages/backend` 提供。

### 2. OpenOBA Core（引擎层，BSL · 7 项专利）

AI 执行官的运行时引擎，提供 Agent 执行所需的所有能力。核心技术机制受 7 项发明专利保护，形成完整的七层架构：

| 层 | 引擎 | 专利 | 职责 |
|----|------|------|------|
| L1 | **ERDL** | P01+P04 | 五层语义模型 + 热替换 + 三向翻译 + 编译验证闭环 |
| L2 | **Action Guard** | P02 | 四格式自适应解析 + 三级校验 + 输出清洁 + 一键回退 |
| L3 | **ReAct 单工具决策** | P03 | 每轮一个工具 + 三层思考事件 + 五类SSE + 四层防线 |
| L4 | **SOUL** | — | 人格系统：身份 + 能力边界 + 铁律三层约束 |
| L5 | **Meta-Mirror** | — | 自省引擎：扫描 Entity/API/DTO/规则/约定注入上下文 |
| L6 | **Agent Memory** | P06 | 持久记忆 + 错误→记忆转化链 + 版本化生命周期 |
| L7 | **六引擎协同** | P07 | 商品/上架/销售/履约/客服/分析 — 全业务闭环 |

此外还有 **EROS Task**（任务工作流）、**Skill**（技能注册）、**Tool Registry**（工具注册）、**Chat**（Socket.io 流式对话）等支撑模块。

> 📖 每层的专利级技术细节详见 [ERA-Chat 总览](../era-chat/README.md)。

技术栈：NestJS 11 + TypeORM，以 `@openoba/core` npm 包形式被 ERP 层引用。

## 数据流：一次自然语言操作的完整路径

以用户在 ERA-Chat 输入"帮我查一下库存低于 10 的镜架"为例，展示七层架构如何协同：

```
用户输入
  │
  ▼
[Vue3 ERA-Chat] ──WebSocket──▶ [Core ChatModule]
                                    │
                                    ▼
                              [L4 SOUL 人格系统]
                              注入身份 + 铁律 + 能力
                                    │
                                    ▼
                              [L5 Meta-Mirror]
                              注入 Inventory Entity 上下文
                              （精准注入，节省 90% Token）
                                    │
                                    ▼
                              [L3 ReAct 推理循环]
                              思考 → 单工具行动 → 观察
                                    │
                                    ▼
                              [L2 Action Guard]
                              解析 LLM 输出（四格式自适应）
                              三级校验（定义查证→别名映射→完整性）
                                    │
                                    ▼
                              [L1 ERDL 三向翻译]
                              "库存" → inventory → inventory 表
                              "低于10" → qty < 10 → WHERE qty < ?
                              三重安全校验（白名单+禁止表+只读）
                                    │
                                    ▼
                              [Eyewear ERP]
                              InventoryService.lowStockQuery()
                                    │
                                    ▼
                              [MySQL] SELECT * FROM inventory WHERE qty < 10
                                    │
                                    ▼
                              [L6 记忆系统]
                              本次成功经验可转为记忆
                                    │
                                    ▼
                              [L3 五类SSE事件流] ──WebSocket──▶ [Vue3 渲染]
                              thought → tool_start → tool_end → observation → round_done
```

## Monorepo 包结构

```
packages/
├── backend/    # Eyewear ERP 后端（MIT，主应用入口）
├── core/       # @openoba/core 引擎包（BSL，被 backend 依赖）
└── types/      # @openoba/types 共享类型（MIT）
frontend/       # Vue 3 前端（MIT，独立部署）
```

依赖关系：

```
frontend ──HTTP/WS──▶ backend
                        │
                        ├──▶ @openoba/core（引擎）
                        └──▶ @openoba/types（共享类型）
```

## 部署形态

### 单机部署（推荐起步）

```
[浏览器] ──▶ [Nginx] ──▶ [Node.js 进程 (backend + core)]
                              │
                              ├──▶ [MySQL]
                              └──▶ [Redis (可选)]
```

- 后端运行在 `:3400`，提供 API + WebSocket
- 前端构建产物由 Nginx 托管，或后端 ServeStatic 托管
- LLM API Key 在系统内配置，调用外部 LLM 服务

### 三种部署模式

通过 `OPENOBA_MODE` 环境变量切换：

| 模式 | 定位 | 适用场景 |
|------|------|---------|
| `operator` | 运营模式 | 生产环境，隐藏开发态功能 |
| `developer` | 开发模式 | 本地开发，显示调试工具 |
| `maintainer` | 维护模式 | 运维排查，显示系统诊断 |

## 关键设计决策

### 为什么 Core 用 BSL 而不是 MIT？

BSL（Business Source License）允许源码可读、个人/研究/教育免费使用，但限制商业竞品。Change Date（2030-06-09）后自动转为 MIT，平衡了开源精神与商业保护。

### 为什么用 Monorepo？

ERP 和 Core 引擎共享 TypeORM Entity、NestJS 模块体系。Monorepo 让 Entity 注册、类型共享、版本同步在一个仓库内完成，避免跨仓库的版本漂移。

### 为什么 ERDL 用 YAML 而不是代码？

ERDL 规则需要 AI 可读可写。YAML 的结构化文本天然适合 LLM 理解和生成，同时支持热加载（无需重启）和版本快照。

### 为什么让 AI 能改自己的代码？这不是危险吗？

这是 OpenOBA 最核心的设计取舍。**安全靠五道防线**（整合了专利层机制）：

1. **SOUL 铁律**（L4）：每个 Agent 都有 `securityClearance` 和 `canEditCode`，低权限 Agent 根本看不到 `file-edit` skill
2. **Skill 权限白名单**（L1）：`file-edit` 的 `allowPatterns` 限定为 `src/skills/erdl/packages`，碰不到 `.env`/`node_modules`
3. **编译验证闭环**（P01）：`file-edit` 改完自动跑 `tsc --noEmit`，编译失败 Agent 自动修正重试，不会带着类型错误交付
4. **三重数据库校验**（P04）：白名单 + 禁止表 + 只读保护，级联校验任一失败立即终止
5. **Deliverable 审批流**：AI 改完打包成 Deliverable，必须人工 Review 才发布；每次 tool 调用写 `cognitive_log` 审计

这套机制让"AI 自开发"既可能、又可控。

### 为什么不用 Text-to-SQL？（P04 专利核心）

P04 专利明确指出 Text-to-SQL 的致命缺陷：LLM 可能编造列名导致 SQL 失败、可能拼入恶意输入造成注入、无法在执行前结构化校验。OpenOBA 用**确定性四步翻译链**（别名 → 语义名 → 物理列名 → 参数化 SQL）替代概率性方案，每一步都是 O(1) 查表，从根本上消除字段编造和 SQL 注入。

### 为什么每轮只执行一个工具？（P03 专利核心）

主流的"并行工具调用"（OpenAI Parallel FC、LangChain AgentExecutor）有个根本缺陷：LLM 在没看到前一个工具结果时就决定了后续工具参数，可能执行无用操作。OpenOBA 的 ReAct 单工具策略（P03）每轮只执行 `actions[0]`，执行完立即回填结果，LLM 基于真实结果再决策——避免了"查库存"和"创建补货单"同时执行但库存其实充足的浪费。

### 为什么需要 Action Guard？（P02 专利核心）

LLM 输出格式不可预测——同一模型同一任务，这一轮返回标准 FC，下一轮可能返回 XML 标签。现有方案只支持单一解析策略，格式不符就失败。Action Guard（P02）用四格式自适应解析 + 一键回退环境变量，从根本上解决了"Prompt 约束 LLM 行为不可靠"的痛点。

### 为什么 Meta-Mirror 是自指架构的关键？

传统 AI 助手不知道你项目里有哪些 Entity、哪些 API、哪些规则——你得手动喂上下文。Meta-Mirror 在启动时自动扫描整个项目的 Entity/API/DTO/规则/约定，生成知识库条目注入到每个 Agent 的上下文里。这意味着 **AI 知道自己有什么能力**——它能说出"我可以通过 InventoryService.lowStockQuery() 查低库存"，因为它扫到了这个 API。这是"自开发自运营"的认知基础。

## 延伸阅读

- ⭐ [ERA-Chat 总览](../era-chat/README.md) — 自开发自运营的核心机制
- ⭐ [ERA-Chat 开发指南](../era-chat/development-guide.md) — 用自然语言开发新功能
- ⭐ [ERA-Chat 运营指南](../era-chat/operations-guide.md) — 用自然语言运营业务
- [技术栈详解](./tech-stack.md) — 每个技术选型的理由
- [后端模块清单](./module-list.md) — 每个模块的职责
- [数据库 Schema](../database/schema.md) — 128+ 张表的组织
- [安全架构](../security/security-architecture.md) — 认证授权机制
