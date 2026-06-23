# 技术栈

> OpenOBA Starter 用到的所有核心技术，以及为什么选它们

## 技术栈一览

| 层 | 技术 | 版本 | 用途 |
|----|------|------|------|
| **后端框架** | NestJS | 11.x | 模块化 Node.js 框架 |
| **ORM** | TypeORM | 0.3.x | MySQL 数据访问 |
| **数据库** | MySQL | ≥ 8.0 | 业务数据存储 |
| **缓存/限流** | Redis（可选） | - | 生产环境限流 |
| **认证** | Passport + JWT | - | 双轨认证（管理端 + C 端） |
| **实时通信** | Socket.io | 4.x | AI 流式输出 |
| **API 文档** | Swagger | 11.x | OpenAPI 自动生成 |
| **校验** | Zod + class-validator | - | 运行时类型校验 |
| **前端框架** | Vue | 3.5.x | 渐进式 UI 框架 |
| **构建工具** | Vite | 8.x | 前端构建 |
| **UI 库** | Element Plus | 2.14.x | 企业级组件库 |
| **状态管理** | Pinia | 3.x | 组合式状态管理 |
| **路由** | Vue Router | 5.x | SPA 路由 |
| **HTTP** | Axios | 1.x | 前端请求 |
| **语言** | TypeScript | 5.x（后端）/ 6.x（前端） | 类型安全 |
| **测试** | Jest + Vitest + Playwright | - | 单元 + E2E |
| **代码质量** | ESLint + Prettier + Husky | - | 代码风格 + Git 钩子 |

---

## 后端技术栈详解

### NestJS 11

**为什么选 NestJS**：模块化设计天然适合大型 ERP 系统。依赖注入（DI）让 Core 引擎和 ERP 业务解耦，Controller/Service/Entity 三层结构清晰。

**关键用法**：
- `@Module()` 组织业务边界，每个业务域一个模块
- `@Injectable()` 服务自动注入，Core 模块通过 barrel export 被 ERP 引用
- `@Guard()` 守卫统一处理认证授权
- `@Interceptor()` 拦截器统一处理响应格式、审计日志
- `@Catch()` 异常过滤器统一错误响应

### TypeORM 0.3

**为什么选 TypeORM**：与 NestJS 深度集成，Active Record 和 Data Mapper 两种模式都支持。Entity 定义即文档，`synchronize: false` 在生产环境强制使用 SQL 迁移。

**关键用法**：
- Entity 通过 `__dirname + '/**/*.entity{.ts,.js}'` glob 自动扫描
- Core 引擎的 Entity 显式注册（不依赖 glob，避免路径问题）
- 连接池：`connectionLimit: 50`，`connectTimeout` 可配
- 字符集：`utf8mb4`（支持 emoji 和生僻字）

### MySQL 8.0

**为什么选 MySQL**：眼镜行业 ERP 涉及大量事务（订单、库存），MySQL 的事务一致性成熟可靠。8.0 版本支持 JSON 字段（用于存储 ERDL 规则配置、AI 上下文）。

**关键配置**：
- 字符集 `utf8mb4` + 排序规则 `utf8mb4_unicode_ci`
- 128+ 张表，分两大类：业务表（如 `product_spu`）和系统表（`sys_` 前缀）
- 表结构通过 `database/init-structure.sql` 初始化，使用 `CREATE TABLE IF NOT EXISTS`

### Socket.io 4

**为什么选 Socket.io**：AI 执行官的 ReAct 推理是流式的（思考 → 行动 → 观察逐字输出），WebSocket 是天然选择。Socket.io 的房间机制支持多用户隔离。

**关键用法**：
- `ChatModule` 管理 WebSocket 连接
- 流式事件：`stream.thinking` / `stream.action` / `stream.observation` / `stream.done`
- 前端 `useWsClient` composable 封装连接管理

---

## 前端技术栈详解

### Vue 3.5 + Composition API

**为什么选 Vue 3**：Composition API 让逻辑复用更自然（通过 composables），`<script setup>` 语法简洁。Vue 3.5 的响应式系统性能优秀。

**关键用法**：
- 所有页面用 `<script setup lang="ts">`
- 逻辑复用通过 `composables/` 下的组合式函数（如 `useCustomers`、`useProductSku`）
- 大组件已拆分（Customers.vue 从 1356 行降到 410 行）

### Vite 8

**为什么选 Vite**：开发体验极佳（HMR 毫秒级），生产构建基于 Rollup。Vue 3 官方推荐。

### Element Plus 2.14

**为什么选 Element Plus**：企业级组件库，表格、表单、弹窗等 ERP 高频组件完整。中文文档友好。

**已知问题**：全量引入导致 bundle 较大（895KB），后续可改为按需引入优化。

### Pinia 3

**为什么选 Pinia**：Vue 3 官方推荐的状态管理，API 更简洁（无 mutations），TypeScript 支持优秀。

---

## 工具链详解

### TypeScript

**版本差异**：
- 后端 / Core：TypeScript 5.1（NestJS 生态稳定）
- 前端：TypeScript 6.0（Vue 生态跟进）

**已知债务**：前端有 689+ 类型错误，正在逐步清理（CI 已对后端/Core 启用 `any` 零容忍）。

### ESLint + Prettier

- ESLint 8 + `@typescript-eslint` 插件
- `eslint-plugin-security` 检测安全隐患
- `eslint-plugin-no-secrets` 防止密钥提交
- Prettier 3 统一格式化
- Husky 9 在 pre-commit 钩子执行 lint

### Jest + Vitest + Playwright

| 工具 | 范围 | 配置 |
|------|------|------|
| Jest 29 | 后端 + Core 单元测试 | `packages/backend/package.json` 的 `jest` 字段 |
| Vitest 4 | 前端单元测试 | `frontend/vitest.config.ts` |
| Playwright | E2E 测试 | `playwright.config.ts` |

**当前覆盖率**：后端约 9%（3/34 controller），目标 50%+。

---

## 外部依赖

### LLM API

| Provider | 推荐场景 | 注册地址 |
|----------|---------|---------|
| DeepSeek | 国内首选，性价比高 | platform.deepseek.com（新用户免费 500 万 token） |
| Qwen（通义千问） | 阿里云生态 | dashscope.aliyun.com |
| OpenAI | 国际场景 | platform.openai.com |
| GLM / MiniMax / Kimi | 已内置种子数据 | - |

API Key 在系统内配置（**ERA-Chat → 设置 → API Key**），支持多 Key 轮询和 DB 优先路由。

### 阿里云短信（可选）

用于 C 端客户手机验证码登录。需要在 `.env` 配置 `ALIYUN_SMS_*` 环境变量。

---

## 版本兼容性

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18 | 20 LTS |
| MySQL | 8.0 | 8.0 |
| npm | 9 | 10 |
| 浏览器 | Chrome 90+ / Edge 90+ / Firefox 88+ | 最新版 |

> ⚠️ 不支持 Node.js 16 及以下（NestJS 11 要求 Node.js ≥ 18）。

## 延伸阅读

- [架构总览](./overview.md) — 系统分层设计
- [开发环境搭建](../development/environment-setup.md) — 本地搭建开发环境
- [编码标准](../development/coding-standards.md) — 代码规范
