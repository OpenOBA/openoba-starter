# 技术栈

> OpenOBA 用到的所有核心技术，以及选型理由。

---

## 总览

| 层 | 技术 | 用途 |
|----|------|------|
| **后端框架** | NestJS 11 | 模块化 Node.js 框架 |
| **ORM** | TypeORM 0.3 | MySQL 数据访问 |
| **数据库** | MySQL 8.0 | 业务数据存储 |
| **缓存/限流** | Redis（可选） | 生产环境限流 |
| **认证** | Passport + JWT | 双轨认证（管理端 + C 端） |
| **实时通信** | Socket.IO 4 | AI 流式输出 |
| **API 文档** | Swagger | OpenAPI 自动生成 |
| **校验** | Zod + class-validator | 运行时类型校验 |
| **前端框架** | Vue 3.5 | 渐进式 UI 框架 |
| **构建工具** | Vite | 前端构建 |
| **UI 库** | Element Plus | 企业级组件库 |
| **状态管理** | Pinia | 组合式状态管理 |
| **路由** | Vue Router | SPA 路由 |
| **语言** | TypeScript 5（后端）/ 6（前端） | 类型安全 |
| **测试** | Jest + Vitest + Playwright | 单元 + E2E |
| **代码质量** | ESLint + Prettier + Husky | 代码风格 + Git 钩子 |

---

## 后端

### NestJS 11

模块化架构 + 依赖注入。Controller → Service → Entity 三层分离。每个业务域为一个 `@Module()`。Core 引擎模块通过 `@openoba/core` barrel export 引用。

### TypeORM 0.3

与 NestJS 深度集成。Entity 通过 glob 模式自动扫描。连接池：`connectionLimit: 50`。字符集：`utf8mb4`。生产环境使用 `synchronize: false` + SQL 迁移。

### MySQL 8.0

ERP 场景的事务一致性（ACID）保障。JSON 字段支持 ERDL 规则存储和 AI 上下文。128+ 张表分为业务表（`product_spu`、`customer`）和系统表（`sys_` 前缀）。

### Socket.IO 4

ReAct 流式输出（Thought → Tool → Observation）通过 WebSocket 实时推送。房间机制支持多用户隔离。前端 `useWsClient` composable 封装连接管理。

---

## 前端

### Vue 3.5 + Composition API

所有页面使用 `<script setup lang="ts">`。逻辑复用通过 18 个 composables。大组件已拆分：Customers.vue 从 1,356 行降至 410 行。

### Vite

开发环境 HMR 毫秒级热更新。生产构建基于 Rollup。Vue 3 官方推荐。

### Element Plus

企业级组件库：表格、表单、弹窗，覆盖所有 ERP UI 场景。当前全量引入约 895KB，后续可改为按需引入。

### Pinia

Vue 3 推荐的状态管理方案。无 mutations 模板代码。完整 TypeScript 支持。

---

## LLM 提供商

| 提供商 | 推荐场景 |
|--------|---------|
| DeepSeek | 国内首选，性价比最高 |
| Qwen（通义千问） | 阿里云生态 |
| OpenAI | 国际场景 |
| GLM / MiniMax / Kimi | 已内置种子数据 |

API Key 在系统内配置（ERA-Chat → 设置 → API Key）。支持多 Key 轮询和 DB 优先路由。

---

## 测试

| 工具 | 范围 |
|------|------|
| Jest | 后端 + Core 单元测试 |
| Vitest | 前端单元测试 |
| Playwright | E2E 测试 |

---

## 版本要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18 | 20 LTS |
| MySQL | 8.0 | 8.0 |
| npm | 9 | 10 |

> ⚠️ 不支持 Node.js 16 及以下（NestJS 11 要求 ≥ 18）。

---

## 延伸阅读

- [架构总览](./overview.zh-CN.md)
- [开发环境搭建](../development/environment-setup.zh-CN.md)
- [编码规范](../development/coding-standards.zh-CN.md)
