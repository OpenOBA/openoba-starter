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

## [1.3.2] — 2026-06-11

### Security
- P0-2: Math.random → crypto 全量替换（前端 7 处 + 后端 27 处 → 0）
- .gitignore 加固：tmp-*.js / *.log / gitleaks 规则

### Removed
- packages/backend/tmp-check-db.js（临时调试文件）

---

## [1.3.1] — 2026-06-11

### Added
- P0-1: init-structure.sql 重建（134张表，逐表核对Entity生成）
- P0-1: 数据库全貌写入工程总清单 V7（第十章 Schema Inventory）
- P0-1: add-missing-dict-tables.sql（3张字典表补表脚本）

### Changed
- 工程总清单更新至 V7
- 重大 Schema 重构 — after_sales 14→27列、review 8→24列、inventory/sub_sku 列名重对齐

### Fixed
- product_sku.lens_width → structure_width（与Entity对齐）

---

## [1.3.0] — 2026-06-08

### Added
- **ReAct 全流式输出**：LLM 推理链实时推送，用户可中断
- **Wizard 初装向导**：首次启动数据库初始化 4 步引导
- **Redis 限流**：IRateLimiter 抽象层（Redis/Memory 双模式）
- **ESLint + Prettier**：代码规范与格式化
- **Husky pre-commit**：提交前自动检查
- **@openoba/types** 共享类型包：Enum 12 文件 + Interface 9 文件 ~850 行

### Changed
- orderNo 前缀 `MJ-` → `OBA-`，使用 `crypto.randomUUID()`
- CORE barrel 统一导出，ERP import 25 处 → 1 处
- 客户编号前缀 `MJ-` → `OBA-`

### Fixed
- 24 处静默 `catch` 补充日志
- 23 处 `LIKE` 通配符转义防注入
- `OrderItemDto` 缺少 `@ValidateNested`
- SMS 验证码计数器修复
- `start.bat` 硬编码 timeout → `/health` 轮询
- `execSync` → `execFileSync` 安全修复
- `CustomerService` `Object.assign` 安全修复
- `audit-log` 缺少 `@Roles` 守卫
- CORS 生产环境配置审计
- 逐句 SQL 注入校验加固
- forwardRef 循环依赖（暂缓）

### Security
- JWT 弱密钥检测（生产环境拒绝启动）
- 全局未捕获异常处理器（防进程崩溃）
- helmet 安全头配置

---

## [1.2.0] — 2026-06-07

### Added
- ERDL CRUD 响应编码修复
- Agent 模型信息注入（Soul L0 系统提示）

---

## [1.1.0] — 2026-06-06

### Added
- Agent 人格觉醒系统
- API Key 持久化与模型管理
- 模型 Provider 格式兼容层

### Fixed
- queryWithToolsLegacy model 参数被丢弃（前端模型选择功能失效）

---

## [1.0.0] — 2026-05-31

### Added
- 三模式运营设计（operator / developer / maintainer）
- 初装 Wizard 后端实现
- `.env.example` 完整中文注释
- README / USER-GUIDE 更新
- 版本管理体系建立

### Changed
- 产品线策略确定：Core 闭源 BSL / Starter 开源 MIT

---

## [0.9.0] — 2026-05-17

### Added
- OpenOBA AI 执行官品牌定位确立
- ERA-Chat Agent 对话工作台
- ERDL 协议核心实现
- Action Guard 执行引擎
- Meta-Mirror 元镜引擎
- Skill 系统完整实现
- DataBridge 行业数据桥接
- 7 件专利五书完成

---

## [0.1.0] — 2026-04-05

### Added
- 项目初始化（Phase 0 地基）
- 眼镜行业 Schema 定义
- 基础 ERDL 框架
