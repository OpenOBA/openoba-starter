# 后端模块清单

> NestJS 模块化组织一览——每个模块负责什么，关键文件在哪

> ⭐ **关键**：OpenOBA 最不一样的地方是 Core 引擎层——它让 AI 能"自己开发自己、自己运营自己"。下面的 Core 引擎模块详解是理解 ERA-Chat 自指架构的关键。详见 [ERA-Chat 总览](../era-chat/README.md)。

## 模块总览

OpenOBA Starter 后端（`packages/backend`）由 **ERP 业务模块** 和 **Core 引擎模块** 两部分组成，通过 `app.module.ts` 统一注册。

```
AppModule
├── 基础设施层
│   ├── ConfigModule          # 环境变量
│   ├── RateLimiterModule     # 限流（Redis/Memory 双模式）
│   ├── TypeOrmModule         # 数据库连接
│   └── ServeStaticModule     # 静态文件服务（uploads/）
│
├── ERP 业务模块（MIT 开源）
│   ├── AuthModule            # 管理端认证
│   ├── SystemModule          # 用户/角色/权限/菜单/部署
│   ├── DictionaryModule      # 数据字典
│   ├── HealthModule          # 健康检查
│   ├── StructureModule       # 镜架结构标准
│   ├── CustomerModule        # 客户管理
│   ├── CustomerAuthModule    # C 端客户认证
│   ├── ProductModule         # 商品（SPU/SKU/套装/定价）
│   ├── CategoryModule        # 商品分类
│   ├── OrderModule           # 订单
│   ├── ColorModule           # 颜色设计
│   ├── SubSkuModule          # 子 SKU
│   ├── SmsModule             # 短信
│   ├── InventoryModule       # 库存
│   ├── AfterSalesModule      # 售后
│   ├── WebsiteModule         # 官网内容
│   ├── ReviewModule          # 评价
│   ├── UploadModule          # 文件上传
│   ├── AestheticsModule      # 美学搭配规则
│   ├── DraftPoolModule       # 草稿池
│   └── SchemaModule          # ERDL Schema 定义
│
└── Core 引擎模块（BSL，通过 @openoba/core 引用）
    ├── ERDLModule             # 规则定义引擎
    ├── ErosTaskModule         # 任务工作流
    ├── ChatModule             # WebSocket 对话
    ├── MetaMirrorModule       # 系统自省
    ├── SkillModule            # 技能注册
    ├── ToolRegistryModule     # 工具注册（@Global）
    └── SoulModule             # Agent 人格（@Global）
```

---

## ERP 业务模块详解

### AuthModule — 管理端认证

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/auth/` |
| 职责 | 管理端用户登录、JWT 签发、密码校验 |
| 关键端点 | `POST /auth/login`、`POST /auth/profile` |
| 认证方式 | Passport + JWT（`JWT_SECRET`） |
| 密码加密 | bcrypt |

### SystemModule — 系统管理

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/system/` |
| 子模块 | user / role / permission / menu / audit / deployment / wizard / entity-sync / agent |
| 职责 | 用户 CRUD、角色权限、菜单树、审计日志、系统部署、初始化向导 |
| 关键特性 | RBAC 权限模型、审计日志自动记录、Wizard 4 步初始化 |

**子模块说明**：

- **user**：管理端用户管理，密码用 bcrypt 加盐
- **role**：角色管理，角色关联权限
- **permission**：权限管理，权限点对应 API 操作
- **menu**：菜单管理，动态菜单树
- **audit**：审计日志，记录关键操作（自动拦截器）
- **deployment**：系统部署信息（版本、健康度）
- **wizard**：首次启动初始化向导（数据库连接 → 建表 → 种子 → 登录）
- **entity-sync**：Entity 与数据库 schema 同步检查
- **agent**：Agent 清单管理（与 Core 的 AgentRegistry 对接）

### CustomerModule — 客户管理

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/customer/` |
| 职责 | 客户档案、会员等级、消费统计 |
| 关键实体 | `Customer`（客户）、会员等级定价关联 |

### CustomerAuthModule — C 端客户认证

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/customer-auth/` |
| 职责 | C 端客户登录（手机验证码）、独立 JWT |
| 认证方式 | 独立 JWT（`CUSTOMER_JWT_SECRET`，与管理端分离） |
| 守卫 | `CustomerAuthGuard` |
| 管理端 | `CustomerAuthAdminController`（管理 C 端会话） |

### ProductModule — 商品管理

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/product/` |
| 职责 | SPU/SKU/套装/定价/条码/命名引擎 |
| 关键服务 | `ProductService`、`ProductSkuService`、`ProductTierPricingService`、`WholesaleTierService` |
| 工具 | `barcode.generator.ts`（条码生成）、`naming-engine.ts`（SKU 命名）、`category-code.generator.ts` |
| 定价 | 阶梯定价（member-pricing-rule）、批发阶梯（wholesale-tier） |

### CategoryModule — 商品分类

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/category/` |
| 职责 | 商品分类树管理 |

### OrderModule — 订单管理

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/order/` |
| 职责 | 订单创建、状态流转、订单项 |
| 订单号前缀 | `OBA-`（v1.3.0 从 `MJ-` 改名） |

### InventoryModule — 库存管理

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/inventory/` |
| 职责 | 库存 CRUD、库存盘点、库存事务 |
| 关键服务 | `InventoryCrudService`、`InventoryStockService`、`InventoryTxService`（事务） |

### AfterSalesModule — 售后管理

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/after-sales/` |
| 职责 | 退货/换货/仅退款/维修 |
| 状态机 | `after-sales-state-machine.ts` |
| 类型 | `return` / `exchange` / `refund_only` / `repair` |

### ColorModule — 颜色设计

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/color/` |
| 职责 | 颜色设计项目、调色板、材料映射 |
| 实体 | `ColorDesignProject`、`ColorPaletteItem`、`ColorProjectColor`、`ColorMaterialMapping` |

### AestheticsModule — 美学搭配

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/aesthetics/` |
| 职责 | 美学搭配规则引擎、兼容性矩阵 |
| 实体 | `AestheticCompatMatrix` |

### StructureModule — 镜架结构标准

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/structure/` |
| 职责 | 镜架结构尺寸标准管理 |

### DictionaryModule — 数据字典

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/dictionary/` |
| 职责 | 系统数据字典（如颜色枚举、材质类型） |
| 缓存 | `DictConstantsModule` 启动时加载到内存 |

### SmsModule — 短信

| 项 | 说明 |
|----|------|
| 路径 | `src/modules/sms/` |
| 职责 | 阿里云短信发送（验证码登录） |
| 限流 | 验证码发送频率限制 |

### 其他业务模块

| 模块 | 职责 |
|------|------|
| `ReviewModule` | 商品评价 |
| `UploadModule` | 文件上传（multer） |
| `WebsiteModule` | 官网内容管理 |
| `DraftPoolModule` | 草稿池（AI 生成内容的暂存） |
| `SubSkuModule` | 子 SKU 管理 |
| `HealthModule` | 健康检查端点 `/health` |

---

## Core 引擎模块详解

### ERDLModule — 规则定义引擎

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/erdl/` |
| 职责 | ERDL 规则的 CRUD、热加载、快照、推荐、Playground |
| 核心类 | `ERDLRuleEngine`（规则执行）、`SafeExpr`（安全表达式）、`RuleStoreService`、`SnapshotManagerService` |
| 子模块 | playground / recommend / mcp（MCP 协议） |

**SafeExpr**：自研安全表达式引擎（纯递归下降解析器），替代了有漏洞的 `expr-eval@2.0.2`。

### ErosTaskModule — 任务工作流（含 ReAct 单工具决策 · P03）

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/eros/task/` |
| 职责 | Agent 任务的创建、执行、认知日志、知识库 |
| 实体 | `AgentTask`、`AgentRegistry`、`CognitiveLog`、`KnowledgeEntry`、`ReportTarget`、`PublishPackage` |
| 核心服务 | `AgentExecutorService`（含 `chatExecute`/`executeFileEdit`/`executeTscCheck`/`executeGitDiff`/`executeErdlCrud`） |

**专利机制（P03 ReAct 单工具决策）**：

- **单工具限制**：每轮循环只执行 `actions[0]`，即使 LLM 返回多个 tool_calls。执行完立即回填结果，LLM 下一轮基于真实结果再决策——避免并行全量执行的无用操作
- **三层思考事件**：优先级 `reasoning_content`（DeepSeek 思维链）→ `content`（普通回复）→ 前端降级（工具名+参数标签）
- **五类 SSE 事件**：`thought` → `tool_start` → `tool_end`（含耗时）→ `observation` → `round_done`
- **四层防线**：Token Budget 截断 / 用户中止检测 / 死循环检测（相同工具+相同参数）/ 软上限轮次

### ChatModule — WebSocket 对话（含 Action Guard · P02）

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/eros/chat/` |
| 职责 | Socket.io 连接管理、流式事件分发 |
| 事件 | `stream.thinking` / `stream.action` / `stream.observation` / `stream.done` |

**专利机制（P02 Action Guard 协议转换）**：

ChatModule 内嵌 Action Guard 协议转换层，在 LLM 原始输出与系统执行之间提供四模块流水线：

| 模块 | 职责 |
|------|------|
| **Intent Parser** | 四格式自适应解析：FC > JSON > XML > 文本，去重机制避免重复执行 |
| **Action Validator** | 三级校验：定义查证（Action 是否注册）→ 别名映射（"框型"→`shapeCode`）→ 完整性校验（必填/枚举/类型） |
| **Action Router** | Action → Service 路由执行 |
| **Output Cleaner** | 剥离 `<invoke>` 标签，用户看不到协议细节 |

一键回退：环境变量 `ERDL_ACTION_GUARD=false` 即时关闭整个转换层。

### MetaMirrorModule — 系统自省

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/meta-mirror/` |
| 职责 | 自动扫描模块/API/DTO/规则，注册为 AI 可用能力 |
| 扫描器 | `entity.scanner`、`api.scanner`、`dto.scanner`、`rule.scanner`、`module.scanner`、`erdl-audit.scanner` |
| 生成器 | `knowledge-writer.generator`（生成知识库条目）、`context-injector.generator`（精准上下文注入） |

**专利机制（P01 精准上下文注入）**：Skill 定义中的 `mirror_refs` 声明需要的 entities/apis/rules，注入器只提取声明范围内容，按"价格 > 标识 > 展示名 > 状态 > 枚举"优先级选取关键字段，组装为 200-500 tokens 的精准上下文块，相比全量注入**节省约 90% Token**。

**专利机制（P01 DTO 一致性审计）**：`erdl-audit.scanner` 自动扫描 Controller 的 `@Min`/`@Max`/`@IsNotEmpty`/`@IsEnum` 注解，与 ERDL 规则逐字段交叉比对，输出 5 态审计报告（OK/ERDL_STRICTER/CODE_STRICTER/ERDL_MISSING/CODE_MISSING）。

### AgentMemoryModule — Agent 记忆与自进化（P06）

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/eros/memory/`（AgentExecutorService 集成） |
| 职责 | 持久记忆存储、错误→记忆转化、按作用域精准注入、版本化生命周期 |
| 实体 | `agent_memory`、`agent_memory_link`、`agent_session`、`agent_error_log` |

**专利机制（P06）**：

- **错误→记忆转化链**：工具失败 → `agent_error_log` 记录 → 任务完成触发自我审查 → LLM 读取推理轨迹+错误 → 提取教训 → 创建 `agent_memory` → 下次同类任务自动注入
- **结构化记忆字段**：`category`（lesson/rule/discovery/preference）、`severity`（block/warning/info/success）、`scope`（global/task_type/entity/agent）
- **精准注入**：按 `scope + scope_value` 过滤，每次会话只注入 **≤8 条**相关记忆
- **版本化生命周期**：修改记忆创建新版本，旧版本标记 deprecated；状态流转 `active → stale（30天）→ archived（90天）`
- **混合存储**：运行数据（session/token/error）Append-Only 不可变；知识资产（memory）Mutable + 版本化

### SkillModule — 技能注册

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/eros/skill/` |
| 职责 | AI 技能注册中心、技能密钥保管 |
| 实体 | `SkillRegistry`、`SkillKeyVault`（PBKDF2 加密） |

### ToolRegistryModule — 工具注册

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/tool-registry/` |
| 职责 | AI 工具调用注册中心（@Global） |
| 认证 | `ToolAuthService`（工具鉴权） |

### SoulModule — Agent 人格

| 项 | 说明 |
|----|------|
| 路径 | `@openoba/core/dist/modules/soul/` |
| 职责 | 构建 Agent 身份、铁律、能力边界（@Global） |
| 构建器 | `AgentIdentityBuilder`、`IronRulesBuilder`、`RoleCapabilityBuilder` |
| 内容 | `system-soul.ts`（系统人格定义）、`iron-rules`（系统铁律/角色铁律/任务铁律） |
| 三层约束 | 身份（securityClearance）+ 能力（canEditCode/tools）+ 铁律（硬约束指令文本） |

---

## 公共组件（common/）

| 组件 | 路径 | 职责 |
|------|------|------|
| `PublicDecorator` | `common/decorators/public.decorator.ts` | 标记公开接口（跳过 JWT） |
| `RolesDecorator` | `common/decorators/roles.decorator.ts` | 角色权限装饰器 |
| `McpCapableDecorator` | `common/decorators/mcp-capable.decorator.ts` | MCP 能力标记 |
| `RolesGuard` | `common/guards/roles.guard.ts` | 角色守卫 |
| `RateLimiterModule` | `common/rate-limiter/` | 限流（Memory + Redis 双实现） |
| `ResponseDto` | `common/dto/response.dto.ts` | 统一响应格式 |
| `DictConstants` | `common/dict-constants.ts` | 字典常量缓存 |
| `SystemStatus` | `common/system-status.ts` | 系统状态枚举 |

## 延伸阅读

- ⭐ [ERA-Chat 总览](../era-chat/README.md) — 七层专利架构详解
- [架构总览](./overview.md) — 系统分层设计
- [数据库 Schema](../database/schema.md) — 表结构组织
- [API 概览](../api/overview.md) — 接口约定
- [安全架构](../security/security-architecture.md) — 认证授权 + 三重数据库校验
