# OpenOBA Starter

> **AI 数字执行官 · 眼镜行业 ERP** — 不用写代码就能开发自己的 ERP，不用记菜单就能运营自己的业务

[![License: MIT + BSL](https://img.shields.io/badge/License-MIT%20%2F%20BSL-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![MySQL](https://img.shields.io/badge/MySQL-%3E%3D8.0-orange.svg)](https://www.mysql.com)
[![Version](https://img.shields.io/badge/version-1.4.0--alpha9-red.svg)](./CHANGELOG.md)
[![Patents](https://img.shields.io/badge/Patents-7%20granted-blue.svg)](./docs/era-chat/README.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

OpenOBA Starter 是一个**自指（self-referential）的 ERP 系统**：它内置一个 AI 执行官，住在 **ERA-Chat** 里，能读懂自己的源码、改写自己的代码、运营自己的业务。这套能力建立在 **7 项发明专利**之上——从语义地基（ERDL）到协议转换（Action Guard）到单工具决策（ReAct）到记忆自进化（Agent Memory），形成完整的七层架构。你不再需要 clone → 装环境 → 读源码 → 提 PR 这套传统二开流程——登录、对话、需求上线。

> 📖 **这个项目没有一行人类代码**。它由一个完全不懂开发的项目发起人，与 DeepSeek V4 Pro / Qwen 3.6 历时近 120 天、上百轮对话共创而成。完整故事见 [OpenOBA 诞生记](./docs/origin-story.md)。

## 为什么用它

传统开源 ERP 的二次开发是开发者的事：看 README、读源码、写代码、提 PR、等 Review。OpenOBA 把这件事重新定义为**人机协作的对话**：

| 传统开源 ERP 二开 | OpenOBA ERA-Chat 二开 |
|---|---|
| `git clone` → 装环境 → 跑起来 | 登录系统，进入 ERA-Chat |
| 读 README、读源码、画时序图 | AI 用 Meta-Mirror **自己读自己的代码** |
| 写代码、改 Entity、加 Controller | AI 用 `file-edit` skill **自己改自己的代码** |
| `npm run build` 排错 | AI 用 `tsc-check` skill **自己跑类型检查** |
| `git diff` 自查、写 PR | AI 用 `git-diff` skill **自己生成 diff** |
| 等 Review、合并、部署 | AI 打包成 **Deliverable** 交付，你 review 后发布 |

不是"AI 辅助开发"，是 **AI 自己开发自己**。同样地，日常运营也不再是"打开菜单 → 找按钮 → 填表单"，而是直接对 ERA-Chat 说："把本月退货率最高的 SKU 列出来"、"给所有 VIP 客户发 9 折优惠券"。

| 组件 | 定位 | 许可 | 源码 |
|------|------|------|------|
| **OpenOBA Core** | AI 执行官引擎（含 ERA-Chat 运行时） | BSL-1.1 | 闭源分发（Change Date: 2030-06-09） |
| **Eyewear ERP** | 眼镜行业完整管理系统 | MIT | ✅ 完整开源 |

## 快速开始

**前置要求**：Node.js ≥ 18、MySQL ≥ 8.0、一个 LLM API Key（推荐 [DeepSeek](https://platform.deepseek.com)，新用户免费 500 万 token）

### Windows 一键启动

双击 `start.bat`，等待后端（:3400）和前端（:5173）就绪，浏览器自动打开。

### macOS / Linux

```bash
# 1. 克隆仓库
git clone <repo-url>
cd openoba-starter

# 2. 复制环境变量模板并填写数据库密码
cp .env.example .env
# 编辑 .env，设置 DB_PASSWORD

# 3. 安装依赖并编译
npm install
npm run build:backend

# 4. 启动后端
npm run start:backend    # http://localhost:3400

# 5. 另开终端，启动前端
npm run start:frontend   # http://localhost:5173
```

### 首次初始化

浏览器打开 `http://localhost:5173`，系统自动进入 **4 步向导**：

1. **数据库连接** — 输入 MySQL 账号密码，点击测试连接
2. **建库建表** — 自动创建 128+ 张业务表
3. **种子数据** — 创建管理员账号、角色、权限
4. **登录系统** — 默认账号 `admin` / `admin123`（⚠️ 首次登录后请立即修改）

> **LLM API Key 配置**：API Key 不在向导中。登录后进入 **ERA-Chat → 设置 → API Key**，配置 DeepSeek / Qwen / OpenAI 的 Key。

### 30 秒体验自开发自运营

登录后进入 **ERA-Chat**（左侧菜单），试试这些话：

**自己运营自己**：
- "查一下库存低于 10 的镜架" → AI 调用 `query-erp-data` 工具，返回表格
- "把这个月退货率最高的 SKU 列出来" → AI 跑 SQL，返回排行
- "导入这批供应商报价单"（上传 CSV） → AI 走 `import-analyzer → import-mapper → import-executor` 三步流水线

**自己开发自己**：
- "在客户表加一个'生日'字段" → AI 用 `erdl-crud` 读 schema，用 `file-edit` 改 Entity，**自动编译验证**，错误自动修正
- "给售后模块加一个'7 天无理由'自动审批规则" → AI 写 ERDL YAML，**13 项语义校验**通过后热加载生效
- "生成一份本月销售分析报告" → AI 调用 `data-analyzer`，产出可下载的 Deliverable

每一步你都能在对话流里看到 AI 的 **Thought → Tool Call → Observation** 全过程。AI 会从错误中学习——失败的工具调用自动转为记忆，下次自动避免重复犯错。

## 核心特性（7 项发明专利支撑）

- 🪞 **自指架构**：Meta-Mirror 引擎让 AI **读自己的代码**（扫描 Entity/API/DTO/规则/约定，按 `mirror_refs` 精准注入，节省 90% Token）
- ✍️ **自开发能力 + 编译验证闭环**（P01）：`file-edit` 改完**自动跑 `tsc --noEmit`**，编译失败 AI 自我修正重试，循环直至通过
- 🛡️ **Action Guard 协议转换**（P02）：LLM 输出四格式自适应解析（FC/JSON/XML/文本）+ 三级校验 + 输出清洁，"软输入硬校验"
- 🎯 **ReAct 单工具决策**（P03）：每轮只执行一个工具，基于真实结果再决策 + 四层防线（Token 截断/中止/死循环/软上限）
- 🔒 **确定性数据库操作**（P04）：三向翻译（别名→语义名→物理列名→参数化 SQL）替代 Text-to-SQL，三重安全校验
- 🧠 **Agent 记忆自进化**（P06）：错误→记忆转化链，按作用域精准注入 ≤8 条，版本化生命周期
- 🏭 **六引擎协同运营**（P07）：商品/上架/销售/履约/客服/分析——单 Agent 全业务闭环
- 📋 **完整 ERP**：商品（SPU/SKU/套装）、客户、订单、库存、售后、评价、短信——传统表单操作全部保留
- 🎨 **行业能力**：镜架结构标准、美学搭配规则、颜色设计、条码生成
- 🔐 **企业级安全**：JWT 双轨认证、RBAC 权限、审计日志、限流、Helmet、SOUL 铁律约束
- 🧩 **ERDL 规则引擎**（P01）：五层语义模型（Entity/Relation/Rule/Alias/Action）+ 零停机热替换 + 13 项语义校验
- 🛠️ **Skill 系统**：18 个可执行能力单元（8 core + 7 external + 3 import），可扩展第三方/付费 skill

## ERA-Chat：这个项目最不一样的地方

大多数开源项目把"二次开发"留给开发者——README 写得再好，你也得自己装环境、读源码、写代码。OpenOBA 的核心差异在于：**AI 执行官住在 ERA-Chat 里，能开发自己、运营自己**。

```
┌─────────────────────────────────────────────────────────────┐
│                       ERA-Chat 对话区                        │
│                                                             │
│  You: 给售后模块加一个"7 天无理由"自动审批规则               │
│                                                             │
│  Agent (Thought): 我需要先看看售后模块的 ERDL 规则结构       │
│  Agent (Tool): erdl_crud { action: read, entity: AfterSales }│
│  Agent (Observation): 售后单有 type/reason_type/created_at   │
│  Agent (Thought): 我写一条 validation tier 的 ERDL 规则      │
│  Agent (Tool): file_edit { operation: write, ... }           │
│  Agent (Tool): tsc_check { project: backend }                │
│  Agent (Tool): git_diff { mode: stat }                      │
│  Agent: 已生成规则 `after_sales_7day_auto_approve`，         │
│         类型 validation，热加载已生效。Diff 已打包为          │
│         Deliverable，请 Review 后发布。                      │
└─────────────────────────────────────────────────────────────┘
```

📖 **深入了解 ERA-Chat**：
- [ERA-Chat 总览](./docs/era-chat/README.md) — 核心概念、能力清单、安全边界
- [ERA-Chat 开发指南](./docs/era-chat/development-guide.md) — 怎么用自然语言开发新功能
- [ERA-Chat 运营指南](./docs/era-chat/operations-guide.md) — 怎么用自然语言运营业务

📖 **这个项目的故事**：
- [OpenOBA 诞生记](./docs/origin-story.md) — 一个不懂代码的人，如何与 AI 用 120 天造出 7 项专利的 ERP（人机共创叙事）

## 目录结构

```
openoba-starter/
├── packages/
│   ├── backend/         # NestJS 后端（行业 ERP 逻辑，MIT）
│   │   └── src/
│   │       ├── common/      # 守卫 / 拦截器 / 过滤器 / 限流
│   │       ├── config/      # 配置
│   │       ├── modules/     # 业务模块（product/customer/order/...）
│   │       └── schemas/     # ERDL Schema 定义
│   ├── core/            # @openoba/core 引擎包（BSL，编译后分发）
│   └── types/           # @openoba/types 共享类型包
├── frontend/            # Vue 3 前端（MIT）
│   └── src/
│       ├── api/         # API 封装
│       ├── components/  # 通用组件
│       ├── composables/ # 组合式函数
│       ├── views/       # 页面视图（含 ERA-Chat 对话界面）
│       └── stores/      # Pinia 状态
├── skills/              # AI 技能定义（YAML）← ERA-Chat 的能力来源
│   ├── core/            # 8 个核心 skill（file-edit/tsc-check/...）
│   └── external/        # 7 个外部 skill（import/export/analyze/...）
├── database/            # 建库 SQL 脚本
├── docs/                # 📚 完整文档
│   ├── era-chat/        # ⭐ ERA-Chat 专属指南
│   ├── architecture/    # 系统架构
│   ├── getting-started/ # 上手指南
│   ├── development/     # 开发贡献
│   ├── api/             # API 参考
│   ├── database/        # 数据库
│   ├── deployment/      # 部署
│   └── security/        # 安全
└── start.bat            # Windows 一键启动
```

## 文档

| 你想做的事 | 去哪里看 |
|-----------|---------|
| **用 ERA-Chat 开发新功能** | ⭐ [ERA-Chat 开发指南](./docs/era-chat/development-guide.md) |
| **用 ERA-Chat 运营业务** | ⭐ [ERA-Chat 运营指南](./docs/era-chat/operations-guide.md) |
| 了解 ERA-Chat 核心机制 | [ERA-Chat 总览](./docs/era-chat/README.md) |
| 了解系统架构 | [架构总览](./docs/architecture/overview.md) |
| 安装部署 | [安装指南](./docs/getting-started/installation.md) |
| 5 分钟跑起来 | [快速开始](./docs/getting-started/quick-start.md) |
| 配置环境变量 | [配置说明](./docs/getting-started/configuration.md) |
| 参与开发（传统方式） | [开发环境搭建](./docs/development/environment-setup.md) |
| 代码规范 | [编码标准](./docs/development/coding-standards.md) |
| 写测试 | [测试指南](./docs/development/testing.md) |
| 调用 API | [API 概览](./docs/api/overview.md) |
| 生产部署 | [部署指南](./docs/deployment/production.md) |
| 安全机制 | [安全架构](./docs/security/security-architecture.md) |

## 贡献

我们欢迎所有形式的贡献——Bug 报告、功能建议、文档改进、代码提交。

特别地，OpenOBA 有**两种贡献方式**：

1. **传统方式**：clone → 改代码 → 提 PR（见 [贡献指南](./CONTRIBUTING.md)）
2. **ERA-Chat 方式**：在系统内用自然语言让 AI 改代码，AI 打包成 Deliverable，你 Review 后合并

- 📋 [贡献指南](./CONTRIBUTING.md) — 如何提交 PR、Commit 规范、分支策略
- 📜 [行为准则](./CODE_OF_CONDUCT.md) — 社区行为规范
- 🔒 [安全策略](./SECURITY.md) — 漏洞报告流程
- 🏛️ [项目治理](./GOVERNANCE.md) — 决策机制
- ✍️ [CLA](./CLA.md) — 贡献者许可协议（提交 PR 即签署）

## 许可

本项目采用**双许可**模式：

- **Eyewear ERP**（`packages/backend`、`frontend`、`packages/types`、`database`、`skills`）：[MIT License](./LICENSE)
- **OpenOBA Core**（`packages/core`、`openoba-core/`）：Business Source License 1.1（BSL-1.1），Change Date 为 2030-06-09，届时自动转为 MIT

提交代码即表示你同意在对应许可下分发贡献，详见 [CLA](./CLA.md)。

## 联系

- **安全问题**：postmaster@openoba.com（⚠️ 请勿在公开 Issue 中报告安全漏洞）
- **Bug / 功能建议**：[GitHub Issues](https://github.com/openoba/openoba-starter/issues)
- **社区讨论**：[GitHub Discussions](https://github.com/openoba/openoba-starter/discussions)

---

<p align="center">Made with ☕ by <a href="https://github.com/openoba">OpenOBA Team</a> · 深圳市秒镜科技有限公司</p>
