# 架构总览

> OpenOBA 的分层设计、组件关系和数据流向。

---

## 一句话

OpenOBA 是一个**分段许可的 Monorepo**。上层是 ERP 参考实现（MIT），下层是 OpenOBA Core 引擎（BSL 1.1 → 2030 年转 Apache 2.0）。架构实现了自然语言驱动、在企业数字系统中确定性执行。

---

## 分层架构

```
┌──────────────────────────────────────────────────────────┐
│                     展示层                                │
│   ┌──────────────┐    ┌──────────────┐                   │
│   │  传统表单 UI  │    │  ERA-Chat    │  ← 自然语言界面   │
│   │  (Vue 3)     │    │  (Vue 3)     │                   │
│   └──────┬───────┘    └──────┬───────┘                   │
└──────────┼───────────────────┼───────────────────────────┘
           │  HTTP / WebSocket │
┌──────────┼───────────────────┼───────────────────────────┐
│          ▼                   ▼        应用层              │
│   ┌──────────────────────────────────────────────────┐    │
│   │           ERP 参考实现（MIT）                      │    │
│   │  product │ customer │ order │ inventory │ ...    │    │
│   └──────────────────────┬───────────────────────────┘    │
│                          │ 依赖注入 + Entity 注册          │
│   ┌──────────────────────▼───────────────────────────┐    │
│   │         OpenOBA Core（BSL 1.1）                    │    │
│   │                                                    │    │
│   │  ERDL · Action Guard · ReAct · SOUL                │    │
│   │  Meta-Mirror · Agent Memory · Skill System         │    │
│   └──────────────────────┬───────────────────────────┘    │
└──────────────────────────┼───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                      数据层                               │
│          ┌───────────────▼───────────────┐                │
│          │      MySQL 8.0 (utf8mb4)      │                │
│          └───────────────────────────────┘                │
│          ┌───────────────┬───────────────┐                │
│          │  Redis（可选） │  LLM API      │                │
│          │  限流/缓存     │  DeepSeek/Qwen │               │
│          └───────────────┴───────────────┘                │
└───────────────────────────────────────────────────────────┘
```

---

## 两大核心组件

### 1. ERP 参考实现（MIT）

眼镜行业完整管理系统：

| 模块 | 能力 |
|------|------|
| **商品** | SPU/SKU/套装/条码/分类 |
| **客户** | 客户档案/会员等级/认证 |
| **订单** | 订单/售后/评价 |
| **库存** | 盘点/调拨/预警 |
| **系统** | 用户/角色/权限/菜单/审计 |

技术栈：NestJS 11 + TypeORM + MySQL，通过 `packages/backend` 提供。

### 2. OpenOBA Core 引擎（BSL 1.1）

AI 执行体的运行时引擎，每个组件对应一道 LLM 与企业系统之间的裂痕：

| 组件 | 解决的裂痕 | 职责 |
|------|-----------|------|
| **ERDL** | 语义权 + 规则权（L2+L3） | 五层语义协议：Entity / Alias / Relation / Rule / Action。YAML 定义，Hot Reload。将自然语言确定性翻译为系统操作。 |
| **Action Guard** | 动作权（L4） | 三级校验：格式 → 规则 → 权限。LLM 输出必须全部通过才能触达系统。 |
| **ReAct 引擎** | 执行控制 | 单轮单工具决策循环。Observation 驱动下一步。全流式输出（Thought → Tool → Observation 时间线）。 |
| **SOUL** | 身份边界 | Agent 人格系统：身份定义、能力范围、执行约束。 |
| **Meta-Mirror** | 自知能力 | 源码结构扫描 → 知识库自动生成 + 质量门禁 DSL。 |
| **Agent Memory** | 进化能力 | 全链路日志归档。成功 → 经验积累。失败 → 根因注入，下次规避。 |
| **Skill 系统** | 可扩展性 | 18 个内置 Skill（CRUD / 分析 / 代码生成 / 类型校验）。通过 TypeScript 模块扩展。 |

---

## 六步执行闭环

每次自然语言请求都走同样的路径：

```
Intent → Semantic → Protocol → SingleTool → Execute → Memory
 (LLM)    (ERDL)   (ActionGuard)  (ReAct)     (Skill)
```

| 步骤 | 组件 | 做了什么 |
|------|------|---------|
| Intent | LLM | 解析自然语言，提取目标与参数 |
| Semantic | ERDL | NL → 实体/字段/规则映射 |
| Protocol | Action Guard | 校验并结构化指令 |
| SingleTool | ReAct | 执行一个工具，观察结果，决定下一步 |
| Execute | Skill | 执行操作（CRUD / 分析 / 代码生成） |
| Memory | Agent Memory | 归档日志，积累经验 |

### 双路径：成功进化 + 失败免疫

- **✔ 成功** → 结果汇报 → 经验写入 Memory → 下次更精准、更高效
- **✘ 失败** → Action Guard 拦截 → Checkpoint 回滚 → 根因注入 → 自动规避

---

## 数据流示例

用户输入：*"帮我查一下库存低于 10 的镜架"*

```
用户输入
  │
  ▼
[ERA-Chat] ──WebSocket──▶ [ChatModule]
                              │
                              ▼
                         [SOUL]
                         注入 Agent 身份与约束
                              │
                              ▼
                         [Meta-Mirror]
                         注入 Inventory 实体上下文
                              │
                              ▼
                         [ReAct 循环]
                         思考 → 单工具 → 观察
                              │
                              ▼
                         [Action Guard]
                         解析 LLM 输出（四格式自适应）
                         校验（格式 → 规则 → 权限）
                              │
                              ▼
                         [ERDL 翻译]
                         "库存" → inventory 实体 → inventory 表
                         "低于10" → qty < 10 → WHERE qty < ?
                              │
                              ▼
                         [ERP 层]
                         InventoryService.lowStockQuery()
                              │
                              ▼
                         [MySQL]
                         SELECT * FROM inventory WHERE qty < 10
                              │
                              ▼
                         [Memory]
                         成功记录，未来优化
                              │
                              ▼
                         [SSE 流]
                         thought → tool_start → tool_end → observation → done
                              │
                              ▼
                         [ERA-Chat 渲染结果]
```

---

## Monorepo 包结构

```
packages/
├── backend/    # ERP 后端（MIT，主应用入口）
├── core/       # @openoba/core 引擎（BSL 1.1）
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

---

## 部署

### 单机部署（推荐起步）

```
[浏览器] ──▶ [Nginx] ──▶ [Node.js（backend + core）]
                              │
                              ├──▶ [MySQL]
                              └──▶ [Redis（可选）]
```

### 三种模式

通过 `OPENOBA_MODE` 环境变量切换：

| 模式 | 用途 | 场景 |
|------|------|------|
| `operator` | 生产 | 隐藏开发功能 |
| `developer` | 本地开发 | 显示调试工具 |
| `maintainer` | 诊断 | 显示系统内部信息 |

---

## 关键设计决策

### 为什么 Core 用 BSL 1.1？

BSL 允许源码可见、非生产用途和研究用途免费。商业竞争性使用需要授权。2030-06-09 自动转为 Apache 2.0，兼顾开源精神与商业可持续性。

### 为什么用 Monorepo？

ERP 与 Core 共享 TypeORM Entity、NestJS 模块体系和类型定义。Monorepo 防止版本漂移，简化跨包 Entity 注册。

### 为什么 ERDL 用 YAML？

ERDL 规则需要人与 LLM 都能读写。YAML 的结构化文本天然适合 LLM 生成，同时支持热加载（无需重启）和版本快照。

### 为什么每轮只执行一个工具（ReAct）？

并行的工具调用（主流 Agent 框架通用做法）在没看到前一个工具结果时就决定了后续参数，可能执行无用操作。OpenOBA 的单工具策略：执行一个 → 观察真实结果 → 再决策下一步，消除无效操作。

### 为什么用 Action Guard 而不是 Prompt 约束？

LLM 输出格式不可预测——同一模型同一任务，可能这轮返回标准 FC，下轮返回 XML。Action Guard 用四格式自适应解析，从架构层面保证输出结构化，而不是赌 Prompt 生效。

### 为什么需要 Meta-Mirror？

传统 AI 助手不知道你项目里有哪些 Entity、API、规则——你得手动喂上下文。Meta-Mirror 启动时自动扫描整个项目，生成知识库注入到每个 Agent 的上下文里。AI 知道自己的能力边界。

---

## 延伸阅读

- [快速开始](../getting-started/quick-start.md) — 5 分钟上手
- [技术栈](./tech-stack.md) — 每个技术选型的理由
- [模块清单](./module-list.md) — 每个模块的职责
- [ERDL 协议](../erdl/overview.md) — 五层语义模型规范
- [数据库 Schema](../database/schema.md) — 表结构组织
- [安全架构](../security/security-architecture.md) — 认证与防护
