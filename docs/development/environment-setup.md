# 开发环境搭建

> 从零搭建本地开发环境，参与 OpenOBA Starter 代码贡献

## 前置要求

| 工具 | 版本 | 用途 |
|------|------|------|
| **Node.js** | ≥ 18（推荐 20 LTS） | 运行时 |
| **npm** | ≥ 9 | 包管理 |
| **MySQL** | ≥ 8.0 | 数据库 |
| **Git** | 任意 | 版本控制 |
| **VS Code**（推荐） | 最新 | IDE |

### 推荐的 VS Code 插件

| 插件 | 用途 |
|------|------|
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Volar** | Vue 3 支持 |
| **TypeScript Vue Plugin** | Vue TS 支持 |
| **Database Client**（如 MySQL） | 数据库管理 |
| **REST Client** | API 测试 |
| **GitLens** | Git 增强 |

---

## 搭建步骤

### 1. Fork 并克隆仓库

```bash
# 在 GitHub 上 Fork 仓库，然后：
git clone https://github.com/你的用户名/openoba-starter.git
cd openoba-starter

# 添加上游远程
git remote add upstream https://github.com/openoba/openoba-starter.git
```

### 2. 安装依赖

```bash
npm install
```

项目使用 npm workspaces，会自动安装所有子包依赖。

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，设置 `DB_PASSWORD` 和 `JWT_SECRET`（开发环境可用简单值）：

```ini
APP_ENV=development
OPENOBA_MODE=developer
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的开发数据库密码
DB_DATABASE=openoba_starter_dev
JWT_SECRET=dev_jwt_secret_at_least_32_chars_long
CUSTOMER_JWT_SECRET=dev_customer_jwt_secret_32_chars
CORS_ORIGIN=http://localhost:5173
```

> 💡 开发环境建议用独立的数据库（如 `openoba_starter_dev`），与测试数据隔离。

### 4. 创建开发数据库

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS openoba_starter_dev DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 5. 配置 Git 钩子

项目已集成 Husky（pre-commit 钩子执行 lint）。安装依赖后自动启用：

```bash
# 验证 Husky 已配置
ls .husky/
# 应看到 pre-commit 文件
```

### 6. 启动开发服务

**方式 A：分别启动（推荐开发）**

```bash
# 终端 1：启动后端（开发模式，支持热重载）
cd packages/backend
npm run start:dev    # http://localhost:3400

# 终端 2：启动前端（Vite HMR）
cd frontend
npm run dev          # http://localhost:5173
```

**方式 B：根目录启动**

```bash
npm run start:backend    # 后端
npm run start:frontend   # 前端（另开终端）
```

> ⚠️ 注意：根目录 `npm run start:backend` 运行的是编译后的 `dist/main.js`，不支持热重载。开发时建议用 `packages/backend` 下的 `npm run start:dev`。

### 7. 初始化数据库

首次启动后，浏览器打开 `http://localhost:5173`，按向导完成初始化（建表 + 种子数据）。

---

## 开发工作流

### 分支策略

```bash
# 从最新的 master 创建功能分支
git checkout master
git pull upstream master
git checkout -b feat/your-feature-name
```

分支命名规范（Conventional Commits）：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feat/` | 新功能 | `feat/customer-export` |
| `fix/` | Bug 修复 | `fix/order-total-calc` |
| `docs/` | 文档 | `docs/api-reference` |
| `refactor/` | 重构 | `refactor/inventory-service` |
| `test/` | 测试 | `test/order-module` |
| `chore/` | 构建/工具 | `chore/upgrade-nestjs` |

### 日常开发循环

```bash
# 1. 写代码 + 写测试

# 2. 运行 lint（Husky 会在 commit 时自动执行）
npm run lint:all

# 3. 运行测试
npm test -w packages/backend    # 后端测试
npm test -w frontend            # 前端测试

# 4. 类型检查
npx tsc --noEmit -p packages/core/tsconfig.json
npx tsc --noEmit -p packages/backend/tsconfig.json
cd frontend && npx vue-tsc --noEmit -p tsconfig.json && cd ..

# 5. 提交
git add .
git commit -m "feat(product): add batch import for SKUs"
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**类型**：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `perf` / `style` / `ci`

**示例**：
```
feat(agent): add multi-model routing for ReAct loop

- Support fallback when primary model fails
- Add ModelRouter service with round-robin strategy
- Closes #123
```

### 同步上游

```bash
git fetch upstream
git rebase upstream/master
# 解决冲突后
git push origin feat/your-feature-name --force-with-lease
```

### 提交 PR

1. Push 到你的 Fork
2. 在 GitHub 创建 PR，目标分支 `master`
3. 填写 PR 模板（[模板见此](../../.github/PULL_REQUEST_TEMPLATE.md)）
4. 等待 CI 通过 + Code Review
5. 首次贡献需签署 [CLA](../../CLA.md)

---

## 项目结构导览

```
openoba-starter/
├── packages/
│   ├── backend/src/          # ← 后端开发主要在这里
│   │   ├── common/           # 通用组件（守卫/装饰器/限流）
│   │   ├── config/           # 配置
│   │   ├── modules/          # 业务模块（每个模块一个目录）
│   │   │   └── product/      # 示例：商品模块
│   │   │       ├── product.module.ts
│   │   │       ├── product.service.ts
│   │   │       ├── product.controller.ts
│   │   │       ├── product.service.spec.ts  # 测试
│   │   │       ├── dto/      # 数据传输对象
│   │   │       ├── entity/   # TypeORM 实体
│   │   │       └── utils/    # 工具函数
│   │   └── schemas/          # ERDL Schema
│   ├── core/src/             # Core 引擎（BSL，谨慎修改）
│   └── types/                # 共享类型
├── frontend/src/             # ← 前端开发主要在这里
│   ├── api/                  # API 封装（axios）
│   ├── components/           # 通用组件
│   ├── composables/          # 组合式函数
│   ├── views/                # 页面
│   ├── stores/               # Pinia 状态
│   ├── router/               # 路由
│   └── types/                # 类型定义
├── database/                 # SQL 脚本
└── docs/                     # 文档
```

### 后端模块约定

新增业务模块时，遵循以下结构：

```
src/modules/your-module/
├── your-module.module.ts       # 模块定义
├── your-module.controller.ts   # 控制器（路由）
├── your-module.service.ts      # 业务逻辑
├── your-module.service.spec.ts # 单元测试
├── your-module.constants.ts    # 常量/枚举
├── dto/                        # 请求/响应 DTO
│   └── your-module.dto.ts
└── entity/                     # TypeORM 实体
    └── your-module.entity.ts
```

然后在 `app.module.ts` 的 `imports` 数组中注册。

---

## 调试技巧

### 后端调试（VS Code）

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeArgs": ["--inspect-brk", "dist/main.js"],
      "cwd": "${workspaceFolder}/packages/backend",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

然后 F5 启动调试，可设断点。

### 前端调试

Vite 开发模式默认启用 source map，直接在 VS Code 或浏览器 DevTools 设断点。

### 数据库调试

开启 TypeORM SQL 日志（仅开发环境）：

`app.module.ts` 中 `logging: configService.get('APP_ENV') === 'development'` 已配置。设置 `APP_ENV=development` 即可看到所有 SQL。

### Swagger API 调试

开发模式下访问 `http://localhost:3400/docs`（如果启用 Swagger）查看交互式 API 文档。

---

## 常见开发问题

### 修改了 Core 包但后端没生效

Core 是独立编译的 npm 包。修改 Core 后需要重新编译：

```bash
npm run build -w packages/core
# 然后重启后端
```

### 前端类型检查失败

前端有历史类型债务（689+ 错误）。CI 暂未对前端强制类型检查，但新代码应避免新增 `any`。

### 测试需要数据库

后端测试需要 MySQL。CI 会自动起 MySQL 容器，本地需确保 MySQL 运行且测试数据库存在：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS openoba_starter_test DEFAULT CHARACTER SET utf8mb4;"
```

---

## 下一步

- 📖 [编码标准](./coding-standards.md) — 代码风格和规范
- 📖 [测试指南](./testing.md) — 怎么写测试
- 📖 [贡献指南](../../CONTRIBUTING.md) — PR 完整流程
- 📖 [架构总览](../architecture/overview.md) — 理解系统设计
