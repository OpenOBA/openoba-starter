# ERA-Chat 开发指南

> 怎么用自然语言让 AI 给 ERP 开发新功能——加字段、加模块、加规则、加接口

## 这份指南适合谁

- 想给 OpenOBA 加功能但不想/不会写 NestJS 代码的开发者
- 想快速验证一个业务想法的技术负责人
- 想本地化定制（加行业字段、加业务规则）的实施工程师

## 前置准备

1. OpenOBA Starter 已启动（后端 :3400、前端 :5173）
2. 已完成 4 步初始化向导，能用 `admin` / `admin123` 登录
3. 在 **ERA-Chat → 设置 → API Key** 配置了 LLM Key（推荐 DeepSeek）
4. 你的账号角色有 `canEditCode` 权限（默认 admin 角色有）

> ⚠️ **安全提示**：`canEditCode` 是高权限。生产环境建议为开发单独建角色，运营角色不要开 `canEditCode`。详见 [安全架构](../security/security-architecture.md)。

## 核心心智模型

在 ERA-Chat 里开发，你要把 AI 当成一个**会读代码、会改代码、会跑检查、会自我纠错的初级工程师**。你的工作是：

1. **说清楚需求**——要加什么、改什么、为什么
2. **看 AI 的 Thought**——确认它理解对了（每轮推理都流式可见）
3. **Review Deliverable**——AI 改完会打包，你确认后才发布

AI 会自动做这些事（你不用教它）：

- **读代码**：Meta-Mirror 自动扫描到的 Entity/API/DTO/规则注入上下文（L5），按 `mirror_refs` 精准注入节省 90% Token
- **解析意图**：Action Guard 四格式自适应解析 LLM 输出（L2），无论 FC/JSON/XML/文本都能识别
- **单工具决策**：每轮 ReAct 循环只执行一个工具，基于真实结果再决策（L3），避免并行执行的浪费
- **改代码**：`file-edit` 改源文件，**改完自动跑 `tsc --noEmit` 编译验证**（L1 编译验证闭环）
- **自我纠错**：编译失败时 Agent 根据错误信息（文件路径/行号/错误代码）自动修正后重试，循环直至通过
- **看 diff**：`git-diff` 查看工作区变更
- **记教训**：失败的工具调用自动记录到 `agent_error_log`，任务完成后自我审查提取教训存入 `agent_memory`（L6），下次自动避免
- **打包交付**：改动打包成 Deliverable（含 changelog + 文件清单 + 版本），等你 Review

> 💡 **编译验证闭环**（P01 专利核心机制）：这是 OpenOBA 区别于普通 AI 代码助手的关键。AI 改完代码后**不需要你手动跑 `tsc`**——`file-edit` 工具内部会自动调用 TypeScript 编译器，编译结果直接内嵌在工具返回值里。编译通过则 Agent 确认完成；编译失败则 Agent 根据具体错误信息分析并修正代码后重新执行修改，循环直至编译通过。整个过程在 Agent 的执行链路中自动完成，无需人工干预。

## 场景一：加字段

**需求**：在客户表加一个"生日"字段，用于生日营销。

### 在 ERA-Chat 输入

```
在客户表加一个"生日"字段，类型是日期，可选填，用于生日营销。
```

### 你会看到什么

```
Agent (Thought): 我需要先看 Customer Entity 的结构。
Agent (Tool): erdl_crud { action: read, entity: Customer }
Agent (Observation): Customer 有 id/name/phone/email/created_at，无 birthday。

Agent (Thought): 我用 file-edit 在 customer.entity.ts 加 birthday 字段。
Agent (Tool): file_edit {
  operation: replace,
  filePath: "packages/backend/src/modules/customer/entity/customer.entity.ts",
  old_str: "  email: string;",
  new_str: "  email: string;\n  birthday?: Date;"
}
Agent (Observation): 文件已更新。

Agent (Thought): 跑类型检查确认没破坏。
Agent (Tool): tsc_check { project: backend }
Agent (Observation): 0 errors.

Agent (Tool): git_diff { mode: diff }
Agent (Observation): + birthday?: Date;

Agent: 已在 Customer Entity 添加 birthday?: Date 字段。
       类型检查通过。Diff 已打包为 Deliverable #v1。
       请在"交付"页面 Review 后发布。
```

### 你要做的

1. **看 Thought**：确认 AI 找对了 Entity 文件
2. **看 Observation**：确认 `tsc-check` 0 errors
3. **去"交付"页面**：Review Deliverable，确认 diff 正确
4. **发布**：点击发布，Deliverable 生效

> 💡 **进阶**：如果还想要前端表单也加这个字段，可以接着说"在客户编辑表单也加上生日字段"，AI 会去改 Vue 组件。

## 场景二：加业务规则（ERDL）

**需求**：给售后模块加一个"7 天无理由退货自动审批"规则——只要原因类型是 `changed_mind` 且在 7 天内，自动审批通过。

### 在 ERA-Chat 输入

```
给售后模块加一个规则：如果售后原因是"改主意"(changed_mind)
且订单创建在 7 天内，自动把售后单状态设为 auto_approved，
并通知运营组。用 ERDL 写。
```

### 你会看到什么

```
Agent (Thought): 我需要先看 AfterSales Entity 的字段和现有 ERDL 规则。
Agent (Tool): erdl_crud { action: read, entity: AfterSales }
Agent (Observation): AfterSales 有 type/reason_type/created_at/status...

Agent (Thought): 我写一条 validation tier 的 ERDL 规则，
                 trigger 是 before_create。
Agent (Tool): file_edit {
  operation: write,
  filePath: "erdl/after_sales_7day_auto_approve.yaml",
  content: "<YAML 内容>"
}

Agent (Tool): tsc_check { project: backend }
Agent (Observation): 0 errors.

Agent: 已生成 ERDL 规则 after_sales_7day_auto_approve，
       tier: validation，热加载已生效。
       触发条件：reason_type=changed_mind 且 created_at 在 7 天内。
       动作：status=auto_approved + 通知运营组。
       Diff 已打包为 Deliverable #v1。
```

### 关键点

- **ERDL 规则热加载**：写完 YAML 不需要重启，`ERDLHotReloader` 监听文件变化自动生效
- **tier 选择**：`validation` 是数据校验层（写入前拦截），`policy` 是业务策略层（写入后触发动作）
- **AI 会选 trigger**：根据需求自动选 `before_create` / `after_update` 等

## 场景三：加完整模块

**需求**：加一个"供应商管理"模块，包含供应商档案、供货记录、对账单。

### 在 ERA-Chat 输入

```
加一个供应商管理模块，需要：
1. 供应商档案（名称、联系人、电话、银行账号、结算周期）
2. 供货记录（关联 SPU、采购价、数量、日期）
3. 对账单（按月汇总，含应付/已付/欠款）

参考现有的客户模块结构来设计。
```

### 你会看到什么

AI 会按这个顺序操作（每步你都能在对话流看到）：

1. **调研**：用 `erdl_crud` 读 Customer 模块结构作为参考
2. **设计**：在 Thought 里说明要建 3 个 Entity（Supplier / SupplyRecord / Reconciliation）
3. **建 Entity**：用 `file_edit` 创建 `supplier.entity.ts` 等 3 个文件
4. **建 Module/Service/Controller**：按 NestJS 约定创建对应文件
5. **注册到 AppModule**：用 `file_edit` 的 replace 操作把新模块加到 `app.module.ts`
6. **跑类型检查**：`tsc_check` 确认编译通过
7. **生成 SQL**：用 `erdl_crud` 反推建表 SQL（或让你手动执行 `init-structure.sql` 的增量）
8. **打包 Deliverable**：包含所有新增文件 + AppModule 修改

### 你要做的

这是一个大改动，建议：
1. **分轮对话**：不要一次让它建完，先建 Entity，确认结构后再建 Service/Controller
2. **看 Thought**：AI 设计的表结构对不对？字段类型合不合理？
3. **Review 时重点看**：`app.module.ts` 的改动、Entity 关系（@OneToMany 等）
4. **数据库迁移**：AI 生成的 SQL 在 Deliverable 里，需要手动在数据库执行

> ⚠️ **注意**：AI 不会自动执行 SQL（这是安全约束）。你需要手动执行，或让 AI 生成迁移脚本。

## 场景四：加 API 接口

**需求**：给订单模块加一个"批量导出本月订单为 Excel"的接口。

### 在 ERA-Chat 输入

```
给订单模块加一个接口：GET /orders/export-monthly?month=2026-06
返回本月所有订单的 Excel 文件，包含列：订单号/客户/金额/状态/创建时间。
参考现有的 csv-exporter skill 实现。
```

### 你会看到什么

```
Agent (Thought): 我需要看 OrderController 现有结构和 csv-exporter 的用法。
Agent (Tool): erdl_crud { action: read, entity: Order }
Agent (Tool): file_edit { operation: read, filePath: "skills/external/csv-exporter/skill.yaml" }

Agent (Thought): 我在 order.controller.ts 加一个 @Get('export-monthly') 端点，
                 用 exceljs 生成 Excel（项目已依赖 exceljs）。
Agent (Tool): file_edit { operation: replace, ... }

Agent (Tool): tsc_check { project: backend }
Agent (Observation): 0 errors.

Agent: 已添加 GET /orders/export-monthly 接口。
       使用 exceljs 生成 .xlsx，响应头设置 Content-Disposition。
       入参：month (YYYY-MM)，默认本月。
       Diff 已打包为 Deliverable #v1。
```

## 场景五：加前端页面

**需求**：加一个"供应商列表"前端页面，复用 Customers.vue 的布局。

### 在 ERA-Chat 输入

```
加一个供应商管理前端页面，路由 /suppliers，
复用 Customers.vue 的列表 + 抽屉详情布局，
字段对应刚加的 Supplier Entity。
还要在左侧菜单"商品管理"下加一个"供应商"入口。
```

AI 会：
1. 读 `Customers.vue` 作为模板
2. 创建 `Suppliers.vue`，替换 API 调用和字段
3. 在 `router/index.ts` 加路由
4. 在菜单配置加入口
5. `tsc_check { project: frontend }` 验证

## 高级技巧

### 1. 用议会模式做需求评审

```
@产品经理 @开发 @测试 我要加一个"会员积分"功能，
会员下单按金额累计积分，积分可抵扣现金，
大家评审一下可行性和风险。
```

多个 Agent 会各自从角色视角分析，最后汇总成评审纪要。

### 2. 让 AI 先出方案再动手

```
我想给库存加一个"效期预警"功能，
先别写代码，给我出个方案设计，包含：
- 数据模型变更
- 业务规则
- API 设计
- 前端交互
```

AI 会用 Thought 输出方案，你确认后再说"按这个方案实施"。

### 3. 分阶段交付大功能

大功能不要一次说完，拆成多轮：
1. 第一轮："先建 Entity 和数据库表"
2. 第二轮："加 Service 和 Controller"
3. 第三轮："加前端页面"
4. 第四轮："加 ERDL 规则"

每轮 AI 都会产出一个 Deliverable，你可以逐个 Review。

### 4. 让 AI 写测试

```
给刚才加的 supplier.service.ts 写单元测试，
覆盖 create/findAll/findOne/update 四个方法。
```

AI 会用 Jest 模板生成 `supplier.service.spec.ts`。

### 5. 理解 AI 的自我纠错（编译验证闭环）

当 AI 改完代码后，`file-edit` 工具会**自动调用 TypeScript 编译器**做静态检查。这是 P01 专利的核心机制，你会在对话流里看到完整的纠错循环：

```
Agent (Tool): file_edit { operation: replace, ... }
Agent (Observation): 文件已更新。正在执行编译验证...
Agent (Observation): ❌ 编译失败：
  src/modules/customer/entity/customer.entity.ts:15
  error TS2322: Type 'string' is not assignable to type 'Date'.

Agent (Thought): birthday 字段我写成了 string 类型，但应该是 Date。
                 我修正一下。
Agent (Tool): file_edit { operation: replace, old_str: "birthday?: string", new_str: "birthday?: Date" }
Agent (Observation): 文件已更新。正在执行编译验证...
Agent (Observation): ✅ 编译通过，0 errors。
```

你不需要手动跑 `tsc`——AI 自己改、自己验、自己修，循环直至通过。

### 6. 理解 AI 的记忆积累（自进化）

AI 会从错误中学习。如果它在某个任务里犯了错（比如编造了不存在的结构标准编码），任务完成后系统会触发**自我审查**：

1. 读取本次任务的推理轨迹和 `agent_error_log`
2. LLM 分析错误，提取教训
3. 创建 `agent_memory` 记录（含 category/severity/scope）
4. 下次同类任务启动时，这条记忆自动注入 System Prompt

**效果**：AI 第一次创建 SPU 时编造编码导致失败，下次它会**先查询可用结构标准**再创建。这是 P06 专利的核心机制，让 Agent 不重复犯错。

> 💡 记忆按作用域精准注入（每次 ≤8 条），不会撑爆上下文。记忆有版本化和生命周期（active → stale → archived）。

## 常见问题

### AI 改完代码没生效？

检查这几步：
1. **Deliverable 是否已发布**：AI 改完只生成 Deliverable，你需要去"交付"页面 Review 并发布
2. **后端是否重启**：Entity 变更需要重启后端（TypeORM 不支持热同步）
3. **数据库是否迁移**：新字段/新表需要执行 SQL（AI 不会自动执行）

### AI 生成的代码有类型错误？

AI 会自动跑编译验证（P01 编译验证闭环）。如果报错，它会**自己看错误信息、自己修正、重新编译**，循环直至通过。如果连续修不好（通常是需求模糊），它会停下来问你。你可以把错误信息贴回去让它继续修。

> 💡 注意：`file-edit` 改完会**自动**跑 `tsc --noEmit`，不需要单独调 `tsc-check`。`tsc-check` skill 用于你想单独验证某个项目的场景。

### AI 改错了怎么办？

Deliverable 在发布前可以拒绝。已发布的改动用 `git checkout` 回滚（AI 改动都在 git 工作区，没 commit）。

### AI 能改前端吗？

能。`file-edit` 的 `allowPatterns` 包含 `packages/**` 和 `src/**`（前端在 `frontend/src/`）。AI 可以改 Vue 组件、路由、API 封装。

### AI 能改 ERDL 规则吗？

能。ERDL 规则在 `erdl/` 目录，AI 可以读写。规则热加载，改完立即生效。

## 不能做什么（安全边界）

| 操作 | 能否 | 原因 |
|------|------|------|
| 改 `src/**` / `packages/**` / `skills/**` / `erdl/**` | ✅ | `file-edit` allowPatterns 允许 |
| 改 `.env` / 配置文件 | ❌ | allowPatterns 不包含 |
| 执行 `npm install` / 任意 shell | ❌ | skill shell 白名单只允许 `npx tsc --noEmit` / `git diff` |
| 直接执行 SQL | ❌ | `erdl-crud` 走 EntityProxy，受权限白名单约束 |
| 修改 `user` / `role` / `permission` 表 | ❌ | `erdl-crud` 的 `forbidden` 列表禁止 |
| 自动 commit / push | ❌ | 无 git commit skill |
| 直接上线 | ❌ | 必须经过 Deliverable 审批 |

## 下一步

- 📊 [ERA-Chat 运营指南](./operations-guide.md) — 用自然语言运营业务
- 🏗️ [架构总览](../architecture/overview.md) — 系统设计
- 🔒 [安全架构](../security/security-architecture.md) — 四道防线详解
- 💻 [开发环境搭建](../development/environment-setup.md) — 传统开发方式（备选）
