# OpenOBA Starter

> **基于 LLM 的企业原生 AI 数字系统执行及开发框架**
>
> 大模型负责思考推理，OpenOBA 负责连接执行。让 AI 从"能聊天"变成"能做事"。

[![License: MIT + BSL](https://img.shields.io/badge/License-MIT%20%2F%20BSL-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![MySQL](https://img.shields.io/badge/MySQL-%3E%3D8.0-orange.svg)](https://www.mysql.com)
[![Version](https://img.shields.io/badge/version-1.4.0--alpha9-red.svg)](./CHANGELOG.md)

---

## 一个人，一个 AI，三个月

这个项目没有一行代码是人类写的。

2026 年 4 月，一个完全不懂代码的眼镜行业从业者，打开对话框，对 AI 说："帮我写一个 ERP。"

三个月后，120 天，308 次提交——一个运行着 128 张数据库表、21 个 NestJS 模块、拥有 7 项发明专利、能自己改自己代码的 ERP 诞生了。

这不是 AI 辅助编程。这是**一人一机共创**——人类定义方向、做出判断，AI 负责思考推理和代码生成，OpenOBA 负责连接执行。

[完整故事 →](./docs/origin-story.md)

---

## OpenOBA 是什么

OpenOBA 是一个**执行框架**。它不是大模型，不负责思考推理。它的工作是：接收你的指令，把它拆解成可执行的任务，调动工具和资源，完成它，汇报结果。

大模型是"大脑"，OpenOBA 是"手"。

| 你说的话 | OpenOBA 做的事 |
|----------|---------------|
| "查一下库存低于 10 的镜架" | 理解意图 → 查询数据库 → 返回表格 |
| "在客户表加一个生日字段" | 读 Entity 结构 → 改代码 → 自动编译验证 → 出错自我修正 |
| "本月退货率最高的 SKU 列出来" | 跑 SQL → 数据聚合 → 生成排行榜 |
| "把这个月销售数据导出 Excel" | 调用导出工具 → 生成文件 → 返回下载链接 |
| "给售后加一个7天无理由自动审批规则" | 写 ERDL 规则 → 语义校验 → 热加载生效 |

---

## 它解决了什么问题

### 传统企业软件的问题

一个传统 ERP 上市后，它的能力就固定了。想加一个字段？找开发团队。想改一个审批流程？提需求单。想做一个新的报表？排期。企业业务在变，系统不动。

### OpenOBA 的回答

OpenOBA 把"操作软件"变成了"对话"。运营不需要学菜单、开发不需要 clone 代码库——**所有人都用同一句话：告诉系统你要什么**。

而且 OpenOBA 能**改自己**——它内置 Meta-Mirror 引擎，能读懂自己的源码。你可以对它说"加一个字段"，它会自己找到 Entity 文件、自己改代码、自己跑编译验证、编译出错自己修正——全程不需要你写一行代码。

---

## 核心能力

### 🏭 运营执行能力

| 能力 | 说明 |
|------|------|
| **数据查询与分析** | 自然语言 → SQL 查询 → 结果可视化，"库存低于 10 的镜架有哪些" |
| **业务规则引擎** | ERDL 协议定义业务规则，零停机热加载，"满 3 件打 8 折" |
| **报表生成** | 一句话生成销售分析/库存周转/客户画像报告 |
| **ERP 全流程** | 商品上架/入库/出库/订单/售后/评价——全部对话化操作 |
| **导入导出** | CSV 导入分析、Excel 导出，三步流水线自动完成 |
| **未来**：基于数据的智能内容创作 — 自动生成促销文案、库存预警策略、客户推荐方案 |

### ✍️ 开发执行能力

| 能力 | 说明 |
|------|------|
| **自指架构** | Meta-Mirror 引擎扫描 Entity/API/DTO/规则，AI 读懂自己的每一行代码 |
| **自开发闭环** | file-edit 改代码 → tsc-check 编译验证 → 失败自动修正重试，循环直至通过 |
| **自演化记忆** | 失败的调用自动转化为记忆，下次自动避免重复错误，越用越聪明 |
| **确定性执行** | ERDL 协议约束数据结构，Action Guard 限制行为边界，审计日志全程可追溯 |
| **热更新** | ERDL 规则修改后无需重启，热加载即时生效 |
| **未来**：业务驱动的自动进化 — 系统根据业务数据变化，自动识别瓶颈、生成优化方案并自我改进 |

### 🛡️ 安全与质量

| 能力 | 说明 |
|------|------|
| **质量门禁** | 23 条代码质量规则（禁止 @ts-ignore / as any / 跳测试），代码修改时自动激活 |
| **版本守护** | 版本号一致性检测、Commit 审计、CHANGELOG 自动追踪 |
| **回滚安全网** | 关键操作前自动创建 Checkpoint，一键回滚路径生成 |
| **企业级安全** | JWT 双轨认证、RBAC 权限、SQL 参数化防注入、Helmet、限流 |
| **认知审计** | 每一步可追溯、可回滚——AI 做了什么、为什么这么做，全程可查 |

---

## 快速开始

**前置要求**：Node.js ≥ 18、MySQL ≥ 8.0、一个 LLM API Key（[DeepSeek](https://platform.deepseek.com) 新用户免费 500 万 token）

```bash
# 1. 克隆仓库
git clone <repo-url>
cd openoba-starter

# 2. 安装依赖
npm install

# 3. 构建
npm run build:backend

# 4. 启动后端
npm run start:backend    # http://localhost:3000

# 5. 另开终端，启动前端
npm run start:frontend   # http://localhost:5173
```

浏览器打开 `http://localhost:5173`，系统自动引导初始化。完成后进入 **ERA-Chat**，直接对话开始使用。

> API Key 在 ERA-Chat → 设置 → API Key 中配置。

---

## 项目结构

```
openoba-starter/
├── packages/
│   ├── backend/         # NestJS 后端（MIT）
│   ├── core/            # @openoba/core 引擎（BSL-1.1）
│   └── types/           # 共享类型
├── frontend/            # Vue 3 前端（MIT）
├── skills/              # 18 个 AI 技能定义（YAML）
├── database/            # 建库 SQL
├── docs/                # 完整文档
└── start.bat            # Windows 一键启动
```

## 文档

| 我要做什么 | 去哪里看 |
|-----------|---------|
| 了解这个项目的故事 | [OpenOBA 诞生记](./docs/origin-story.md) |
| 用 ERA-Chat 运营业务 | [运营指南](./docs/era-chat/operations-guide.md) |
| 用 ERA-Chat 开发功能 | [开发指南](./docs/era-chat/development-guide.md) |
| 了解 ERA-Chat 机制 | [ERA-Chat 总览](./docs/era-chat/README.md) |
| 了解系统架构 | [架构总览](./docs/architecture/overview.md) |
| 安装部署 | [安装指南](./docs/getting-started/installation.md) |

## 许可

- **Eyewear ERP**（backend / frontend / types / skills）：MIT License
- **OpenOBA Core**（packages/core）：BSL-1.1，Change Date 2030-06-09 → Apache 2.0

## 联系

- **安全问题**：postmaster@openoba.com
- **Bug / 建议**：[GitHub Issues](https://github.com/openoba/openoba-starter/issues)

---

<p align="center">一人一机共创 · 120 天 · 308 commits · 7 项专利</p>
