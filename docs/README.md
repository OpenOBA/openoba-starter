# OpenOBA Starter 文档

> 📚 完整文档导航 — 从安装部署到深度开发

欢迎来到 OpenOBA Starter 文档中心。这里包含你需要的所有信息——无论你是想快速体验、深度开发，还是生产部署。

> ⭐ **OpenOBA 最不一样的地方**：AI 执行官住在 ERA-Chat 里，能**读自己的代码、改自己的代码、运营自己的业务**。这是它和所有其他开源 ERP 的根本区别。下面的"⭐ ERA-Chat"板块专门讲这件事。

## 📖 想了解这个项目的故事？

| 文档 | 适合谁 | 你将学到 |
|------|--------|---------|
| [OpenOBA 诞生记](./origin-story.md) | 所有人 | 一个不懂代码的人，如何与 AI 用 120 天造出一个有 7 项专利的 ERP |

> 💡 建议从这里开始读。技术文档告诉你"怎么用"，但这个故事告诉你"为什么存在"。

## ⭐ ERA-Chat：自开发自运营（这个项目最不一样的地方）

这是 OpenOBA 的核心差异点。如果你只读一个板块，读这个。

| 文档 | 适合谁 | 你将学到 |
|------|--------|---------|
| [ERA-Chat 总览](./era-chat/README.md) | 所有人 | 自指架构、四大引擎（Meta-Mirror/ERDL/SOUL/Skill）、安全边界 |
| [ERA-Chat 开发指南](./era-chat/development-guide.md) | 开发者 / 技术负责人 | 用自然语言让 AI 加字段、加模块、加规则、加接口 |
| [ERA-Chat 运营指南](./era-chat/operations-guide.md) | 运营 / 业务 / 客服 | 用自然语言查数据、调价、导入导出、生成报表 |

## 🚀 刚接触？从这里开始

| 文档 | 适合谁 | 你将学到 |
|------|--------|---------|
| [快速开始](./getting-started/quick-start.md) | 所有人 | 5 分钟把系统跑起来 |
| [安装指南](./getting-started/installation.md) | 运维 / 部署 | 完整的安装步骤和前置要求 |
| [配置说明](./getting-started/configuration.md) | 所有人 | 所有环境变量怎么配 |

## 🏗️ 想了解架构？

| 文档 | 内容 |
|------|------|
| [架构总览](./architecture/overview.md) | 系统分层、数据流、Core 与 ERP 的关系、自指架构 |
| [技术栈](./architecture/tech-stack.md) | 用了什么技术，为什么选它们 |
| [后端模块清单](./architecture/module-list.md) | 每个 NestJS 模块负责什么 |

## 💻 想参与开发（传统方式）？

> 💡 OpenOBA 支持两种开发方式：① ERA-Chat 自然语言开发（见上方 ⭐ 板块）；② 传统 clone + PR 方式（见下方）。

| 文档 | 内容 |
|------|------|
| [开发环境搭建](./development/environment-setup.md) | 从零搭建本地开发环境 |
| [编码标准](./development/coding-standards.md) | 代码风格、命名、提交规范 |
| [测试指南](./development/testing.md) | 怎么写测试、跑测试 |

## 🔌 想调用 API？

| 文档 | 内容 |
|------|------|
| [API 概览](./api/overview.md) | 认证方式、接口约定、Swagger 入口 |

## 🗄️ 想了解数据库？

| 文档 | 内容 |
|------|------|
| [数据库 Schema](./database/schema.md) | 128+ 张表的分组、命名规范、初始化 |

## 🚢 想部署上线？

| 文档 | 内容 |
|------|------|
| [生产部署指南](./deployment/production.md) | 生产环境配置、Nginx 反代、进程管理 |

## 🔒 关注安全？

| 文档 | 内容 |
|------|------|
| [安全架构](./security/security-architecture.md) | 认证、授权、限流、审计、加密、SOUL 铁律 |

## 📋 项目治理

根级文档（不在 docs/ 目录内）：

- [贡献指南](../CONTRIBUTING.md) — PR 流程、Commit 规范（含 ERA-Chat 贡献方式）
- [行为准则](../CODE_OF_CONDUCT.md) — 社区规范
- [安全策略](../SECURITY.md) — 漏洞报告
- [项目治理](../GOVERNANCE.md) — 决策机制
- [CLA](../CLA.md) — 贡献者协议
- [更新日志](../CHANGELOG.md) — 版本变更

## 📖 文档约定

- **语言**：中文为主，代码标识符保留英文
- **版本**：文档与代码版本对齐，当前对应 `1.4.0-alpha9`
- **反馈**：发现文档问题？[提 Issue](https://github.com/openoba/openoba-starter/issues) 并打上 `documentation` 标签

---

找不到你需要的内容？[提个 Issue](https://github.com/openoba/openoba-starter/issues) 告诉我们。
