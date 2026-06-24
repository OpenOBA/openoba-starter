# Changelog

> 遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 规范
> 使用 [Semantic Versioning](https://semver.org)

---

## [Unreleased]

### Added
- **Chat 会话持久化**：统一到 `chat_message` 表，DB 优先 + JSONL 降级，流式 thought/tool 合并写入
- **消息恢复接口**：`GET /eros/chat/:sessionKey/messages`，前端三层降级恢复（DB → localStorage → AgentTask.context）
- **元镜引擎 V3.0**：代码质量操作系统
  - 质量门禁 DSL：23 条规则，工具名 + 操作类型 + 文件模式三级匹配
  - 版本守护：monorepo 版本一致性检测、Conventional Commits 审计、CHANGELOG 追踪
  - 回滚安全网：Checkpoint 快照 + 7 步回滚路径 + Schema 兼容检测
  - 前端面板（/meta-mirror）：四维卡片 + 质量门禁/版本守护/回滚安全网三个 Tab
- **开源合规文件补齐**：根目录新增 SECURITY.md / CODE_OF_CONDUCT.md / GOVERNANCE.md / CLA.md（均引用 `docs/open-source/policies/` 完整文档）
- **前端拆分 8 个新组件**：
  - CustomerDetailDrawer (530行) — 客户详情抽屉（内部自管理 composable，策略 B）
  - SetDialog (273行) — 套装编辑弹窗（SKU 多选 + 折扣联动）
  - SkuImagePanel (374行) — SKU 图片管理面板（上传/排序/预览）
  - AgentChatSidebar (125行) — Agent 聊天左栏（任务信息 + 历史）
  - AgentChatLogPanel (58行) — Agent 聊天右栏（认知日志）
  - EraChatWelcome (280行) — ERA-Chat 首页对话区
  - TaskListPanel (165行) — 任务列表（筛选 + 表格 + 分页）
- **Core test/.gitkeep**：jest 配置所需测试目录

### Changed
- **前端大文件拆分**：4 个超 800 行 Vue 文件全部拆分 (-38%, 4,561→2,824 行)
  - Customers.vue 1,356→410 (-70%)
  - Products.vue 1,341→816 (-39%)
  - AgentChat.vue 1,023→963 (-6%)
  - TaskDashboard.vue 841→635 (-25%)

### Fixed
- **Vue 模板语法修复**：SkuDialog/SkuImagePanel/AgentManagement 三文件多行 @click 加分号 + 去除模板中 as 断言
- **套装管理 API 路径修复**：SetDialog 中 `/product-sets` → `/products/sets`，skuIds → skuList
- **工具结果渲染修复**：历史任务重开后 tool result 逐字换行（根因：流式 thought 被拆分为单字记录），后端合并写入 + 前端 CSS 归一
- **ChatMessage 实体注册修复**：新增到 TypeORM forRoot entities + @openoba/core barrel 导出
- **元镜面板 UI**：去除 emoji + 图标，纯文字极简风格，卡片四色区分
- **P0-1: Core 许可证头修正**：36 个 TypeScript 源文件 `@license AGPL-3.0` → `@license BSL-1.1`
- **P0-1: 根 LICENSE 中文乱码修复**：UTF-8 编码恢复为 "深圳市秒镜科技有限公司"
- **P0-1: Core BSL Change Date 修正**：2030-06-05 → 2030-06-09（与开源战略总纲对齐）
- **P0-1: CONTRIBUTING.md 全篇中文乱码修复**：重写为正确 UTF-8 编码
- **P0-2: Math.random 回归修复**：36 处 `Math.random()` → `crypto.randomUUID()` / `crypto.randomInt()`，0 残留
- **P1-1: expr-eval 安全替换**：`SafeExpr` 自研安全表达式引擎（纯递归下降解析器），移除 expr-eval@2.0.2 依赖
- **P1-1a: Backend 孤立 expr-eval 依赖清理**：package.json 声明但 0 处引用，已移除
- **P1-2: ERDL 规则引擎单测补充**：5 → 20 tests（新增 inactive rule skip / rule chaining / OR 条件 / 嵌套 AND+OR / 公式异常优雅降级 / 除零 / 未定义变量 / 负数括号 / 校验规则实体隔离）
- **S-SYSTEMIC: 前端 UTF-8 编码系统性修复**：17 个 composable 文件中文乱码修复（useTemplates / useTaskList / useTaskProposals / useOrderUtils / useReActTimeline / useAgentChat / useCustomerDetail / useCustomerForm / useCustomerOperations / useCustomerUtils / useHistoryTasks / useOrderCreate / useOrderStats / useProductTechDicts / useProductCategory / usePricingTiers / vite.config）
- **DPO 姓名公示**：DPO-APPOINTMENT.md / PRIVACY-POLICY.md / TELEMETRY.md 三份文件 DPO 姓名更新为 唐启鑫

### Security (Sprint 0)
- **P0-1: executeGitDiff 命令注入修复**：`execSync` → `execFileSync` 参数分离 + mode 白名单校验 + filePath 正则白名单纵深防御
- **P0-2: executeFileEdit 路径穿越修复**：`resolve` 后增加 `startsWith(projectRoot)` 边界校验，防止越界访问 .env/passwd
- **P0-3: SSRF 修复**：提取公共 `url-validator.ts` validateFetchUrl，拦截内网/IPv6 回环/链路本地地址，应用到 core + backend 两个 llm-config.controller

### Fixed (Sprint 1)
- **P1-1: 22 处静默 catch 清理**：agent-executor(6) + soul.service(3) + erdl-llm-bridge(6) + meta-mirror(3) + org-info.builder(2) + 6 文件收尾(14)，全部补齐 logger.warn/debug
- **P1-2: deployment 事务原子性**：添加 startTransaction/commit/rollback + queryRunner release 移至 finally 防止连接泄漏
- **P1-3: entity-proxy success 语义统一**：4 处 `success:true + error` → `success:false + error` / `success:true + preview:true`
- **P1-4: 前端死代码清理**：删除 useReActTimeline.ts + useAgentChat.ts（491 行，5/6 字段与后端 StreamEvent 不匹配 + Authorization 占位符未替换）
- **P1-5: LLM config API 前后端对齐**：`providerCode` → `provider`；删除 `PUT /system/llm/models/default` 死路由；新增 `getProviders()` / `setDefaultModel()`
- **P1-6: getReportTargets 端点修复**：新建 `TaskController` 提供 `GET /eros/report-targets`，前端从 `/eros/tasks/stats` 改为正确端点
- **P1-7: 重复 write 死代码删除**：agent-executor.service.ts 2225-2231 行删除（与 S0-2 合并执行）

### Engineering (Sprint 2)
- **AgentManifest agentCode 对齐**：`openoba-main` → `main-agent`（DB 直连验证：sys_agent_manifest 中实际为 main-agent）
- **agent_memory 列名修复**：SQL `agent_code` → `owner_agent`（DB 直连验证：agent_memory 表中实际列名）
- **BOM 清理 + 编码规范化**：41 个 .ts 文件去除 UTF-8 BOM；添加 .gitattributes（LF 统一）+ .editorconfig（UTF-8 + 2 spaces）
- **src 下 .js 编译产物清理**：10 个文件删除 + .gitignore 规则 `packages/core/src/**/*.js`
- **package.json 乱码修复**：description "鈥?" → "—"
- **console.warn → Logger**：UserService 3 处 console.warn 替换为 logger.warn
- **Vault Key PBKDF2 升级**：单轮 SHA256 → PBKDF2 10 万轮 + salt；decrypt 先试 V2 失败回退 V1（向后兼容）
- **JWT 弱密钥对齐**：core main.ts 对齐 backend main.ts 的长度/生产 exit 校验
- **callProvider 去硬编码**：错误信息 `'DeepSeek' + statusCode` → `provider.id + statusCode`

### Testing & Docs (Sprint 3)
- **单元测试扩展**：entity-proxy.service.spec.ts (5 tests) + erdl-llm-providers.spec.ts (9 tests)，全量 4 suites 34 tests 通过
- **SECURITY.md**：新建 packages/core/SECURITY.md（漏洞上报渠道 + 安全架构说明）
- **IRateLimiter → RateLimiter**：6 文件 8 处引用精确替换，去掉 I 前缀
- **版本号同步 bump**：根/backend/frontend 1.4.0-alpha7 → 1.4.0-alpha9；core 1.4.0-alpha8 → 1.4.0-alpha9；9 处全链路同步

### Security
- **P1-1**: expr-eval@2.0.2 replaced with self-developed SafeExpr engine (GHSA-8gw3-rxh4-v6jx + GHSA-jc85-fpwf-qm7x)
- **P0-2**: All 36 `Math.random()` calls replaced with cryptographically secure `crypto.randomUUID()` / `crypto.randomInt()`
- **P0-1**: License headers unified to BSL-1.1 (was AGPL-3.0 on 36 files)

---

## [1.4.0-alpha7] — 2026-06-13

### Added
- Core V1.3.0 源码迁入 monorepo（packages/core/src/）
- @openoba/core barrel export + dependency declaration
- GLM / MiniMax / Kimi 模型种子数据（对齐 builtin providers）
- ERA-Chat 头部模型下拉选择器
- Settings API Key 列表式管理
- LLM Key 双路径集成（DB 优先路由）
- Core test/.gitkeep 目录

### Changed
- ts-jest / ESLint / nest-build 兼容性升级
- 版本号全链路同步 1.3.0 → 1.4.0-alpha7
- 前端版本号同步

### Fixed
- 版本检查逻辑修复：离线时返回当前版本不触发更新
- 版本号语义比较（防旧 tag 误报）
- ReAct 全流式输出恢复（streamReActRound 方法还原）
- model/token 表对齐 Core Entity（sys_ 前缀 + 列名升级）
- after_sales 表 is_deleted 字段
- ERDLPlayground nlHints
- Vite proxy 端口
- 14 个拆分文件编码修复
- Core 包 postinstall 脚本修复
- NestJS 11 重新升级（package.json 声明正确入版）

### Known Issues
- 2 个 spec 失败（order + pricing-engine）：依赖 Core 包 ERDLRuleEngine，Core 重新编译后修复

---

## [1.4.0-alpha2] — 2026-06-11

### Changed
- xlsx: npm 0.18.5 → CDN 0.20.3（官方源·修复 Prototype Pollution）
- expr-eval: 2019 停更 → mathjs 15.2.0（活跃维护·沙箱安全）— 已于后续版本替换为 SafeExpr
- exceljs: 移除

---

## [1.4.0-alpha1] — 2026-06-11

### Changed
- NestJS 11 升级（首次·未正确入版·被 alpha3 取代）
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
- V1.4-c 大文件拆分：后端 5 模块 + 前端 14 composables + 视图更新

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
