# 后端模块清单

> OpenOBA 每个 NestJS 模块的职责和关键文件。

---

## 模块树

```
AppModule
├── 基础设施层
│   ├── ConfigModule          # 环境变量
│   ├── TypeOrmModule         # 数据库连接
│   ├── RateLimiterModule     # 限流（Redis/Memory 双模式）
│   └── ServeStaticModule     # 静态文件服务（uploads/）
│
├── ERP 业务模块（MIT）
│   ├── AuthModule            # 管理端认证
│   ├── SystemModule          # 用户 / 角色 / 权限 / 菜单
│   ├── CustomerModule        # 客户档案与会员
│   ├── CustomerAuthModule    # C 端客户认证（短信登录）
│   ├── ProductModule         # SPU / SKU / 套装 / 定价 / 条码
│   ├── CategoryModule        # 商品分类
│   ├── OrderModule           # 订单与状态机
│   ├── InventoryModule       # 库存 / 调拨 / 预警
│   ├── AfterSalesModule      # 退货 / 换货 / 退款 / 维修
│   ├── ColorModule           # 颜色设计与调色板
│   ├── AestheticsModule      # 美学搭配规则
│   ├── StructureModule       # 镜架结构标准
│   ├── DictionaryModule      # 数据字典（枚举、常量）
│   ├── SmsModule             # 阿里云短信
│   ├── ReviewModule          # 商品评价
│   ├── UploadModule          # 文件上传（multer）
│   ├── WebsiteModule         # 官网内容
│   ├── DraftPoolModule       # AI 生成内容暂存
│   ├── SubSkuModule          # 子 SKU 管理
│   ├── HealthModule          # 健康检查端点 /health
│   └── SchemaModule          # ERDL Schema 定义
│
└── Core 引擎模块（BSL 1.1，通过 @openoba/core 引用）
    ├── ERDLModule            # 规则引擎与语义协议
    ├── ErosTaskModule        # 任务工作流（ReAct 循环）
    ├── ChatModule            # WebSocket 对话与流式输出
    ├── MetaMirrorModule      # 源码扫描与自知
    ├── AgentMemoryModule     # 持久记忆与进化
    ├── SkillModule           # 技能注册
    ├── ToolRegistryModule    # 工具注册（@Global）
    └── SoulModule            # Agent 人格（@Global）
```

---

## Core 引擎模块

### ERDLModule — 语义协议引擎

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | ERDL 规则 CRUD、热加载、快照、推荐 |
| 核心类 | `ERDLRuleEngine`、`SafeExpr`、`RuleStoreService`、`SnapshotManagerService` |

**SafeExpr**：自研递归下降表达式引擎，零代码注入风险。替代 `expr-eval@2.0.2`。

### ErosTaskModule — ReAct 任务工作流

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | Agent 任务创建、执行、认知日志、知识库 |
| 核心实体 | `AgentTask`、`CognitiveLog`、`KnowledgeEntry` |

**ReAct 单工具决策**：每轮一个工具，观察结果后再决策。四层防线：Token 预算截断、用户中止检测、死循环检测、软上限轮次。五类 SSE 事件：`thought → tool_start → tool_end → observation → round_done`。

### ChatModule — WebSocket 流式与 Action Guard

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | Socket.IO 连接管理、流式事件分发 |

**Action Guard 流水线**：LLM 输出经过四个模块才可执行：
1. **Intent Parser** — 四格式自适应解析（FC > JSON > XML > 文本）
2. **Action Validator** — 三级校验：定义查证 → 别名映射 → 完整性
3. **Action Router** — Action → Service 路由执行
4. **Output Cleaner** — 剥离协议细节

可通过 `ERDL_ACTION_GUARD=false` 环境变量即时关闭。

### MetaMirrorModule — 自知引擎

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | 自动扫描 Entity/API/DTO/规则，注册为 AI 可用能力 |
| 扫描器 | `entity.scanner`、`api.scanner`、`dto.scanner`、`rule.scanner` |

精准上下文注入：只提取声明范围内容（~200-500 tokens），比全量注入节省约 90% Token。DTO 一致性审计：交叉比对 `@Min/@Max/@IsEnum` 装饰器与 ERDL 规则。

### AgentMemoryModule — 持久记忆与进化

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | 持久记忆存储、错误→记忆转化、按作用域精准注入、版本化生命周期 |

**错误→记忆转化链**：工具失败 → 错误日志 → 任务完成自审 → 提取教训 → 创建 `agent_memory` → 下次自动注入。结构化字段：`category`、`severity`、`scope`、`scope_value`。每次会话注入 ≤8 条相关记忆。版本周期：`active → stale（30天） → archived（90天）`。

### SkillModule — 技能注册

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | AI 技能注册中心、技能密钥保管（PBKDF2 加密） |

### ToolRegistryModule — 工具注册

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | 全局工具调用注册中心（`@Global`）、工具鉴权 |

### SoulModule — Agent 人格

| 路径 | `@openoba/core` |
|------|-----------------|
| 职责 | Agent 身份、约束、能力边界（`@Global`） |
| 三层约束 | 身份（`securityClearance`）+ 能力（`canEditCode`、tools）+ 铁律（硬约束指令） |

---

## ERP 业务模块

| 模块 | 路径 | 关键实体与功能 |
|------|------|--------------|
| **AuthModule** | `src/modules/auth/` | 管理端登录、JWT 签发、bcrypt 密码 |
| **SystemModule** | `src/modules/system/` | 用户、角色、权限（RBAC）、菜单、审计日志、部署健康度、Wizard 初始化 |
| **CustomerModule** | `src/modules/customer/` | 客户档案、会员等级、消费统计 |
| **CustomerAuthModule** | `src/modules/customer-auth/` | C 端短信登录、独立 JWT 密钥 |
| **ProductModule** | `src/modules/product/` | SPU/SKU/套装/定价、条码生成、SKU 命名引擎、阶梯定价 |
| **CategoryModule** | `src/modules/category/` | 商品分类树 |
| **OrderModule** | `src/modules/order/` | 订单、状态机、订单项。前缀：`OBA-` |
| **InventoryModule** | `src/modules/inventory/` | 库存 CRUD、库存事务、库存预警 |
| **AfterSalesModule** | `src/modules/after-sales/` | 退/换/退款/维修、状态机 |
| **ColorModule** | `src/modules/color/` | 颜色设计、调色板、材料映射 |
| **AestheticsModule** | `src/modules/aesthetics/` | 美学搭配规则、兼容性矩阵 |
| **StructureModule** | `src/modules/structure/` | 镜架结构尺寸标准 |
| **DictionaryModule** | `src/modules/dictionary/` | 系统字典、启动时缓存常量 |
| **SmsModule** | `src/modules/sms/` | 阿里云短信、验证码限频 |
| **ReviewModule** | `src/modules/review/` | 商品评价 |
| **UploadModule** | `src/modules/upload/` | 文件上传（multer） |
| **WebsiteModule** | `src/modules/website/` | 官网内容管理 |
| **DraftPoolModule** | `src/modules/draft-pool/` | AI 生成内容暂存 |
| **SubSkuModule** | `src/modules/sub-sku/` | 子 SKU 管理 |
| **HealthModule** | `src/modules/health/` | 健康检查端点 `/health` |
| **SchemaModule** | `src/modules/schema/` | ERDL Schema 定义 |

---

## 公共组件（`common/`）

| 组件 | 用途 |
|------|------|
| `PublicDecorator` | 标记公开接口（跳过 JWT） |
| `RolesDecorator` | 角色权限装饰器 |
| `RolesGuard` | 角色守卫 |
| `RateLimiterModule` | Memory + Redis 限流实现 |
| `ResponseDto` | 统一 API 响应格式 |
| `DictConstants` | 字典常量缓存 |

---

## 延伸阅读

- [架构总览](./overview.zh-CN.md)
- [ERDL 协议](../erdl/overview.zh-CN.md)
- [数据库 Schema](../database/schema.zh-CN.md)
- [API 总览](../api/overview.zh-CN.md)
