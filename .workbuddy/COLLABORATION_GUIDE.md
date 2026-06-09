# OpenOBA — WorkBuddy 协作指南

> 创建：2026-06-09 14:00 ｜ 作者：唐浩然（OpenOBA AI 执行官）
> 目标：为 WorkBuddy（Henry 的代码执行 Agent）提供完整的项目环境与工作指引

---

## 一、你是谁，你在哪

- **唐浩然**（OpenClaw 上的 AI 执行官）负责架构设计、方案制定、代码审查、全局决策
- **WorkBuddy** 负责批量代码替换、import 迁移、编译验证、规范性修
- **Henry** 在两方中间协调、决策、审核

---

## 二、项目概览

### 2.1 OpenOBA 是什么

OpenOBA 是企业的 AI 执行官平台。核心技术栈：

```
NestJS + TypeScript + TypeORM + MySQL（后端）
Vue 3 + Element Plus + TypeScript + Vite（前端）
Socket.IO（实时通信）
npm workspaces（monorepo）
```

### 2.2 仓库结构

```
C:\Users\99tan\openoba\
├── repos\
│   ├── openoba-core\        ← 核心引擎（auth, erdl, eros, meta-mirror, system, soul）
│   └── openoba-starter\     ← 标准发行版（CORE + ERP 行业参考实现）
│       ├── packages\backend\    ← 后端源码（NestJS）
│       │   └── src\modules\     ← 业务模块
│       ├── frontend\            ← 前端源码（Vue 3）
│       ├── database\            ← SQL 脚本
│       ├── docs\                ← 文档
│       ├── skills\              ← Agent Skills
│       └── start.bat            ← 一键启动脚本
├── docs\                    ← 工程文档（总清单、规范等）
└── memory\                  ← 每日日志
```

### 2.3 两层架构（CORE vs ERP）

```
┌─────────────────────────────┐
│  openoba-starter (ERP 层)    │  ← WorkBuddy 主要工作区
│  packages/backend/src/       │
│  modules/order/              │  ← 订单（依赖 CORE）
│  modules/customer/           │  ← 客户（依赖 CORE）
│  modules/inventory/          │  ← 库存（依赖 CORE）
│  modules/product/            │  ← 商品（依赖 CORE）
│  modules/after-sales/        │  ← 售后（依赖 CORE）
│  modules/sms/                │  ← 短信（独立）
│  modules/dictionary/         │  ← 字典（独立）
│  modules/health/             │  ← 健康检查（独立）
│  modules/...                 │
├─────────────────────────────┤
│  openoba-core (引擎层)       │  ← 不改或极少改
│  backend/src/modules/        │
│  modules/auth/               │  ← 认证（JWT）
│  modules/erdl/               │  ← ERDL 协议引擎
│  modules/eros/               │  ← Agent 执行引擎
│  modules/meta-mirror/        │  ← 元镜（代码→知识库）
│  modules/system/             │  ← 系统管理
│  modules/soul/               │  ← Agent SOUL 构建器
└─────────────────────────────┘
```

### 2.4 关键技术事实

| 事实 | 说明 |
|------|------|
| CORE 以 npm 包形式引入 | `@openoba/core` 通过 `file:.tgz` 在 `packages/backend/package.json` 中 |
| ERP 层 42 处直接 import CORE | `import { X } from '@openoba/core'` 是当前方式 |
| CORE 模块通过 `@openoba/core` barrel 统一导出 | 入口在 `openoba-core/backend/src/index.ts` |
| npm 10.9.7 有 arborist dedup bug | **安装任何新包必须带 `--install-strategy=nested`**（已固化 `.npmrc`） |
| MySQL 5.7+ / Node 22 | 运行环境 |
| 端口 | Backend 3400 · Frontend 5173 · Staging 3001 |

---

## 三、环境准备清单

### 3.1 WorkBuddy 需要安装/确认的

```
✅ Node.js v22.22.2       — 已确认
✅ npm 10.9.7             — 已确认
✅ Git                    — 已确认
✅ MySQL 5.7+             — 需确认运行中
⚠️ 数据库初始化           — 见 3.3
```

### 3.2 工作空间设置

```
cd C:\Users\99tan\openoba\repos\openoba-starter

# 1. 安装依赖（如果 node_modules 不存在）
npm install --install-strategy=nested

# 2. 编译 backend
cd packages\backend
npx tsc --noEmit         # 类型检查：应为 0 errors

# 3. 编译 frontend
cd ..\..\frontend
npx vue-tsc --noEmit     # 类型检查：应为 0 errors

# 4. 启动后端（需要 MySQL 运行中 + 已初始化数据库）
cd ..\packages\backend
node dist/main.js         # 或 npm run start:dev（有 watch）

# 5. 启动前端
cd ..\..\frontend
npx vite --host 0.0.0.0  # 开发模式

# 6. 一键启动
cd C:\Users\99tan\openoba\repos\openoba-starter
start.bat
```

### 3.3 数据库

```
数据库名：openoba_starter（或 eyewear_erp，看 .env 配置）
初始化：第一次启动时 Wizard 页面引导（http://localhost:5173/wizard）
或手动执行：database/init.sql
```

---

## 四、代码规范（V1.4-a 已建立）

### 4.1 提交前检查（pre-commit hook）

```bash
# 每次 git commit 自动触发：
# 1. ESLint（packages/backend/src/**/*.ts，max-warnings 200）
# 2. tsc --noEmit（类型检查）
# 任何失败 → commit 被阻止
```

### 4.2 手动检查命令

```bash
# ESRC
npx eslint "src/**/*.ts" --max-warnings 200

# 格式化
npx prettier --check "src/**/*.ts"
npx prettier --write "src/**/*.ts"   # 自动修复

# 类型检查
npx tsc --noEmit
```

### 4.3 命名规范

```
文件名：     kebab-case.ts（如 order.service.ts）
类名：       PascalCase（如 OrderService）
方法/变量：  camelCase（如 createOrder）
常量：       UPPER_SNAKE_CASE（如 MAX_LOGIN_ATTEMPTS）
Entity列：   snake_case DB列 → camelCase TS属性
```

### 4.4 开发铁律（Henry 确立，不可妥协）

1. **质量是唯一指标** — 提交前必须通过编译+启动+功能三重验证
2. **问题如实记录** — 遇到问题必须记录并知会 Henry
3. **全局视角** — 不 hack，不 workaround，考虑全链路影响
4. **先搞清楚再动手** — 先理解现状、根因、影响范围，再执行

---

## 五、npm 使用注意事项（重要！）

```
⚠️ npm 10.9.7 有 arborist dedup bug
   → .npmrc 已设置 install-strategy=nested
   → 任何 npm install 新包都会使用 nested 策略
   → 不要删除 .npmrc 中的这一行
   → 如果 install 失败，确认 command 中不含 --install-strategy 覆盖参数
```

---

## 六、协作分工

| 阶段 | 唐浩然 | WorkBuddy |
|------|--------|-----------|
| **设计** | Interface 定义、架构方案 | — |
| **实现** | 核心逻辑、复杂重构 | 批量 import 替换、常量迁移、配置 |
| **验证** | 代码审查 | 编译验证、lint 修复 |
| **测试** | 策略制定 | 单元测试编写 |

---

## 七、常用路径速查

| 说明 | 路径 |
|------|------|
| 工程总清单 | `C:\Users\99tan\openoba\docs\OpenOBA-工程总清单-V1.3-V1.5.md` |
| V1.4-a 追踪表 | `C:\Users\99tan\openoba\docs\schema-tracker\v1.4-a-tracking.md` |
| Starter 后端源码 | `repos\openoba-starter\packages\backend\src\` |
| CORE 后端源码 | `repos\openoba-core\backend\src\` |
| 前端源码 | `repos\openoba-starter\frontend\src\` |
| .env 配置 | `repos\openoba-starter\packages\backend\.env` |
