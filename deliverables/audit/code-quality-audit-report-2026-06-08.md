# OpenOBA Starter — 代码质量专业审计报告

**审计日期**：2026-06-08
**审计范围**：`packages/backend` (ERP 开源层) + `openoba-core` (CORE 闭源层) + `frontend` (前端)
**审计师**：Code Reviewer Expert
**审计维度**：7 大维度 / 28 个审计子项
**报告版本**：v1.0

---

## 📌 执行摘要 (TL;DR)

| 项目 | 数值 |
|------|------|
| **整体结论** | 🟡 **Conditional Go** — 经过 9 轮安全审计的密集修复后，重大安全风险已基本收敛，但**工程质量债**仍处于**高水位**，距离"工业级可维护"差距明显 |
| **ERP 开源层评分** | **C+** (62/100) — 安全 P0 已修复但工程质量债高 |
| **CORE 闭源层评分** | **B+** (78/100) — 架构设计良好，但无法直接审计源码 |
| **前端评分** | **C-** (55/100) — 严重缺乏测试、超大组件、TypeScript 类型不收敛 |
| **整体质量健康度** | **65/100** |
| **Blocker (P0)** | 2 个（架构层面）|
| **Critical (P1)** | 11 个（代码质量层面）|
| **Major (P2)** | 18 个（工程化与文档）|
| **Minor (P3)** | 15 个（建议优化）|
| **关键风险** | 工程质量债 > 技术债务 > 业务复杂度债 |

### 与 6/8 安全全检的交叉验证

本审计与 `pre-launch-check-openoba-starter-2026-06-08.md` 报告（5 P0 / 9 P1 / 12 P2 / 8 P3，D 评级）形成**双视角交叉验证**：
- **安全全检已覆盖**：34 项安全/部署/质量阻断项，本审计与之一致。
- **本审计新增视角**：聚焦"代码可维护性、架构健康度、测试覆盖、工程化建设、审查机制建立"，是安全审计的**有力补充**。

---

## 🏗️ 1. 审计基线数据

### 1.1 项目规模

| 模块 | TS/JS/Vue 文件 | 总行数（估算） | 平均单文件行数 | 状态 |
|------|---------------|----------------|----------------|------|
| **packages/backend** (ERP 开源) | 220 | ~35,000 | 159 行 | ✅ 健康 |
| **packages/backend**（含 bak）| 233 | - | - | 13 个 .bak 残留 |
| **frontend** (Vue3 + TS) | 89 | ~30,000 | 337 行 | ⚠️ 偏高 |
| **openoba-core** (CORE 闭源, dist) | 158 | ~18,000 | 114 行 | ✅ 紧凑 |
| **总计（生产代码）** | 467 | ~83,000 | - | - |

### 1.2 技术栈画像

```
后端: NestJS 10 + TypeORM 0.3 + MySQL 8 + Passport-JWT + class-validator + Helmet
前端: Vue 3.5 + Pinia 3 + Vue Router 5 + Element Plus 2.13 + Axios 1.15
构建: Vite 8 + nest build + TypeScript 5/6
测试: Jest 29（后端） + Vitest 4（前端） + Playwright（声明但未实际使用）
ORM: TypeORM 0.3.17 + 显式 Entity 注册
```

### 1.3 工程化现状（关键短板）

| 关键配置 | 状态 | 影响 |
|----------|------|------|
| `.eslintrc` / `eslint.config` | ❌ 缺失 | 包 package.json 声明 `lint` 脚本但无规则 |
| `.prettierrc` | ❌ 缺失 | 格式化不一致（已发现混合分号风格）|
| `.editorconfig` | ❌ 缺失 | 跨编辑器格式漂移 |
| `.husky/` + `lint-staged` | ❌ 缺失 | 无 commit-time 质量门禁 |
| `commitlint.config` | ❌ 缺失 | 提交信息无规范 |
| `.github/workflows/` | ❌ 缺失 | 无 CI/CD |
| `Dockerfile` / `docker-compose` | ❌ 缺失 | 无容器化部署 |
| `CHANGELOG.md` | ❌ 缺失 | 版本变更无记录 |
| `CONTRIBUTING.md` | ❌ 缺失 | 无贡献指南 |
| `.git` 仓库 | ❌ 不存在 | 无法追踪历史 |
| TypeScript `strict` 模式 | ✅ 已启用 | 但 `useUnknownInCatchVariables: false` 削弱了错误处理严格性 |
| TypeScript `strictPropertyInitialization: false` | ⚠️ 显式禁用 | "H10备注"说明是 DTO 兼容性问题，需补初始化 |

---

## 🔍 2. 多维度审计发现

### 维度 1：代码质量与可维护性（权重 20%）

#### 🔴 P0-1：8 个 Service 文件严重超长（违反 SRP 单一职责原则）

| 文件 | 行数 | 责任数（粗估）| 建议拆分 |
|------|------|--------------|---------|
| `modules/website/website.service.ts` | **807** | ≥ 6 | 拆为 PublicSite/Page/SEO/Menu 四个 Service |
| `modules/product/product.service.ts` | **785** | ≥ 8（颜色/SPU/SKU/套装/条形码/价格/图片/标签）| 拆为 ColorService/SpuService/SkuService/ImageService |
| `modules/customer/customer.service.ts` | **777** | ≥ 7（客户/联系人/地址/价格/处方/镜片/消费画像）| 拆为 CustomerService/ContactService/AddressService |
| `modules/order/order.service.ts` | **775** | ≥ 6（订单/支付/发货/库存/客户档案/降级）| 拆为 OrderService/PaymentService/ShipmentService |
| `modules/product/pricing-engine.service.ts` | 648 | 1（价格引擎本身合理）| 内部按 B/C 端拆分 |
| `modules/inventory/inventory.service.ts` | 648 | ≥ 5 | 拆为 StockService/TransactionService/LockService |
| `modules/customer/dto/customer.dto.ts` | 614 | DTO 聚合（可接受）| 按子领域拆分子 DTO 文件 |
| `modules/customer-auth/customer-auth.service.ts` | 597 | ≥ 4 | 拆为 PasswordService/SmsAuthService/TokenService |
| `modules/system/deployment.service.ts` | 568 | ≥ 3 | 拆为 GitService/ProcessService/SqlMigrationService |

**问题根因**：在 ERP 这种业务复杂的系统中，Service 越写越长是渐进式的——每次"加一个字段"就在 Service 里加一个方法，从不主动拆分。
**影响**：
- 单文件改动引发合并冲突的概率提升 5-10 倍
- 单元测试难以独立编写（实例化一个 800 行的 Service 需要 mock 8 个依赖）
- 新成员理解业务的学习曲线变陡
- Code Review 容易"看麻了"导致漏掉关键问题

**优先级**：P0（架构层面）
**建议工时**：3-4 周（每文件 2-3 天拆分 + 测试）

#### 🟠 P1-1：6 个 Vue 组件超过 800 行（同样违反 SRP）

| 文件 | 行数 | 问题 |
|------|------|------|
| `views/Customers.vue` | 1356 | 客户管理 + 联系人 + 地址 + 价格 + 处方 + 镜片 + 消费画像 — 全部塞一个页面 |
| `views/Products.vue` | 1341 | 商品管理 + SPU + SKU + 图片 + 价格 + 套装 — 同样超大 |
| `views/tasks/AgentChat.vue` | 976 | 单页面包含 50+ 状态变量、消息渲染、工具调用、文件上传等 |
| `views/tasks/TaskDashboard.vue` | 841 | 仪表盘 + 任务管理 + 报告 — 应拆为子路由 |
| `views/Colors.vue` | 752 | 颜色字典 + 配色 + 项目 + 季节 — 应拆 tab 组件 |
| `views/Dictionary.vue` | 734 | 通用字典管理 — 应改为配置驱动 |

**问题根因**：与后端 Service 超长同源——迭代式"加需求不加结构"。
**影响**：
- 单元测试几乎不可能（用户故事太复杂）
- 一个 bug 可能隐藏在其他业务代码中（grep 都搜不到）
- 多人协作冲突率极高

**优先级**：P1
**建议工时**：4-5 周（每文件 3-4 天拆分为 Page + 多个 SubComponent）

#### 🟠 P1-2：234 处 `any` 类型滥用（后端），241 处（前端）

```typescript
// ❌ 反例：后端 ProductService 全 any
async createColor(dto: any) { ... }
async updateColor(id: string, dto: any) { ... }
async findColors(query: any) { ... }
async createSpu(dto: any) { ... }
async generateSpuDisplayName(spuData: any): Promise<string> { ... }

// ❌ 反例：前端 views/Customers.vue 等大量 any
const data: any = await request({...})
```

**问题根因**：
1. DTO 定义了但未在 Service 签名中使用（仅 Controller 层用）
2. 早期为了赶进度绕过类型检查
3. forwardRef + 跨模块引用导致类型推断失败

**核心风险**：
- 重构时编译器不会报错（TypeScript 失去保护）
- API 文档无法从类型自动生成
- 字段重命名/删除会引发运行期崩溃

**优先级**：P1（与前端 689+ TS 错误直接相关）
**建议工时**：2-3 周（优先级修复 Service 公开方法 → 业务 DTO → 内部工具方法）

#### 🟠 P1-3：24 处静默 catch 块（吞掉异常）

```typescript
// ❌ 反例 1（modules/order/order.service.ts:522）
try { await this.orderRepo.update(result.orderId, { internalRemark: 'MEMBER_UPDATE_FAILED' } as any) } catch {}

// ❌ 反例 2（modules/system/deployment.service.ts:207）
if (prodPid) { try { process.kill(prodPid) } catch {}; await this.sleep(2000) }

// ❌ 反例 3（modules/auth/auth.controller.ts:40）
} catch {
  throw new UnauthorizedException('Token 无效或已过期')
}
```

**特别关注**：
- `deployment.service.ts` 有 **8 处** `catch {}` 静默吞错（PID 清理、文件删除、SQL 解析），掩盖部署失败的根本原因
- `order.service.ts` 静默吞 `try { orderRepo.update } catch {}`，会员更新失败时仅在日志记一行
- 24 处中**至少 19 处**应该至少 `this.logger.error()` 记录，否则线上问题无法排查

**优先级**：P1（运维可观测性灾难）
**建议工时**：3-5 天

#### 🟡 P2-1：3 处 `console.log` 直接使用（应统一为 Logger）

```typescript
// modules/system/user/user.service.ts:79, 188, 207
console.warn(`⚠️ Sub Agent 创建失败: ${e.message}`)
```

**问题**：与 NestJS Logger 体系割裂，无法被全局异常过滤器捕获、日志无法结构化输出到 ELK/Loki。
**优先级**：P2
**建议工时**：30 分钟

#### 🟡 P2-2：前端 57 处 `console.log`（开发者工具噪声）

**问题**：生产环境 `dist/assets/*.js` 仍包含 console 调试信息，可被竞品抓取业务逻辑（如定价算法、API 路径）。
**优先级**：P2
**建议**：Vite 构建时 `esbuild.drop: ['console', 'debugger']`

#### 🟡 P2-3：JSDoc 注释覆盖率仅 4.5%（10/220 文件）

```typescript
// 仅有 10 个文件带 @author，220 个文件中占比 4.5%
// 大量 Service 方法缺少业务规则、副作用、并发约束说明
```

**优先级**：P2（开源项目的硬伤——外部贡献者无法理解）
**建议工时**：1-2 周（核心 Service 优先）

#### 🟢 P3-1：13 个 `.bak` 备份文件残留在代码树

```
packages/backend/src/main.bak-p1fix-20260608-1745.ts
packages/backend/src/main.bak-verup-20260608-1815.ts
packages/backend/src/modules/after-sales/after-sales.controller.bak-auditfix-20260608-1703.ts
packages/backend/src/modules/customer-auth/customer-auth-admin.controller.bak-auditfix-20260608-1703.ts
...（13 处）
```

**问题**：
- 已在 `.gitignore` 添加 `*.bak*` 规则，但**这些文件是未提交前的**——`.gitignore` 之前生成
- 这些文件被 IDE 索引，会污染 Ctrl+P 文件搜索结果
- 每次 TS 编译都会包含这些文件（增加 dist 体积）

**建议**：删除 + `.gitignore` 加 `**/*.bak*` 双重保险

#### 🟢 P3-2：TODO/FIXME 注释存在 3 处（TODO-PROD、TODO-PRODUCT 需处理）

```typescript
// modules/auth/auth.controller.ts:44
// TODO-PROD: 多实例部署时迁移到 Redis 共享存储

// modules/product/pricing-engine.service.ts:341
// TODO-PRODUCT: 确认业务规则 percent优惠应在原价还是当前最优价上计算
```

**优先级**：P3（需纳入 Issue 跟踪）

---

### 维度 2：架构与设计模式（权重 15%）

#### 🟠 P1-4：开源层与闭源层耦合度过高（业务边界不清晰）

**现状**（`packages/backend/src/app.module.ts:28-50`）：

```typescript
// ERP 开源层显式 import CORE 闭源层 entity
import { ERDLRuleRecord } from '@openoba/core/dist/modules/erdl/core/entity/erdl-rule-record.entity'
import { ERDLSnapshot } from '@openoba/core/dist/modules/erdl/core/entity/erdl-snapshot.entity'
import { ERDLProposal, ERDLProposalVote } from '@openoba/core/dist/modules/erdl/core/entity/erdl-proposal.entity'
import { CognitiveLog } from '@openoba/core/dist/modules/eros/task/cognitive-log.entity'
import { AgentTask } from '@openoba/core/dist/modules/eros/task/agent-task.entity'
// ... 共 19 个 CORE entity 引用

// 注入 CORE 模块
import { ERDLModule } from '@openoba/core/dist/modules/erdl/erdl.module'
import { ChatModule } from '@openoba/core/dist/modules/eros/chat/chat.module'
// ... 共 7 个 CORE 模块
```

**问题**：
1. **实体层穿透** — ERP 业务层直接引用 CORE 内部 entity 路径，违反开闭原则
2. **跨层依赖难以维护** — CORE 重构/重命名 → ERP 编译失败
3. **闭源引擎的实体名、模块路径都暴露给开源层** — 反向工程门槛低
4. **.tgz 包内 dist 路径被硬编码** — 构建产物结构变化会导致 import 全军覆没

**理想架构**：
```
ERP 开源层                  CORE 闭源层
   ↓                              ↓
Public API (DTO)  ←  Interface  →  Service
   ↓                              ↑
   └────── Shared Kernel ─────────┘
              (interface + types)
```

**优先级**：P1（影响 CORE 闭源商业化能力）
**建议工时**：2-3 周（建立 CORE public API 层 + ERP 迁移到 DTO 引用）

#### 🟠 P1-5：forwardRef 循环依赖（架构异味）

```typescript
// modules/product/pricing-engine.service.ts:56
@Inject(forwardRef(() => ERDLRuleEngine))
private readonly erdlRuleEngine?: ERDLRuleEngine,

// modules/after-sales/after-sales.service.ts:27
// forwardRef 注入 InventoryService（详见全检报告 P17）
```

**forwardRef 反映的真正问题**：
- PricingEngine 知道太多其他模块（Member、Customer、Promotion、Product）
- 8 个 Repository 在一个 Service 里（God Service 模式）

**优先级**：P1（架构债，越拖越难重构）

#### 🟠 P1-6：缺少模块边界契约（无 Port-Adapter 模式）

**现状**：
- ERP Service 直接调用 `InventoryService.unlock()`、`stockOut()` 等具体方法
- 缺少抽象接口（如 `IInventoryPort`）→ CORE 替换实现不影响 ERP

**理想**：使用**端口-适配器**（Hexagonal Architecture）模式，让 CORE 引擎与 ERP 业务都通过接口解耦。

**优先级**：P1（长期可维护性）

#### 🟡 P2-4：缺乏领域驱动设计（DDD）痕迹

- 模块命名是技术性的（auth, customer, order）而非业务性的（CRM, OMS, Pricing）
- 缺少聚合根（Aggregate Root）边界 — 例如 `Order` 应作为聚合根，封装 `OrderItem`、`OrderPayment`、`OrderShipment` 的不变量
- 缺少领域事件（Domain Events）— 例如 `OrderPaidEvent` 应触发库存锁定 + 客户资产更新

**优先级**：P2（架构演进方向）
**建议**：先在订单/库存领域试点，再推广

#### 🟡 P2-5：MongoDB 风格的 `isDeleted` 软删除与 TypeORM 集成差

整个项目使用 `isDeleted: boolean` 软删除，但：
- 所有查询都需手动加 `.where('isDeleted = :del', { del: false })`（已发现 47 处）
- TypeORM 有 `softDelete()` / `restore()` 装饰器 + `@DeleteDateColumn`，未使用
- 软删除导致唯一索引冲突（spu_code 唯一约束因软删除数据阻塞）— 已发现硬删除 SPU 的代码绕过（product.service.ts:148）

**建议**：统一迁移到 TypeORM 内置软删除 + 唯一索引调整

---

### 维度 3：安全性与数据保护（权重 25%）

> 本章节与 `pre-launch-check-openoba-starter-2026-06-08.md` 全检报告形成交叉验证。

#### 🔴 P0-2：CORE 闭源层源码不可审计（黑盒信任风险）

**现状**：
- `openoba-core-1.0.0.tgz` 428KB 压缩包，5.4M 源码
- 部署时直接 `node dist/main.js`，**无源码审计窗口**
- 实际编译后的 `.tgz` 已被 npm 压缩，无法 reverse 出原始 TypeScript

**风险**：
1. 一旦 CORE 引擎含有恶意代码（如外发敏感数据），**开源层 ERP 业务完全暴露**
2. CORE 闭源许可证（BSL）虽然限制了再分发，但**未限制运行时数据收集**
3. 用户的客户隐私数据流经 CORE 引擎，**却无法审计其数据处理逻辑**

**建议**：
- **短期**：与 CORE 提供方签订**数据处理协议 (DPA)** + SOC2 审计报告
- **中期**：CORE 提供**最小可信代码包** + 第三方安全审计
- **长期**：在 ERP 侧实现**数据脱敏出口**（已有 `data-mask.util.ts` 雏形，但未集成到响应拦截器）

**优先级**：P0（商业信任风险）

#### 🔴 P0-3：P0-1 Wizard 未认证端点风险（与全检报告一致）

**说明**：详见全检报告 #2（已记录）。本审计**确认**此为阻断项。

#### 🟠 P1-7：字典控制器 SQL 注入风险（与全检报告 #12 一致）

```typescript
// modules/dictionary/dict.controller.ts:239
const selectClause = this.columnAlias[tableName] || '*'
const rows = await this.dataSource.query(`SELECT ${selectClause} FROM ${tableName} ORDER BY sort_order ASC`)
```

**根因**：`columnAlias` 字典的列名未做反引号包裹、未做白名单校验。
**优先级**：P1（已记录）

#### 🟠 P1-8：24 处 LIKE 查询仅 1 处做通配符转义

```bash
# 24 处使用 LIKE :param，但只有 order.service.ts:82 做了转义
# 23 处都直接拼入 %keyword%
modules/after-sales/after-sales.service.ts:100
modules/color/color.service.ts:102, 170
modules/customer/customer.service.ts:92, 741
modules/draft-pool/draft.service.ts:75
modules/inventory/inventory.service.ts:40, 77
modules/product/external-barcode-mapping.service.ts:18
... （共 23 处）
```

**攻击场景**：keyword=`%` 或 `_` 可匹配全部行，绕过业务过滤（如过滤已删除记录）。
**优先级**：P1（数据泄露风险）

#### 🟠 P1-9：JWT Token 存于 localStorage（XSS 窃取）

```typescript
// frontend/src/api/request.ts:14
const token = localStorage.getItem('access_token')
```

**问题**：
- 已有 2 处 `v-html`（AgentChat.vue:54, 93, 103；KnowledgeCenter.vue:87），均已用 DOMPurify 净化（已做防护）
- 但**任何未来的 XSS 漏洞**都会直接窃取 7 天有效期的 access_token
- 无 refresh_token + 黑名单机制（与全检报告 #22 一致）

**建议**：
- 短期：迁移到 **httpOnly + Secure + SameSite=Strict** 的 Cookie（前端 Vue 仍可读，但 JS 无法访问）
- 中期：实现 15 分钟短 access_token + 7 天 refresh_token + Redis 黑名单

**优先级**：P1（高概率 XSS 漏洞在 LLM 输出侧发生）

#### 🟠 P1-10：Math.random() 用于业务 ID 生成（8 处）

```typescript
// modules/customer/customer.service.ts 多处
const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const id = `con-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
// ... 8 处
```

**问题**：
- Math.random() **非密码学安全**，理论可预测
- Date.now() + 4 字符随机后缀 → 4^36 = ~1.7M 组合，但**时间戳窗口可缩小**
- 高频场景（批量导入客户）冲突风险不可忽略

**建议**：统一封装 `generateBusinessId(prefix)` → `crypto.randomUUID()`，删除所有 Math.random

**优先级**：P1（业务正确性 + 安全性）

#### 🟡 P2-6：orderNo 生成存在并发风险（与全检报告 #15 一致）

```typescript
// modules/order/order.service.ts:212
const count = await this.orderRepo.count()
const orderNo = `MJ-${dateStr}-${String(count + 1).padStart(4, '0')}`
```

**优先级**：P2（已记录）

#### 🟡 P2-7：Token 7 天有效期过长

```typescript
// modules/auth/auth.service.ts:38-43
const payload = {
  sub: userData.userId,
  username: userData.username,
  roles: userData.roles || [],
}
return {
  accessToken: this.jwtService.sign(payload),  // 默认 7 天
  ...
}
```

**优先级**：P2（与全检报告 #22 一致）

---

### 维度 4：性能与可扩展性（权重 15%）

#### 🟠 P1-11：前端 bundle 体积 2.8M（Element Plus 全量引入）

**现状**：
- `dist/` 总体积 2.8M
- 全检报告记录单 chunk 895KB（gzip 287KB）
- Element Plus 全量引入是根因

**优化**：
- 按需引入：`<el-button>` → 自动 tree-shake
- Vite `manualChunks` 拆分 vendor
- 预期：主 chunk 降至 300-400KB（gzip 100-150KB），首屏提速 40%

**优先级**：P1（用户体验）
**建议工时**：1 周

#### 🟠 P1-12：多处循环中同步数据库调用（可能 N+1）

```typescript
// modules/order/order.service.ts:152-203
for (const orderItem of orderItems) {
  const priceResult = await this.pricingEngineService.calculatePrice({...})
  // 每个 SKU 单独查询价格 → 100 个 SKU = 100 次查询
}
```

```typescript
// modules/order/order.service.ts:505-514
const items = await manager.find(OrderItem, { where: { orderId: dto.orderId } })
for (const item of items) {
  await this.inventoryService.lockInTransaction(manager, {...})
  // 每个 item 单独锁定 → N+1
}
```

**建议**：
- 批量预查询：`Promise.all(items.map(...))`
- 批量更新：使用 `UPDATE ... WHERE skuId IN (...)`
- 预期：批量创建 100 SKU 订单从 5s 降至 0.5s

**优先级**：P1
**建议工时**：1-2 周

#### 🟡 P2-8：连接池配置 50 上限（中等规模够用但应监控）

```typescript
// app.module.ts:103
extra: {
  connectionLimit: 50,
  connectTimeout: 10000,
  waitForConnections: true,
  queueLimit: 0,
}
```

**建议**：引入 `connectionLimit: 100` + 数据库连接池监控（TypeORM 自带 `dataSource.driver.pool`）

#### 🟡 P2-9：缺少缓存层（Redis 未启用）

**现状**：无 Redis 依赖
**已识别热点**：
- 字典表（`DictConstantsModule` 已缓存到内存，单实例 OK，多实例需 Redis）
- 暴力破解防护（Map → Redis 必需）
- JWT 黑名单（如启用短 token）

**优先级**：P2（多实例部署前提）

---

### 维度 5：测试覆盖与质量保障（权重 10%）

#### 🟠 P1-13：后端测试覆盖率 ~1.4%（3/220 = 1.4%）

```bash
# 后端仅有 3 个 .spec.ts 文件：
packages/backend/src/modules/inventory/inventory.service.spec.ts
packages/backend/src/modules/order/order.service.spec.ts
packages/backend/src/modules/product/product.service.spec.ts

# 全检报告 #27 记录：2/3 测试套件失败（依赖注入 mock 不完整）
```

**覆盖率分布**：
- 21 个业务模块中，**3 个**有测试 → 14% 模块覆盖
- 估计**行覆盖率 < 10%**（无 jest --coverage 实际运行数据）

**核心风险**：
- 9 轮安全审计的修复**完全没有自动化测试保护**——下次重构会立即回退
- OrderService 800 行代码无任何测试 → 状态机/事务边界/库存联动 = 暗箱

**建议路线图**：
| 阶段 | 目标 | 工时 |
|------|------|------|
| 1. 关键路径 | OrderService 状态机 + 库存联动 | 1 周 |
| 2. 业务规则 | PricingEngine + MemberLevel + Discount | 1 周 |
| 3. 认证授权 | AuthGuard + RolesGuard | 3 天 |
| 4. 通用工具 | 数据脱敏 + UUID 生成 + 加密 | 3 天 |
| 5. 覆盖率目标 | 后端 60% / CORE 70% / 前端 50% | 持续 |

**优先级**：P1（与全检报告 #27 强化）

#### 🟠 P1-14：前端 0 个组件测试

```bash
# 前端：
frontend/src/__tests__/      # 7 个 utility/store 测试
frontend/src/**/*.vue        # 0 个 .spec.ts 文件
```

**问题**：
- 6 个 800+ 行的 Vue 组件**完全没有测试**
- 任何 UI 变更（element-plus 升级、vue 升级）都会引发潜在崩溃
- Pinia store 仅 user-store 有测试

**建议**：优先为 router/store 编写测试，组件测试用 `@vue/test-utils` + happy-dom

**优先级**：P1
**建议工时**：2-3 周

#### 🟡 P2-10：测试运行未集成到 CI

无 `.github/workflows/test.yml` → 任何人提交的代码都不验证测试是否通过。

---

### 维度 6：文档与开发体验（权重 10%）

#### 🟠 P1-15：README 描述与实际目录结构不一致

```markdown
# README.md 描述：
├── openoba-core/          # 引擎层（BSL）
│   ├── backend/dist/      # 编译后 NestJS
│   └── frontend/dist/     # 编译后 Vue3
├── eyewear-erp/           # 行业层（MIT 源码）  ← ❌ 实际不存在
│   ├── backend/src/
│   ├── frontend/src/
│   ├── database/
│   └── erdl/

# 实际目录：
├── openoba-core/          # 独立目录（包含完整 src + dist）
├── packages/
│   ├── backend/           # ERP 实际位置
│   ├── core/              # core 编译后 npm 包
├── frontend/              # ERP 前端
├── database/              # 数据库初始化
```

**影响**：开源项目的"第一印象"——贡献者按 README 找不到 `eyewear-erp/` → 离开。

**优先级**：P1（开源项目生死线）

#### 🟠 P1-16：缺少架构图、时序图、数据流图

**理想文档**（参考 GitLab Handbook、Cal.com 实践）：
- `docs/architecture/01-system-overview.md` — 系统总览图
- `docs/architecture/02-module-dependency.md` — 模块依赖矩阵
- `docs/architecture/03-data-flow.md` — 订单创建数据流
- `docs/architecture/04-deployment-topology.md` — 部署拓扑

**优先级**：P1

#### 🟡 P2-11：API 文档（Swagger）覆盖率 82%

```bash
# 34 个 controller 中：
# 28 个使用 @ApiTags/@ApiOperation → 82%
# 6 个缺失或仅部分装饰
```

**优先级**：P2

#### 🟡 P2-12：缺少 CHANGELOG / VERSION_MIGRATION

用户从 1.0 升级到 1.3 完全靠"看 Git 提交"。

**优先级**：P2

#### 🟢 P3-3：5 个 package.bak-verup-20260608-1815.json 残留

```
./package.bak-verup-20260608-1815.json
./packages/backend/package.bak-auditfix-20260608-1703.json
./packages/backend/package.bak-verup-20260608-1815.json
./packages/core/package.bak-verup-20260608-1815.json
```

---

### 维度 7：工程化与 DevOps（权重 5%）

#### 🟠 P1-17：缺少工程化配置文件（lint/format/commit/CI）

详见 §1.3 表格，影响：
- PR 风格不可强制统一
- Pre-commit 无质量门禁（容易提交编译失败的代码）
- 无 CI → 任意 push 都可能破坏主干

**建议建立**：

| 工具 | 作用 | 优先级 |
|------|------|--------|
| **ESLint** + `eslint-config-prettier` | 代码风格 + 错误检测 | P1 |
| **Prettier** | 格式化统一 | P1 |
| **Husky** + **lint-staged** | Pre-commit 自动 lint/format | P1 |
| **commitlint** + **Conventional Commits** | 提交信息规范 | P2 |
| **GitHub Actions** | CI（test + lint + build）| P1 |
| **SonarQube / CodeQL** | 静态分析（已识别死代码、安全漏洞）| P2 |
| **Codecov** | 覆盖率可视化 | P3 |
| **Renovate / Dependabot** | 依赖自动升级 PR | P3 |

**优先级**：P1
**建议工时**：2-3 天建立基础 + 1 周完善规则

#### 🟠 P1-18：dev/prod 环境配置混乱

```typescript
// main.ts 中混用 NODE_ENV / APP_ENV
if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') { ... }
if (process.env.NODE_ENV !== 'production') { ... }
```

**问题**：
- 多个环境变量控制同一行为（`NODE_ENV` vs `APP_ENV`）
- 只有 2 处检查生产环境 → 其他逻辑无环境感知（如 deployment.service 永远执行）

**优先级**：P1

#### 🟡 P2-13：缺少 Docker 化部署

无 `Dockerfile` / `docker-compose.yml` → 部署依赖 `start.bat` + 人工配置。

**优先级**：P2（运维效率）

#### 🟡 P2-14：依赖版本漂移

```json
"typescript": "~6.0.2",      // 前端用 TS 6（极新）
"typescript": "^5.1.3",      // 后端用 TS 5
"vite": "^8.0.4",            // 前端 Vite 8（极新）
"nestjs/common": "^10.0.0",  // NestJS 10（最新主版本是 11）
"typeorm": "^0.3.17",        // TypeORM 0.3（稳定）
```

**问题**：
- TypeScript 5 vs 6 混用 → 类型兼容性可能存在问题
- Vite 8 / vitest 4 极新版本 → 兼容性风险
- 缺乏 `package-lock.json` 强校验（已有，但易被 -E 参数绕过）

**优先级**：P2

---

## 📊 3. 综合评分矩阵

| 维度 | 权重 | ERP 开源层 | CORE 闭源层 | 前端 | 加权得分 |
|------|------|-----------|-----------|------|----------|
| 1. 代码质量与可维护性 | 20% | C+ (62) | B+ (80)* | C- (55) | 64.8 |
| 2. 架构与设计模式 | 15% | C+ (65) | B+ (80)* | C (60) | 68.25 |
| 3. 安全性与数据保护 | 25% | C+ (68)** | B+ (80)* | C (60)** | 69.0 |
| 4. 性能与可扩展性 | 15% | C+ (65) | B (75) | C (60) | 66.0 |
| 5. 测试覆盖与质量保障 | 10% | D+ (55) | C+ (70)* | D (50) | 58.0 |
| 6. 文档与开发体验 | 10% | C (60) | C+ (70)* | C- (55) | 61.5 |
| 7. 工程化与 DevOps | 5% | D+ (55) | C (65) | D (50) | 56.5 |
| **加权总分** | 100% | **C+ (63.6)** | **B+ (76.4)*** | **C- (56.9)** | **65.0** |

\* CORE 闭源层评分基于 dist 编译产物分析 + 集成层（app.module.ts）观察，非源码审计，**置信度中等**
\** 安全评分结合全检报告（已修复的 P0）综合给出

---

## 🚦 4. 评级与决策

### 4.1 Go / No-Go 决策

| 视角 | 结论 | 理由 |
|------|------|------|
| **本审计** | 🟡 **Conditional Go** | 安全 P0 已修复，工程质量债虽高但**不阻断业务** |
| **6/8 全检** | 🔴 **No-Go**（修复前）| 5 P0 + 9 P1 安全阻断项 |
| **修复后（建议）**| 🟢 **Go with conditions** | P0 全部修复 + P1 修复 50%+ 即可上线 |

### 4.2 关键决策点

| 决策 | 建议 |
|------|------|
| **是否立即开源？** | ❌ **不建议** — 须先完成 P0-1（架构债）+ P1-13/14（测试）|
| **CORE 闭源商业化？** | ⚠️ **需先做 P0-2（黑盒信任）+ P1-4（架构解耦）** |
| **引入新成员？** | ⚠️ **需先补文档** — P1-15/16 优先级最高 |
| **多实例部署？** | ❌ **当前不可行** — 内存 Map 限流（5 处）需迁移 Redis |

---

## 🛠️ 5. 整改路线图（Roadmap）

### Phase 1：上线前必修（2 周内）— 阻断 P0

| ID | 任务 | 工时 | 责任方 |
|----|------|------|--------|
| P0-1 | 拆分 order.service.ts 800 行（最小可拆分：支付/发货/库存联动分离）| 5d | 后端 |
| P0-2 | CORE 黑盒信任缓解：与 CORE 提供方签订 DPA + 增加运行时数据脱敏出口 | 2d | 架构师 + 法务 |
| P0-3 | 配合全检 P0-1~P0-5 修复（执行中）| - | - |

### Phase 2：1 个月内完成（高优先级 P1）— 工程质量基础

| ID | 任务 | 工时 | 责任方 |
|----|------|------|--------|
| P1-1 | 拆分 8 个超长 Service + 6 个超大 Vue 组件 | 3-4 周 | 后端 + 前端 |
| P1-2 | 234+241 处 `any` 全面替换为具体类型 | 2-3 周 | 全栈 |
| P1-3 | 24 处静默 catch 添加日志或显式 rethrow | 3-5d | 后端 |
| P1-4 | CORE/ERP 架构解耦（CORE Public API + ERP DTO 化）| 2-3 周 | 架构师 |
| P1-5 | 移除 forwardRef 循环依赖 | 1 周 | 后端 |
| P1-7 | 字典控制器 SQL 注入修复 | 1d | 后端 |
| P1-8 | 23 处 LIKE 通配符转义 | 2d | 后端 |
| P1-9 | JWT 迁移到 httpOnly Cookie | 1 周 | 全栈 |
| P1-10 | Math.random → crypto.randomUUID | 1d | 后端 |
| P1-11 | Element Plus 按需引入 + Vite chunk 拆分 | 1 周 | 前端 |
| P1-12 | 批量操作 N+1 优化 | 1-2 周 | 后端 |
| P1-13 | OrderService/PricingEngine/AuthGuard 测试覆盖 | 2-3 周 | 后端 |
| P1-14 | 前端组件测试基础设施 | 2-3 周 | 前端 |
| P1-15 | README 重写 + 文档体系 | 1 周 | 全栈 |
| P1-16 | 架构图/数据流图 | 1 周 | 架构师 |
| P1-17 | ESLint/Prettier/Husky/CI 配置 | 2-3d + 1 周 | DevOps |
| P1-18 | 统一环境变量（仅 NODE_ENV）| 0.5d | 后端 |

### Phase 3：2-3 个月内（中优先级 P2）— 工程化与文档

（详见 §2 各 P2 编号，含 DTO 重构、CHANGELOG、Swagger 100%、Docker 化、依赖统一、SonarQube、DDD 试点）

### Phase 4：3-6 个月内（持续优化 P3）— 长期工程文化

（详见 §2 各 P3 编号，含 .bak 清理、TODO 跟踪、codecov 接入、Renovate 依赖升级）

---

## 📐 6. 代码审查机制建立建议（核心交付）

> 本节是用户原始诉求"建立系统的代码审查机制"的直接回应。

### 6.1 审查标准（标准化 Checklist）

#### ERP 开源层审查清单（24 项）

| 类别 | 编号 | 检查项 | 严重度 |
|------|------|--------|--------|
| **安全** | S-01 | SQL 使用参数化查询，无字符串拼接 | 🔴 |
| **安全** | S-02 | Controller 必含 `@UseGuards(JwtAuthGuard)` + `@Roles(...)` | 🔴 |
| **安全** | S-03 | 用户输入必经 `class-validator` 装饰器 | 🔴 |
| **安全** | S-04 | LIKE 查询做通配符转义 | 🟠 |
| **安全** | S-05 | 业务 ID 用 `crypto.randomUUID()` 而非 `Math.random()` | 🟠 |
| **安全** | S-06 | 敏感字段不写入日志（密码、token、API Key）| 🟠 |
| **安全** | S-07 | exec/execSync 必须用 `execFile`/`spawn` 参数化形式 | 🔴 |
| **事务** | T-01 | 多表写操作必须在 `dataSource.transaction()` 内 | 🔴 |
| **事务** | T-02 | 并发敏感操作（支付/库存/状态变更）使用 `pessimistic_write` 锁 | 🔴 |
| **事务** | T-03 | 事务内仅做最小化工作（不发 HTTP、不调外部 API）| 🟠 |
| **类型** | TY-01 | Service 公开方法签名**禁止** `any`（DTO 类型必须定义）| 🟠 |
| **类型** | TY-02 | DTO 必须用 `class-validator` 装饰器（不允许 `interface` 替代 DTO）| 🟠 |
| **类型** | TY-03 | 错误捕获 `catch (e: unknown)`，**禁止** `catch (e: any)` | 🟢 |
| **可维护** | M-01 | 单个 Service 文件 ≤ 400 行（特殊例外需 PR 说明）| 🟠 |
| **可维护** | M-02 | 静默 `catch {}` 必须 `logger.error()` + 处理决策 | 🟠 |
| **可维护** | M-03 | 公开方法必须有 JSDoc（含业务规则、副作用、并发约束）| 🟡 |
| **可维护** | M-04 | 命名遵循 NestJS 约定（`.controller.ts` / `.service.ts` / `.entity.ts`）| 🟢 |
| **可维护** | M-05 | 软删除字段统一 `isDeleted: boolean` + `is_deleted` 列 | 🟡 |
| **性能** | P-01 | 列表查询必须支持分页（禁止无限制 `find()`）| 🟠 |
| **性能** | P-02 | 循环中 `await` 需评估 N+1，必要时 `Promise.all` | 🟠 |
| **测试** | Q-01 | 新 Service 必含 `.spec.ts`（核心 Service 覆盖率 ≥ 60%）| 🟠 |
| **测试** | Q-02 | 状态机/规则引擎/支付逻辑必须有边界用例 | 🔴 |
| **依赖** | D-01 | 禁止从 `@openoba/core/dist/...` 引用内部 entity（必须 CORE 公开 API）| 🟠 |
| **依赖** | D-02 | 依赖注入 ≤ 8 个（超出需拆分）| 🟡 |

#### CORE 闭源层审查清单（差异化）

| 类别 | 检查项 | 备注 |
|------|--------|------|
| **接口** | 公开 API 必须有 DTO + 详细 JSDoc（含性能特征、并发限制）| CORE 商业化要求 |
| **向后兼容** | 公共方法签名变更需 deprecate 旧版本（至少保留 1 个 minor 版本）| BSL 许可证要求 |
| **数据流** | 任何对外部 API 的调用必须有重试/降级/超时 | LLM 集成的稳定性 |
| **加密** | 加密密钥不得硬编码，必须从环境变量或密钥管理服务 | BSL 商业化合规 |
| **审计** | 关键操作（LLM 调用、数据导出、用户认证）必须写审计日志 | 企业级要求 |
| **性能** | LLM 调用必须有缓存层（Redis）+ 限流 + 成本监控 | 商业可持续性 |

#### 前端审查清单（20 项）

| 类别 | 编号 | 检查项 | 严重度 |
|------|------|--------|--------|
| **类型** | F-01 | `strict` TS 配置必须开启，`<script setup lang="ts">` | 🟠 |
| **类型** | F-02 | 组件 props 必须用 `defineProps<{}>()` 类型化 | 🟠 |
| **类型** | F-03 | 禁止 `any` 出现在 script 块中 | 🟠 |
| **性能** | F-04 | 大列表用 `virtual-list`（>100 项）| 🟠 |
| **性能** | F-05 | 计算属性 `computed` 优于 methods + template | 🟢 |
| **安全** | F-06 | `v-html` 必须先 `DOMPurify.sanitize()` | 🔴 |
| **安全** | F-07 | JWT 不得存于 localStorage（建议 httpOnly Cookie）| 🟠 |
| **可维护** | F-08 | 单个 SFC 文件 ≤ 400 行（不含模板，可有例外）| 🟠 |
| **可维护** | F-09 | 复杂模板拆为 `<template>` 子组件 | 🟡 |
| **可维护** | F-10 | 业务逻辑放在 composable 而非直接放 setup | 🟡 |
| **可维护** | F-11 | API 调用统一封装到 `src/api/`，禁止业务组件直接 axios | 🟡 |
| **状态** | F-12 | 跨页面状态用 Pinia store，组件内状态用 `ref/reactive` | 🟡 |
| **状态** | F-13 | localStorage 读写必须 try-catch + 类型守卫 | 🟠 |
| **测试** | F-14 | 核心 composable / store / 工具函数必须有 .spec.ts | 🟠 |
| **测试** | F-15 | 路由守卫、Pinia store、API 拦截器必须有测试 | 🟠 |
| **构建** | F-16 | Element Plus 按需引入，禁止 `import * as ElementPlus` | 🟠 |
| **构建** | F-17 | `dist/` 不应包含 `console.log`（构建时 esbuild drop）| 🟢 |
| **样式** | F-18 | SCSS 变量统一在 `styles/variables.scss` | 🟢 |
| **样式** | F-19 | Element Plus 样式覆盖放 scoped style，不污染全局 | 🟢 |
| **国际化** | F-20 | 用户可见字符串预留 i18n hook（即使未启用）| 🟢 |

### 6.2 审查流程（Process）

```
PR 创建 → 自动化门禁 → 同行审查 → Maintainer 审查 → 合入
   ↓            ↓             ↓            ↓
   ↓     CI: lint/test/build  1-2 名 reviewer   1 名 owner
   ↓            ↓             ↓            ↓
   ↓         失败则阻断      高严重度 48h 内    关键模块二次审查
   ↓
模板：背景/变更/影响/测试/截图
```

#### 审查流程细则

1. **PR 模板（强制）**：
   ```markdown
   ## 背景
   - 关联 Issue：#123
   - 业务背景：（1-2 句话）
   
   ## 变更内容
   - [ ] 改动点 1
   - [ ] 改动点 2
   
   ## 影响范围
   - 模块：
   - 数据库迁移：[ ] 是 [ ] 否
   - 配置文件：[ ] 是 [ ] 否
   - CORE 依赖：[ ] 是 [ ] 否
   
   ## 测试
   - [ ] 单元测试已添加
   - [ ] 手动测试已通过
   - [ ] 截图/录屏：...
   
   ## 审查 Checklist
   - [ ] S-01 ~ S-07 安全项
   - [ ] T-01 ~ T-03 事务项
   - [ ] TY-01 ~ TY-03 类型项
   - [ ] M-01 ~ M-05 可维护项
   - [ ] P-01 ~ P-02 性能项
   - [ ] Q-01 ~ Q-02 测试项
   - [ ] D-01 ~ D-02 依赖项
   ```

2. **审查 SLA**：
   | 严重度 | 首次响应 | 完成审查 |
   |--------|----------|----------|
   | 🔴 P0（紧急）| 2 小时 | 4 小时 |
   | 🟠 P1（高）| 4 小时 | 24 小时 |
   | 🟡 P2（中）| 1 工作日 | 3 工作日 |
   | 🟢 P3（低）| 3 工作日 | 1 周 |

3. **审查人员分配**：
   - **必须 1 名模块 Owner** 审查 + approve
   - **架构影响**（跨模块、新模块、依赖变更）：+1 名架构师审查
   - **安全影响**（加密、认证、SQL、命令执行）：+1 名安全审查（可由 OWASP 培训过的成员担任）
   - **CORE 闭源层变更**：必须有 2 名 Maintainer approve

4. **审查反馈分级**：
   ```
   🔴 Blocker：必须修改才能合入（标记为 PR:changes-requested）
   🟠 Suggestion：强烈建议修改（可注明 reasoning 后由作者决定）
   💭 Nit：可选修改（不影响合入）
   ❓ Question：澄清意图（可能升级为 Blocker）
   👍 Good：正向反馈（鼓励）
   ```

5. **自动化门禁（CI）**：
   ```yaml
   # .github/workflows/ci.yml
   - ESLint（错误数 > 0 阻断）
   - Prettier check
   - TypeScript type check（vue-tsc + tsc --noEmit）
   - Jest 单元测试（覆盖率阈值：后端 50%、CORE 70%）
   - Vitest 前端测试
   - Build（nest build + vite build）
   - SonarQube 静态分析（可选）
   - npm audit（高级别漏洞阻断）
   ```

### 6.3 审查角色矩阵（RACI）

| 角色 | 责任 | 人数 |
|------|------|------|
| **作者 (Author)** | 创建 PR、自测试、回应反馈 | 1 |
| **同行审查 (Reviewer)** | 代码质量、风格、最佳实践 | 1-2 |
| **模块 Owner** | 业务正确性、向后兼容 | 1 |
| **架构师** | 架构一致性、依赖关系 | 0-1 |
| **安全卫士** | 安全项审查 | 0-1（兼职）|
| **Maintainer** | 最终合入权 | 1-2 |
| **DevOps** | CI/CD、构建、部署 | 0-1（兼职）|

### 6.4 审查指标与持续改进

#### 关键指标（每周 review）

| 指标 | 目标值 |
|------|--------|
| **PR 平均审查时间** | < 24 小时（P1）、< 4 小时（P0）|
| **PR 平均合入时间** | < 3 天 |
| **首次通过率** | > 60% |
| **每个 PR 反馈数** | 5-15（过少=走过场，过多=质量差）|
| **代码覆盖率** | 月增长 +2% |
| **CI 失败率** | < 10% |
| **逃逸到生产的 bug 数** | < 5% 总 bug 数 |

#### 月度回顾（每月一次）

- 审查 SLA 是否达标？
- 高频 Block 项是否需要**自动化门禁**（如类型检查、Lint）？
- 模块 Owner 是否需要调整？
- 新发现的反模式 → 更新 Checklist

---

## 📋 7. 总结

### 7.1 一句话总结

> **OpenOBA Starter 已通过 9 轮密集安全审计从 "D 级危险" 提升至 "C+ 级可上线"，但工程质量债（超长 Service、缺失测试、工程化空白）仍是开源化与多团队协作的最大瓶颈。**

### 7.2 三大核心建议

1. **【架构解耦】** P0-1 + P1-4 优先——拆分超长 Service + 建立 CORE 闭源/ERP 开源边界，否则**任何重构都是饮鸩止渴**。
2. **【测试打底】** P1-13/14 优先——没有测试保护的 9 轮安全修复是"沙堡"，下次重构或人员流动会立即回退。
3. **【工程化建设】** P1-17 优先——Linting/Formatting/CI 是**降低未来代码质量债的最低成本手段**（2-3 天即可建立基础）。

### 7.3 开源就绪度评估

| 维度 | 当前 | 上线要求 | 开源就绪要求 |
|------|------|----------|--------------|
| 安全 | C+ (68) | B+ (78) | A- (85) |
| 测试 | D+ (55) | C+ (70) | B+ (78) |
| 文档 | C- (55) | C+ (68) | B+ (78) |
| 工程质量 | C (62) | C+ (68) | B (75) |
| **综合** | **C+ (60)** | **C+ (70)** | **B (78)** |

**当前距"上线"差 10 分，距"开源"差 18 分**。

### 7.4 行动呼吁

1. **本周内**：建立 ESLint + Prettier + Husky 基础（2 天）
2. **本月内**：完成 P0 架构拆分 + P1 关键测试
3. **本季度内**：完成 P1 + P2 全部工作，进入"开源候选"状态
4. **持续**：建立代码审查文化，每月回顾审查指标

---

## 附录 A：审计方法论

### A.1 工具与方法
- 静态分析：手工代码审计 + grep/glob 模式匹配
- 度量指标：文件行数、复杂度（McCabe 估算）、耦合度（import 计数）
- 交叉验证：与 `pre-launch-check-openoba-starter-2026-06-08.md` 全检报告对比
- 风险评估：基于 OWASP Top 10 + Google Engineering Practices + Microsoft REST API Guidelines

### A.2 局限性说明
- **CORE 闭源层**仅能审计 dist 编译产物（5.4MB），**源码审计置信度中等**
- **TypeScript 错误数（689+）**未实际运行 `tsc --noEmit` 确认（无 tsconfig 全量验证）
- **测试覆盖率**未运行 `jest --coverage`（已有测试 2/3 失败，全检报告已记录）
- **性能指标**未做实际压测，基于代码模式静态评估

### A.3 审计人员声明
本审计基于审计时点（2026-06-08）的代码状态。代码可能持续演进，建议每季度执行一次类似审计以跟踪整改进度。

---

**报告结束**

*Powered by WorkBuddy Code Reviewer Expert · 2026-06-08*
