# Changelog

> 遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 规范
> 使用 [Semantic Versioning](https://semver.org)

---

## [Unreleased]

### Added

### Changed

### Fixed

### Security

---

## [1.4.0-alpha1] — 2026-06-11

### Changed
- **NestJS 11 全家桶升级**：common/core/testing/platform-express/swagger/config/typeorm/jwt/passport → 11.x
- CLI/Schematics → 11.x
- Express v5 路由兼容（0 个控制器受影响）

### Fixed
- @openoba/core tgz 包 exports 约束解除（适配 NestJS 11）
- tsconfig paths + jest rootDir 修正（core 移至 backend node_modules）
- 4 个拆分 Service 文件编码修复（binary restore）
- product.module.ts 移除 3 个缺失 Service 引用（暂用主 Service 内联）

### Security
- npm audit 29 → 18 vulns（-38%）
- high 漏洞 10 → 5（-50%）
- 移除 expr-eval/xlsx orphan dependency 声明

---

## [1.3.6] — 2026-06-11

### Added
- docs/SECURITY-RUNBOOK.md（24h 应急响应 + 7 项监控指标）

---

## [1.3.5] — 2026-06-11

### Fixed
- CI 修复：删除 continue-on-error + 新增 npm audit 安全审计步骤

---

## [1.3.4] — 2026-06-11

### Added
- MIT LICENSE / CONTRIBUTING.md / .env.example
- CI pipeline + E2E 基础 + Playwright 配置

---

## [1.3.3] — 2026-06-11

### Changed
- V1.4-c 大文件拆分：后端 5 模块 + 前端 4 页面 composables

### Added
- wizard.guard.ts / after-sales-state-machine.ts

---

## [1.3.2] — 2026-06-11

### Security
- Math.random → crypto（34 处 → 0）
- .gitignore 加固

---

## [1.3.1] — 2026-06-11

### Added
- init-structure.sql 重建（134 表逐 Entity 核对）
- 数据库全貌写入工程总清单 V7

### Fixed
- product_sku.lens_width → structure_width

---

## [1.3.0] — 2026-06-08

### Added
- ReAct 全流式输出 / Wizard 初装向导 / Redis 限流 / ESLint+Prettier / Husky / @openoba/types

### Changed
- orderNo 前缀 MJ- → OBA- / CORE barrel 统一导出

### Fixed
- 24 处静默 catch / 23 处 LIKE 转义 / OrderItemDto / SMS 计数器 / execSync / Object.assign / audit-log / CORS / SQL 注入 / forwardRef

### Security
- JWT 弱密钥检测 / 全局异常处理器 / helmet

---

## [1.2.0] — 2026-06-07

### Added
- ERDL CRUD / Agent 模型信息注入

---

## [1.1.0] — 2026-06-06

### Added
- Agent 人格觉醒 / API Key 持久化 / Provider 兼容层

---

## [1.0.0] — 2026-05-31

### Added
- 三模式运营设计 / 初装 Wizard / .env.example / 版本管理体系

---

## [0.9.0] — 2026-05-17

### Added
- AI 执行官品牌 / ERA-Chat / ERDL 协议 / Action Guard / Meta-Mirror / Skill 系统 / DataBridge / 7 件专利

---

## [0.1.0] — 2026-04-05

### Added
- 项目初始化 / 眼镜行业 Schema / 基础 ERDL 框架
