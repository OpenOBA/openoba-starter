# OpenOBA — AI-Native Autonomous Executor

> **产品形态**：AI 原生自主执行体 — 自然语言驱动、自主规划路径、在企业数字系统中确定性执行任务并持续自我进化的智能执行实体。
>
> **English**: AI-Native Autonomous Executor

---

## 前言：一人一机，人机共创

OpenOBA 全程人机共创的真实实践成果。

2026 年 4 月，一位没有任何技术背景的人类，尝试探索和 AI 组成一个人机共创体。这个共创体从最初的模仿、借鉴、复制成熟的产品开始，AI 的能力让共创体逐步找到一个可以突破的方向：数字系统的确定性执行。在一人一机的协作工作模式下，人类制订目标、补充意见，AI 承担架构设计、全栈编码、代码审查、测试验证与文档编写。这个共创体仅用 3 个月时间从零开始打造了一个严谨的企业级软件系统：全栈 TypeScript 架构、三层执行引擎、内置 Skill 体系、完整的测试覆盖和质量门禁——这便是 OpenOBA。

**OpenOBA 的产品理念，在这个项目诞生的过程中已经被亲自验证：AI具有、甚至超越人类的执行力。**

---

## 一、问题：LLM 与企业数字系统之间的五道裂痕

LLM 与企业系统之间存在五道递进裂痕：

| 层 | 裂痕 | LLM 缺什么 | 表现 |
|---|------|-----------|------|
| **L1 访问权** | 连不上 | 物理连接 | LLM 跑云端，DB/API 跑内网 |
| **L2 语义权** | 看不懂 | 业务语义映射 | `f_crd_lvl` = ? 行业编码 → 业务含义 |
| **L3 规则权** | 边界不明 | 业务规则约束 | 规则散落代码各处，LLM 看到的是 IF-ELSE 碎片 |
| **L4 动作权** | 做不了 | 可执行操作 | 能生成 SQL，不能直接执行 |
| **L5 判决权** | 不敢用 | 可追溯可回滚 | 出了事谁负责？LLM 不能签字 |

**结论：连上也看不懂，看懂了也不敢做，敢做也没人担责。**

---

## 二、方案：逐层击穿

OpenOBA 以协议层为每一道裂痕提供确定性答案：

| 裂痕 | OpenOBA 的方案 | 机制 |
|------|---------------|------|
| **L1 访问权** | 连接层 | 内网部署，直连 DB/API/FileSystem |
| **L2 语义权** | ERDL Entity + Alias | 业务实体定义 + 自然语言 → 字段名映射 |
| **L3 规则权** | ERDL Rule + Relation | 声明式规则约束 + 实体关系图 |
| **L4 动作权** | Action Guard + Skill | 三级校验（格式/规则/权限）→ 18 个内置 Skill 直接执行 |
| **L5 判决权** | 审计日志 + Checkpoint | 全链路可追溯 + 七步一键回滚 |

### ERDL — 语义基座（L2 + L3）

ERDL（Entity-Relation Dynamic Language）是 YAML 超集的动态语义数据协议，五层语义模型将企业隐性知识翻译为 LLM 可操作的显性规则：

| 语义层 | 职责 |
|--------|------|
| **Entity** | 业务实体定义（客户、订单、库存） |
| **Alias** | 自然语言别名（`"下单时间"` → `created_at`） |
| **Relation** | 实体间关系（客户 1:N 订单） |
| **Rule** | 声明式规则约束（金额 > 0、状态机合法性） |
| **Action** | 可执行操作定义（createOrder、updateStock） |

全 YAML 定义，Hot Reload 热更新。企业直接面向系统表达知识，无需训练模型。

### Action Guard — 执行防线（L4）

LLM 输出在进入系统前，经三级刚性校验：

1. **Format** — 四格式自适应解析，输出必须结构化
2. **Rule** — 与 ERDL Rule 层交叉验证，拦截违规操作
3. **Permission** — 基于角色的操作边界检查

未经通过的指令，物理上无法触达任何企业系统。

### 审计与回滚（L5）

ReAct 每一步有痕记录，ERDL 规则层与 DTO 代码层双向交叉审计，关键操作前自动 Checkpoint 快照，支持七步一键回滚（Git + Build + Test + Restart）。

---

## 三、六步执行闭环

```
Intent → Semantic → Protocol → SingleTool → Execute → Memory
 (LLM)    (ERDL)   (ActionGuard)  (ReAct)     (Skill)
```

| Step | Component | Function |
|------|-----------|----------|
| Intent | LLM | 自然语言解析，提取任务目标与参数 |
| Semantic | ERDL | NL → 实体/字段/规则映射 |
| Protocol | Action Guard | 结构化指令转换 + 三级校验 |
| SingleTool | ReAct | 单轮单工具决策，Observation 驱动下一步 |
| Execute | Skill | CRUD / Analytics / CodeGen / TypeCheck |
| Memory | Agent Memory | 全链路日志归档 + 经验积累 |

### 双路径：成功进化 + 失败免疫

**✔ 执行成功** → 任务结果汇报 → 经验写入 Agent Memory → 下次同类任务更精准、更高效。

**✘ 执行受阻** → Action Guard 拦截 → Checkpoint 自动回滚 → 失败根因注入 Memory → 下次推理自动规避。

**越用越聪明，越用越可靠。**

---

## 四、技术栈

- **LLM**：DeepSeek / Qwen 多模型路由
- **协议**：ERDL（YAML 超集，Hot Reload）
- **后端**：NestJS 11 + TypeScript + TypeORM + MySQL + Redis
- **前端**：Vue 3 + Element Plus + TypeScript（Composition API · `<script setup>`）
- **通信**：WebSocket 优先 + SSE 降级（Socket.IO）
- **执行引擎**：ReAct + Action Guard + SafeExpr（自研表达式引擎）
- **基础设施**：RDBMS / REST API / FileSystem / Cache / Queue
- **专利**：七项发明专利支撑确定性执行架构

## 五、许可证

本仓库采用分段许可：

| 代码范围 | 许可证 |
|---------|--------|
| `packages/core/` | BSL 1.1（2030-06-09 转 Apache 2.0） |
| 其余全部（backend / frontend / types） | MIT |

详见根目录 [LICENSE](./LICENSE) 和 [packages/core/LICENSE](./packages/core/LICENSE)。

---

## 六、人机共创成果展示

OpenOBA 本身就是 AI-Native Autonomous Executor 的一次实践验证。120 日，300 亿 TOKEN。

| 指标 | 数据 |
|------|------|
| 周期 | 2026.04.03 — 至今 |
| 参与者 | 1 Human + 1 AI Executor |
| 源文件 | ~570 TS/Vue files, ~3MB production code |
| Commits | 3,200+ |
| 版本 | V1.5.0-alpha |
| 后端 | 22 modules · 72 entities |
| 前端 | 11 views · 18 composables |
| 测试 | 35 backend suites + 7 frontend suites |
| 质量 | 0 TS errors · 0 ESLint errors · 0 `any` |

### 核心创新

- **ERDL** — 五层语义协议，填平 NL ↔ Schema 裂痕
- **SafeExpr** — 自研递归下降表达式引擎，0 代码注入风险
- **Action Guard** — 协议层三级校验（Format → Rule → Permission），不依赖 Prompt
- **ReAct Engine** — 单工具决策 + 全流式输出 + Thought → Tool → Observation timeline
- **Meta-Mirror** — 源码结构扫描 → 知识库自动生成 + 质量门禁 DSL
- **Agent Memory** — 失败经验按作用域精准注入，越用越精准
- **Quality Gates** — L1 Git → L2 Type → L3 Test → L4 Lint → L5 Review


**一人一机，人机共创，持续进化！**

---

> OpenOBA is not a tool you use. It is an executor you trust.
>
> This project is the first proof.
