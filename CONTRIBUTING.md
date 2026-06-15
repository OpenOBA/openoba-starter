# Contributing to OpenOBA

感谢你关注 OpenOBA！
OpenOBA 是**企业的 AI 执行官**——一个 AI Agent 操作系统，让企业通过自然语言完成运营和开发。

## 行为准则

本项目遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。请阅读 CODE_OF_CONDUCT.md。

## 如何贡献

### 🐛 报告 Bug

1. 在 GitHub Issues 搜索是否已有相同问题
2. 新建 Issue，使用 Bug Report 模板
3. 包含：
   - 版本号（`/api/health` 可查）
   - 复现步骤
   - 预期 vs 实际行为
   - 环境信息（OS、Node.js 版本、数据库版本）

### 💡 功能建议

1. 在 Issues 中创建 Feature Request
2. 描述使用场景和期望的行为
3. 等待 maintainer 确认方向后再开始编码

### 🔧 提交代码

#### 开发环境
- **Node.js** >= 18
- **MySQL** >= 8.0
- **npm** >= 9

```bash
# 克隆并安装
git clone <repo-url>
cd openoba-starter
npm install

# 编译后端
npm run build:backend

# 启动开发模式
npm run start:backend    # 后端 http://localhost:3000
npm run start:frontend   # 前端 http://localhost:5173

# 运行测试
npm test -w packages/backend
npm run test -w frontend
```

#### 分支策略

- `master` — 稳定版本
- `feat/xxx` — 新功能
- `fix/xxx` — Bug 修复
- `docs/xxx` — 文档变更

#### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：
```
feat: 新增 Wizard 初始化向导
fix: 修复 Swagger 生产环境暴露
docs: 更新 API 文档
chore: 升级 TypeScript 至 5.1
refactor: 拆分 OrderService
test: 新增库存模块集成测试
```

#### 提交前检查
```bash
npm run lint          # ESLint 检查
npm run format:check  # Prettier 格式检查
npm test -w packages/backend  # 后端测试
```

所有 PR 合并前必须通过 CI 流水线。

#### Pull Request 流程

1. Fork 仓库
2. 创建功能分支
3. 编写代码 + 测试
4. 运行 `npm run lint` 和 `npm test`
5. 提交 PR，填写模板
6. 等待 Code Review

### 📉 文档

- 新增 API 端点需要同步更新 Swagger 注解
- 架构变更需要更新 `docs/` 中的对应文档
- 使用中文编写文档（注释可用英文）

## 项目结构

```
openoba-starter/
├── packages/
│   ├── backend/         # NestJS 后端（行业 ERP 逻辑）
│   │   └── src/
│   │       ├── common/      # 通用组件（守卫/拦截器/过滤器）
│   │       ├── config/      # 配置
│   │       ├── modules/     # 业务模块（product/customer/order/...）
│   │       └── schemas/     # ERDL Schema 定义
│   └── types/           # @openoba/types 共享类型包
├── frontend/            # Vue 3 前端
│   └── src/
│       ├── api/         # API 封装
│       ├── components/  # 通用组件
│       ├── composables/ # 组合式函数
│       ├── views/       # 页面视图
│       └── stores/      # Pinia 状态
├── openoba-core/        # CORE 引擎（闭源 BSL）
├── docs/                # 内部文档
└── database/            # 数据库脚本
```

## 许可

OpenOBA Starter 后端和前端采用 **MIT** 许可。OpenOBA Core 引擎采用 **BSL**（Business Source License）。
提交代码即表示你同意在 MIT 许可下分发你的贡献。
