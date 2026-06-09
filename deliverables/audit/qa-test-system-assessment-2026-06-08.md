# OpenOBA Starter — 测试体系与质量门禁评估报告

**评估日期**：2026-06-08
**评估人**：QA 工程师 严过关（Yan）
**评估范围**：后端（Jest）+ 前端（Vitest）+ CI/CD（GitHub Actions）+ 质量门禁
**报告版本**：v1.0
**对应主报告**：`code-quality-audit-report-2026-06-08.md`（维度 5：测试覆盖 / 维度 7：DevOps）

---

## 📌 执行摘要 (TL;DR)

| 评估项 | 结论 | 关键数据 |
|--------|------|----------|
| **当前测试状态** | 🔴 **远低于工业基线** | 后端覆盖率 1.4%（3/220 文件），2/3 套件失败；前端 0 组件测试；无 CI |
| **覆盖率 1.4% → 60% 的真实成本** | 🟠 **30-45 人天**（不含基础设施 5-8 人天，含维护周期 0.5 人天/周） | 不能 1 天补齐，**这是 6-8 周工程** |
| **CI 体系建设** | 🟠 **5-8 人天**（含 Docker 缓存、并行、矩阵） | GitHub Actions 模板 + SonarQube/Codecov 集成 |
| **现有失败测试根因** | 🔴 **Mock 不完整 + 8 个依赖未注入**（InventoryService 缺 `lockInTransaction`/`unlockInTransaction`） | 0.5-1 人天可修复，但**同时暴露设计债** |
| **质量门禁建议** | 🟢 **可立即上线** | 覆盖率阶梯 + 类型检查阻断 + Lint 阻断 + PR 模板 |
| **测试金字塔推荐** | 70 单元 / 20 集成 / 10 E2E | 当前倒置（95+ 单元缺位 / 5 集成缺位 / 0 E2E） |
| **核心风险** | 🟠 **测试债与代码债同源** | 800 行 Service 拆不动 → 测试也写不动 |
| **专业建议（与 PRD 不同的独立判断）** | 🟠 **不应直接追 60%** | 应分阶段：先 CI + 关键路径，再扩展 |

### 一句话总结

> **从 1.4% 到 60% 不是"补测试"，是"建体系"——包含基础设施（CI+Mock 工厂+覆盖率门禁）、关键路径用例（状态机/支付/库存）、日常维护（每 PR +N 用例），整体 6-8 周工程 + 0.5 人天/周长期维护。强行 1 周内冲 60% 会产生"为覆盖率而测试"的反模式（空跑/弱断言），反而成为负资产。**

---

## 📐 1. 当前测试现状诊断

### 1.1 后端测试现状（深度摸底）

| 项目 | 数量 / 状态 | 评估 |
|------|------------|------|
| `.spec.ts` 文件 | **3 个**（order / inventory / product） | 仅 1.4%（3/220） |
| 覆盖模块 | 3 / 21 业务模块 = 14% 模块覆盖 | 缺失关键模块：auth / customer / pricing-engine / after-sales / website |
| 测试套件状态 | **2/3 失败**（inventory + order 失败，product 全部通过但仅 happy path） | 见 §6 根因分析 |
| 估计行覆盖率 | **< 10%**（无实际 coverage 数据） | 实际可能 3-5% |
| 测试类型分布 | 100% 单元测试，**0 集成 / 0 E2E** | 倒三角反模式 |
| 共享 Mock 工具 | ❌ 无 `mockRepo()` / `mockQueryBuilder()` 复用 | 3 个 spec 各写一遍，复制粘贴严重 |
| 测试夹具（Fixture） | ❌ 无 `OrderFixture` / `CustomerFixture` | 数据准备硬编码 |
| 异步/并发测试 | ❌ **0 用例** | 状态机/支付并发=盲区 |
| 事务回滚测试 | ❌ **0 用例** | 9 轮安全审计的"悲观锁"修复无回归保护 |
| 时间相关测试 | ❌ 无 `jest.useFakeTimers()` 实践 | 业务时间字段测试不可靠 |

### 1.2 前端测试现状

| 项目 | 数量 / 状态 | 评估 |
|------|------------|------|
| `.spec.ts` / `.test.ts` | **7 个** | 全在 `src/__tests__/`（utility/store/API） |
| 覆盖范围 | 7 utility + 1 store (user-store) | 0 组件 / 0 composable / 0 路由 / 0 视图 |
| 1356 行 `Customers.vue` | ❌ **0 测试** | 整个客户管理无回归保护 |
| 14 个 composable | ❌ **0 测试** | `useDict` / `usePricingPromotions` / `useProductSpu` 等核心可复用逻辑无保护 |
| Pinia store | 1/2 有测试（user-store） | 业务 store 完全裸奔 |
| 路由守卫 | ❌ **0 测试** | 权限路由切换无验证 |
| E2E（Playwright） | ❌ **0 个 `.spec.ts` 文件**（仅 `package.json` 声明） | 安装但未用 |
| 现有 7 个测试质量 | 简单断言为主，缺乏边界 | 覆盖率指标为 0（未跑 `vitest --coverage`） |

### 1.3 基础设施现状

| 项 | 状态 | 影响 |
|----|------|------|
| `.github/workflows/` | ❌ **不存在** | 任何 push 都不验证 |
| `jest.config.js` | ⚠️ 内嵌于 `package.json`（无独立文件） | 配置分散，难维护 |
| `vitest.config.ts` | ❌ **不存在**（仅 package.json scripts） | 浏览器/Node 环境未分离 |
| ESLint | ⚠️ 插件已装但**无 `.eslintrc`**（仅有 `lint` script 引用不存在的配置） | `npm run lint` 会失败 |
| Prettier | ⚠️ 已装但**无 `.prettierrc`** | 格式化无规则 |
| Husky / lint-staged | ❌ 不存在 | 无 commit 门禁 |
| `commitlint` | ❌ 不存在 | 提交信息无规范 |
| Codecov / SonarQube | ❌ 不存在 | 覆盖率仅本地可见 |
| Docker 测试容器 | ❌ 不存在 | 测试依赖本机 MySQL，无法并行 |

### 1.4 与 PRD 目标的差距

| PRD 目标 | 当前 | 差距 |
|----------|------|------|
| 后端 50% → 60% | 1.4% | **差 58.6 个百分点** |
| CORE 70% | N/A（闭源，无 dist 源码可测） | 需建立 CORE 测试白盒通道（不在本评估范围） |
| 前端 50% | < 5%（仅 utility） | **差 45 个百分点** |
| CI 全门禁 | 无 | **差 6+ 工作流** |
| Q-01（核心 Service 必含 .spec.ts） | 3/21 满足 = 14% | 差 86% |

**关键判断**：PRD 设定的 60% 覆盖率是**理想目标**，但**没有 1 周冲刺可达**。强行冲刺的结果是**测试假数据**——空跑用例、弱断言、只为通过覆盖率检查而存在。这种测试**比没测试更糟**，因为它给团队"已有测试保护"的假象。

---

## 🧮 2. 覆盖率 1.4% → 60% 的真实工时测算

### 2.1 工时计算模型

**计算依据**：
- 后端 220 个生产文件，~35,000 行代码
- 前端 89 个生产文件，~30,000 行代码
- 经验比例：**生产 1 行 = 测试 0.5-1.5 行**（简单逻辑 0.5，状态机/分支 1.0，复杂业务 1.5）
- 工业级测试编写速度（含思考 + 写 + 调试）：**资深工程师 50-100 行/小时**

### 2.2 后端工时（达到 60% 覆盖率）

| 阶段 | 内容 | 工时 | 备注 |
|------|------|------|------|
| **1. 基础设施** | jest.config 优化 + 测试 DB（SQLite in-memory）+ 共享 mock 工厂 + Fixture 工具 + CI 工作流 | **5-8 人天** | 必须先做，否则后续测试无法稳定运行 |
| **2. 核心 Service 单元测试**（Q-01） | order / inventory / pricing-engine / auth / customer / payment 6 个核心 | **10-15 人天** | 重点：状态机/支付/库存联动 |
| **3. 业务 Service 测试** | product / after-sales / customer-auth / dictionary / website / system | **8-12 人天** | 覆盖 60% 模块 |
| **4. 集成测试** | 关键 API 端到端（订单创建 → 支付 → 发货；客户注册 → 登录） | **5-8 人天** | 需 supertest + 真实 DB |
| **5. 修复现有失败测试** | 3 个 spec 套件 | **0.5-1 人天** | 见 §6 根因 |
| **小计** | 达到后端 60% 行覆盖 | **28.5-44 人天** | **6-8 周（1 人全职）** |
| **6. 维护成本** | 每 PR 补用例、每发现 bug 补回归 | **0.5 人天/周** | **持续投入** |

### 2.3 前端工时（达到 50% 覆盖率）

| 阶段 | 内容 | 工时 | 备注 |
|------|------|------|------|
| **1. 基础设施** | vitest.config + happy-dom + @vue/test-utils 配置 + Pinia 测试工具 + Router 测试 mock | **3-5 人天** | 现有 7 个 spec 已有基础，扩展即可 |
| **2. Composable / Store 测试** | 14 个 composable + 2 个 store（含 user 扩展测试） | **5-7 人天** | 优先核心数据流（useDict / useProductSpu） |
| **3. 工具/服务层测试** | API 拦截器、axios 封装、错误处理 | **2-3 人天** | 现有 7 个 spec 扩展 |
| **4. 关键组件测试** | SpuDialog / SkuDialog / SchemaFormRenderer（核心业务组件） | **5-7 人天** | **不测 1356 行的 Customers.vue（不可行）**，先测可独立测试的小组件 |
| **5. 集成测试** | 路由守卫 + 关键用户故事 | **3-5 人天** | @vue/test-utils + MemoryRouter |
| **小计** | 达到前端 50% 覆盖率 | **18-27 人天** | **3-5 周（1 人全职）** |
| **6. 维护成本** | 组件重构 / 新组件 | **0.3 人天/周** | **持续投入** |

### 2.4 CI 体系建设工时

| 任务 | 工时 | 备注 |
|------|------|------|
| GitHub Actions 主工作流（CI.yml）| 1 人天 | Lint + Type-check + Test + Build + Audit |
| 多 Node 版本矩阵测试 | 0.5 人天 | node 18/20/22 |
| Docker 缓存（typeorm 缓存、npm 缓存）| 1 人天 | 关键：把 CI 从 8 分钟降至 3 分钟 |
| Codecov 集成 + 徽章 | 0.3 人天 | README 显示覆盖率趋势 |
| SonarQube 集成（可选）| 1-2 人天 | 静态分析 + 历史追踪 |
| PR 模板 + Issue 模板 | 0.3 人天 | 强制自检清单 |
| Husky + lint-staged + commitlint | 0.5 人天 | 本地门禁 |
| Dependabot / Renovate 配置 | 0.3 人天 | 自动依赖升级 |
| **小计** | **5-8 人天** | 可独立于测试工作并行 |

### 2.5 总投入与时间表

| 投入 | 工时 | 关键里程碑 |
|------|------|-----------|
| **后端测试体系建设** | 28.5-44 人天 | 6-8 周 |
| **前端测试体系建设** | 18-27 人天 | 3-5 周（可与后端并行） |
| **CI 体系建设** | 5-8 人天 | 1 周（建议最先做） |
| **总投入（人天）** | **51-79 人天** | 约 **10-16 周（1 人）** 或 **5-8 周（2 人）** |
| **周维护成本** | **0.8 人天/周** | 长期投入 |

### 2.6 工时与 PRD 设定的差距

| 维度 | PRD 隐含假设 | 现实评估 |
|------|------------|----------|
| 后端到 60% | "1-2 周可冲刺" | **6-8 周**（1 人全职） |
| 前端到 50% | "2-3 周" | **3-5 周** |
| 总周期 | "1 个月内完成" | **10-16 周**（1 人）或 **5-8 周**（2 人） |

**专业判断**：如果团队只有 1 人负责，**2 个月达到 50%/50%（后端/前端）已是快速路径**，60%/50% 需 3-4 个月。**不要为了达标而达标**。

---

## 🏗️ 3. 测试金字塔实施路径

### 3.1 推荐的金字塔比例

```
                    ┌─────┐
                    │ E2E │  10%（关键用户故事）
                    ├─────┤
                    │ API │  20%（集成测试：Controller→Service→DB）
                    ├─────┤
                    │Unit │  70%（Service/Composable/纯函数）
                    └─────┘
```

**比例依据**（基于 Google Testing Blog / Microsoft Engineering Handbook）：
- 单元测试：编写快、运行快、定位准
- 集成测试：覆盖真实交互，代价中等
- E2E 测试：覆盖用户故事，运行慢、维护贵、脆弱

### 3.2 当前比例 vs 目标比例

| 层级 | 当前（文件数） | 当前比例 | 目标比例 | 缺口 |
|------|---------------|----------|----------|------|
| 单元 | 3（后端）+ 7（前端 utility）= 10 | ~95% | 70% | **-25%**（绝对值不足） |
| 集成 | 0 | 0% | 20% | **-20%** |
| E2E | 0 | 0% | 10% | **-10%** |

**关键观察**：当前是**"单元空心化"**（数量看似 95%，实际覆盖率 < 10%），不是真正的金字塔。应**优先补单元**，再补集成，最后 E2E。

### 3.3 实施顺序（先 CI 还是先单测？）

**强烈建议：先 CI（最优先），再单测，再集成，最后 E2E**

| 阶段 | 周次 | 关键交付 | 验收标准 |
|------|------|----------|----------|
| **Phase 0：CI 骨架** | 第 1 周 | `.github/workflows/ci.yml`（跑通 + 红绿信号）| PR 触发 → 3 分钟内出结果 |
| **Phase 1：基础设施** | 第 2 周 | jest.config + vitest.config + Mock 工厂 + Fixture + 测试 DB | `npm test` 本地一键跑通 |
| **Phase 2：核心路径单测** | 第 3-4 周 | 状态机（订单）、库存锁定、支付并发 | 关键 Service 覆盖 ≥ 60% |
| **Phase 3：业务模块单测** | 第 5-6 周 | 21 个模块 60% 覆盖 | 后端 60% 行覆盖达标 |
| **Phase 4：集成测试** | 第 7-8 周 | supertest + 真实 DB | 关键 API 100% 集成覆盖 |
| **Phase 5：组件/E2E** | 第 9-12 周 | @vue/test-utils + Playwright | 前端 50% 覆盖 |
| **Phase 6：门禁上线** | 第 13 周 | 覆盖率阻断 + 类型检查阻断 + Lint 阻断 | PR 不达标自动 fail |

**理由**：
- **CI 先于测试**：先建立"测试被执行的平台"，避免写了 1000 个测试后 CI 跑不动
- **先核心后边缘**：状态机/支付/库存 = 业务生死线；CRUD 工具类可后置
- **先单测后集成**：单测是基础，单测不过的代码集成必失败
- **门禁最后上线**：避免"还没补完测试就被门禁卡死"——分阶段提升阈值

---

## 📋 4. 每类测试的具体清单

### 4.1 后端 Service 单元测试（必含 .spec.ts，Q-01）

| 优先级 | Service | 当前测试 | 必含边界用例 | 工时 |
|--------|---------|----------|--------------|------|
| 🔴 P0 | `OrderService` | 部分（仅 findOrders 简单）| **状态机 7 状态 × 6 转换 = 14 用例**；并发支付 2 个；金额校验 3 个；库存联动 4 个；事务回滚 2 个 | 3-4 人天 |
| 🔴 P0 | `InventoryService` | 部分（仅 findAll/findBySku）| **悲观锁 3 个**；并发锁 2 个；库存回滚 2 个；事务边界 2 个 | 2-3 人天 |
| 🔴 P0 | `PricingEngineService` | ❌ 无 | **会员价/促销价/百分比/阶梯价 4 类** × 多场景；边界（0/负数/极大值）| 2-3 人天 |
| 🔴 P0 | `AuthService` + `JwtAuthGuard` | ❌ 无 | **Token 签发/校验/过期**；无 Token 拒绝；伪造 Token 拒绝；过期 Token 拒绝 | 1.5-2 人天 |
| 🔴 P0 | `PaymentService`（如存在）| ❌ 无 | **金额校验（>0/<=剩余）**；并发支付（pessimistic_write）；幂等性 | 1.5-2 人天 |
| 🟠 P1 | `CustomerService` | ❌ 无 | CRUD 边界；软删除；唯一约束冲突 | 1-1.5 人天 |
| 🟠 P1 | `ProductService` | 简单 | **SKU 唯一性冲突**（报告 P2-5 提及）；图片 CRUD；SPU/SKU 一致性 | 1.5-2 人天 |
| 🟠 P1 | `AfterSalesService` | ❌ 无 | **退款状态机**；与订单状态联动；并发售后 | 1-1.5 人天 |
| 🟠 P1 | `CustomerAuthService` | ❌ 无 | 密码加密（bcrypt rounds）；token 签发；防暴力破解 | 1-1.5 人天 |
| 🟠 P1 | `DictService` | ❌ 无 | 缓存一致性；SQL 注入防御 | 0.5-1 人天 |
| 🟡 P2 | `WebsiteService` / `System` / `Category` / `Color` / `Structure` / `Schema` / `DraftPool` / `SubSku` / `ToolRegistry` / `Upload` / `Review` / `Aesthetics` / `Sms` / `Health` | ❌ 全无 | 各自核心方法 + 边界 | 8-12 人天 |

**总计**：约 **25-32 人天**（覆盖 60% 模块）

### 4.2 状态机测试（Q-02 必含边界用例）

```typescript
// 订单状态机（必须覆盖的转换矩阵）
describe('OrderService.createPayment - 状态机', () => {
  // 7 个状态 × 多个转换 = 至少 14 个测试
  it('pending → paid（正常路径）', ...)
  it('pending → cancelled（用户取消）', ...)
  it('confirmed → paid（部分支付变 paid）', ...)
  it('confirmed → cancelled', ...)
  it('paid → shipped', ...)
  it('paid → cancelled（已支付退款）', ...)
  it('shipped → delivered', ...)
  it('shipped → cancelled（已发货，需拦截）', ...)
  it('delivered → completed', ...)
  it('completed → ✗（终态，不可变）', ...)
  it('cancelled → ✗（终态，不可变）', ...)
  
  // 非法转换 7 个
  it('pending → shipped（不允许，跳过 confirmed/paid）', ...)
  // ... etc
})
```

| 状态机 | 路径数 | 测试数 | 工时 |
|--------|--------|--------|------|
| 订单状态机 | 7 状态 / 11 转换 / 7 非法 | 25 | 1.5 人天 |
| 支付记录状态 | 4 状态 / 6 转换 | 12 | 0.5 人天 |
| 库存状态（可用/锁定/已扣）| 3 状态 / 6 转换 | 10 | 0.5 人天 |
| 退款/售后状态 | 5 状态 / 8 转换 | 15 | 1 人天 |
| 部署状态（deployment）| 4 状态 / 6 转换 | 12 | 0.5 人天 |
| 合计 | | **74 用例** | **4 人天** |

### 4.3 并发/竞态测试（关键！）

```typescript
describe('InventoryService - 并发锁定', () => {
  it('100 个并发请求锁定 10 个库存，应只成功 10 个', async () => {
    // 启动 100 个 Promise 并发调用 lock()
    // 验证：成功的 lock() 数量恰好为 10
    // 验证：失败的请求收到 ConflictException 或 InsufficientStockException
    // 这是悲观锁正确性的核心证据
  })

  it('两个并发 createPayment，金额各为 50%，都应成功（部分支付场景）', async () => {
    // 验证：悲观锁正确串行化
  })

  it('两个并发 createPayment，金额各为 80%，第二个应被拒绝', async () => {
    // 验证：超付防护
  })
})
```

| 并发场景 | 关键证据 | 工时 |
|----------|---------|------|
| 库存超卖防护 | 100 并发 → 10 成功 | 1 人天 |
| 订单并发支付 | 金额校验原子性 | 0.5 人天 |
| 状态机并发转换 | 同一订单不能同时被两人改状态 | 0.5 人天 |
| 退款并发 | 同一支付不能退两次 | 0.5 人天 |
| **合计** | | **2.5 人天** |

### 4.4 集成测试（API 端到端）

| 关键用户故事 | 路径 | 测试数 | 工时 |
|-------------|------|--------|------|
| 客户注册 → 登录 → 选商品 → 下单 → 支付 → 发货 → 收货 | 7 步 | 5-8 用例 | 2-3 人天 |
| 商品创建 → SPU/SKU 关联 → 设置价格 → 上架 | 4 步 | 3-4 用例 | 1 人天 |
| 库存入库 → 锁定 → 出库 → 报损 | 4 步 | 3-4 用例 | 1 人天 |
| 售后申请 → 审核 → 退款 | 3 步 | 2-3 用例 | 0.5-1 人天 |
| 字典 CRUD + 缓存 | 2 步 | 2-3 用例 | 0.5 人天 |
| 部署触发 → 进程管理 → 健康检查 | 3 步 | 2-3 用例 | 0.5 人天 |
| **合计** | | **17-25 用例** | **5-8 人天** |

### 4.5 前端 Composable / Store 测试

| 优先级 | 模块 | 当前 | 必含用例 | 工时 |
|--------|------|------|---------|------|
| 🔴 P0 | `useDict.ts` | ❌ 无 | 字典加载、缓存、刷新、错误降级 | 0.5-1 人天 |
| 🔴 P0 | `useProductSpu.ts` / `useProductSku.ts` | ❌ 无 | CRUD、列表分页、筛选 | 1-1.5 人天 |
| 🔴 P0 | `usePricingPromotions.ts` / `usePricingTiers.ts` | ❌ 无 | 价格计算、促销叠加、边界 | 1-1.5 人天 |
| 🔴 P0 | `useCustomers.ts` | ❌ 无 | 客户 CRUD、客户画像 | 0.5-1 人天 |
| 🟠 P1 | `useERASettings.ts` / `useProductCategory.ts` / `useProductSchema.ts` / `useProductSet.ts` / `useProductTechDicts.ts` / `useSkuImages.ts` / `useWsClient.ts` | ❌ 全无 | 各自核心数据流 | 3-4 人天 |
| 🟠 P1 | `user-store.ts` | 部分 | 扩展：登录态、token 刷新、登出 | 0.5-1 人天 |
| 🟡 P2 | `agent-events.ts` | ❌ 无 | 事件订阅、错误恢复 | 0.5-1 人天 |
| **合计** | | | | **8-11 人天** |

### 4.6 前端组件测试（**不测超大组件**）

**专业判断**：1356 行的 `Customers.vue` **不应直接测**，应先拆分再测。建议：

| 优先级 | 组件 | 拆分后测试 | 工时 |
|--------|------|-----------|------|
| 🔴 P0 | `SpuDialog.vue` / `SkuDialog.vue` | Props/Events/表单校验 | 1.5-2 人天 |
| 🔴 P0 | `SchemaFormRenderer.vue` | 动态表单渲染、校验、提交 | 1.5-2 人天 |
| 🟠 P1 | `AdminLayout.vue` / `AgentSidebar.vue` | 菜单渲染、路由激活 | 1-1.5 人天 |
| 🟠 P1 | `CallingInput.vue` | 用户输入、提交 | 0.5-1 人天 |
| 🟡 P2 | 拆分后的 Customers 子组件 | 拆分后才有测试价值 | 2-3 人天（依赖 Phase 1 拆分） |
| **合计** | | | **6.5-9.5 人天** |

### 4.7 E2E 测试（Playwright）

| 用户故事 | 路径 | 用例数 | 工时 |
|----------|------|--------|------|
| 管理员登录 → 创建商品 → 创建客户 → 创建订单 → 支付 | 完整 ERP 流程 | 3-5 | 2-3 人天 |
| 客户登录（C 端）→ 选品 → 下单 | C 端流程 | 2-3 | 1 人天 |
| 库存盘点 → 报损 | 库存流程 | 1-2 | 0.5 人天 |
| **合计** | | **6-10 用例** | **3.5-4.5 人天** |

---

## ⚙️ 5. CI 流水线设计

### 5.1 推荐架构

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  # ===== 阶段 1：快速门禁（< 1 分钟）=====
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci --prefer-offline
      - run: npm run lint
      - run: npm run format:check  # Prettier
    timeout-minutes: 5

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - run: npm run typecheck  # vue-tsc + tsc --noEmit
    timeout-minutes: 5

  # ===== 阶段 2：测试（< 3 分钟）=====
  test-backend:
    needs: [lint, typecheck]
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8
        env: { MYSQL_ROOT_PASSWORD: test, MYSQL_DATABASE: erp_test }
        ports: ['3306:3306']
    steps:
      - uses: actions/checkout@v4
      - run: cd packages/backend && npm ci --prefer-offline
      - run: npm run test:cov
      - uses: codecov/codecov-action@v4
        with: { file: ./coverage/lcov.info, fail_ci_if_error: true }
    timeout-minutes: 10

  test-frontend:
    needs: [lint, typecheck]
    runs-on: ubuntu-latest
    steps:
      - run: cd frontend && npm ci --prefer-offline
      - run: npm run test:coverage
    timeout-minutes: 10

  # ===== 阶段 3：构建（< 5 分钟）=====
  build:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    steps:
      - run: npm run build  # nest build + vite build
    timeout-minutes: 15

  # ===== 阶段 4：安全审计 =====
  audit:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit --audit-level=high
    timeout-minutes: 5
```

### 5.2 关键优化

| 优化项 | 节省时间 | 实施 |
|--------|----------|------|
| **npm 缓存**（`actions/setup-node` + `cache: 'npm'`）| 30-60s | 内置 |
| **Docker layer 缓存**（`actions/cache` 缓存 `~/.npm`）| 1-2min | 关键 |
| **测试并行**（`jest --maxWorkers=4`）| 30-50% 测试时间 | CI 配置 |
| **MySQL 服务容器**（`services: mysql:8`）| 免去外部 DB 依赖 | GitHub 原生 |
| **测试 DB 用 SQLite in-memory**（如兼容）| 省去 MySQL 启动时间 | Jest 配置 |
| **只跑变更包测试**（`--changedSince=origin/main`）| 大仓库提速 50% | Jest 28+ |
| **Fail-fast**：lint 不过不跑 test | 反馈更快 | 步骤依赖 |

### 5.3 并行策略

| 维度 | 策略 |
|------|------|
| **Job 并行** | lint / typecheck / test-backend / test-frontend 并行运行 |
| **Node 版本矩阵** | `matrix: [18, 20, 22]` 跑主流版本（仅 release 触发） |
| **包维度** | 未来 monorepo 拆分后按 `@openoba/core` / `backend` / `frontend` 独立跑 |
| **缓存复用** | PR 之间复用 `~/.npm` 缓存 |

### 5.4 与 Pre-commit 配合

```bash
# .husky/pre-commit
npx lint-staged
# 内容：
# - "*.{ts,vue}" → eslint --fix + prettier --write
# - "*.{ts,vue}" → 对应 *.spec.ts 的存在性检查（简单 grep）

# .husky/commit-msg
npx commitlint --edit "$1"
```

### 5.5 工作流文件清单

| 文件 | 作用 | 工时 |
|------|------|------|
| `.github/workflows/ci.yml` | 主工作流 | 1 人天 |
| `.github/workflows/release.yml` | 发布版本（可选）| 0.5 人天 |
| `.github/workflows/nightly.yml` | 夜间全量测试 + 慢测试 | 0.3 人天 |
| `.github/dependabot.yml` | 依赖自动升级 | 0.2 人天 |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR 模板（强制 checklist）| 0.2 人天 |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Issue 模板 | 0.1 人天 |
| `.husky/pre-commit` | 本地 lint 门禁 | 0.2 人天 |
| `.husky/commit-msg` | commit 信息校验 | 0.1 人天 |
| `commitlint.config.js` | Conventional Commits | 0.1 人天 |
| **小计** | | **2.7 人天** |

---

## 🚦 6. 质量门禁阈值建议

### 6.1 推荐阈值（分阶段提升）

| 阶段 | 时间 | 覆盖率阈值 | 阻断策略 |
|------|------|-----------|----------|
| **Phase 0** | 第 1-2 周 | 无门禁（仅 PR 可手动合并） | 无 |
| **Phase 1** | 第 3-4 周 | **warning**：后端 < 30% 报警 | 仅通知，不阻断 |
| **Phase 2** | 第 5-6 周 | **soft 阻断**：< 30% 不允许合入 main | 阻断 + 解释 |
| **Phase 3** | 第 7-8 周 | **hard 阻断**：< 50% 不允许合入 | 强阻断 |
| **Phase 4** | 第 9+ 周 | **差异化阈值**：核心模块 70%，普通模块 50% | 强阻断 |

### 6.2 详细门禁规则

```yaml
# .github/workflows/ci.yml 中的门禁
- name: Coverage Gate
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 50" | bc -l) )); then
      echo "::error::覆盖率 $COVERAGE% 低于 50% 阈值"
      exit 1
    fi

- name: Type Check Gate
  run: |
    # 强制 vue-tsc + tsc --noEmit 必须 0 error
    npx vue-tsc --noEmit
    npx tsc --noEmit -p packages/backend

- name: Lint Gate
  run: |
    # ESLint errors > 0 即阻断（warnings 可允许）
    npx eslint . --max-warnings=0 || exit 1

- name: Security Gate
  run: |
    # npm audit high+ 阻断
    npm audit --audit-level=high
```

### 6.3 各维度阻断规则汇总

| 门禁 | 阻断条件 | 工具 | 优先级 |
|------|----------|------|--------|
| **行覆盖率** | 后端 < 50% 阻断；前端 < 40% 阻断 | Jest/Vitest + Codecov | P1 |
| **分支覆盖率** | 核心模块 < 60% 阻断 | Jest `--coverageBranch` | P2 |
| **类型检查** | `tsc --noEmit` 0 error 阻断 | TypeScript | P1 |
| **ESLint** | errors > 0 阻断；warnings 阶段提升 | ESLint | P1 |
| **Prettier** | 格式不一致阻断 | Prettier | P2 |
| **测试通过** | 任意测试 fail 阻断 | Jest/Vitest | P1 |
| **构建成功** | `nest build` / `vite build` 失败阻断 | nest-cli / vite | P1 |
| **安全审计** | `npm audit` high+ 阻断 | npm | P2 |
| **commit 规范** | 不符 Conventional Commits 阻断 | commitlint | P3 |

### 6.4 SonarQube / CodeQL 集成（可选，**强烈建议**）

| 工具 | 价值 | 集成成本 | 建议 |
|------|------|----------|------|
| **SonarQube Cloud** | 代码异味、技术债评分、重复代码检测、覆盖率历史 | 1-2 人天 | ✅ 强烈建议（开源免费） |
| **GitHub CodeQL** | 安全漏洞自动扫描（SQL 注入、XSS、命令注入）| 0.5 人天 | ✅ 强烈建议（免费内置） |
| **Codecov** | 覆盖率趋势可视化、PR 覆盖率 diff | 0.3 人天 | ✅ 强烈建议 |
| **Lighthouse CI** | 前端性能/可访问性持续监控 | 0.5 人天 | ⚠️ 选配 |

### 6.5 与 PRD 设定的差距

PRD 提到 "覆盖率阻断" 建议阈值：
- 后端 50% → 60%（建议**先 50% 阻断，3 个月后提升至 60%**）
- CORE 70%（闭源，**需要 CORE 提供方配合**——本评估不覆盖）
- 前端 50%（建议**先 30% 阻断，6 个月后提升至 50%**）

**专业建议**：**不要一次性设高阈值**。先低阈值（10-20%）"上轨道"，让团队养成"每个 PR 加测试"的习惯，3-6 个月后再阶梯式提升。

---

## 🔍 7. 现有失败测试根因分析

### 7.1 失败套件清单

| 套件 | 当前状态 | 失败原因（基于代码分析） |
|------|----------|--------------------------|
| `inventory.service.spec.ts` | 🔴 失败 | 1) `DataSource.manager.transaction` mock 不支持 callback 内 `manager` 透传；2) `lockInTransaction` / `unlockInTransaction` / `stockOutInTransaction` 未在 mock 中；3) 实际 InventoryService 依赖 `forwardRef(() => Logger)` 可能在编译期失败 |
| `order.service.spec.ts` | 🔴 失败 | 1) `PricingEngineService` mock 缺 `calculatePrice` 返回结构（应含 `unitPrice` / `totalPrice` 等）；2) `InventoryService` mock 缺 `lockInTransaction` / `unlockInTransaction` / `stockOut` / `unlock`；3) `OrderService` 含 12 个 Repository 注入 + 3 Service 依赖，测试模块组装极易遗漏 |
| `product.service.spec.ts` | 🟢 通过 | 简单 happy path 验证；但 80% 业务方法（颜色/SPU/SKU/价格/图片）未覆盖 |

### 7.2 根因 #1：Mock 工厂未共享

```typescript
// ❌ 当前：3 个 spec 各写一遍 mockQueryBuilder / mockRepo
// 风险：实际 Repository 的方法签名变化时，mock 不报错，测试假绿

// ✅ 建议：建立 packages/backend/test-utils/ 共享
// packages/backend/test-utils/mock-repo.ts
export function createMockRepository<T>(overrides?: Partial<Repository<T>>): Repository<T> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
    delete: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    insert: jest.fn(),
    // ... 完整 Repository<T> 方法签名（基于 TypeORM 0.3）
    ...overrides,
  } as unknown as Repository<T>
}
```

**修复工时**：0.5-1 人天

### 7.3 根因 #2：依赖注入未完整声明

```typescript
// ❌ 当前 order.service.spec.ts 第 75-78 行
{ provide: InventoryService, useValue: { findBySku: jest.fn(), lock: jest.fn(), stockOut: jest.fn(), unlock: jest.fn() } },
{ provide: PricingEngineService, useValue: { calculatePrice: jest.fn() } },
// 实际 OrderService 还调用了 inventoryService.unlockInTransaction / lockInTransaction
// 实际 PricingEngineService.calculatePrice 应返回 PriceResult 结构

// ✅ 修复：完整声明所有依赖方法
{ provide: InventoryService, useValue: {
    findBySku: jest.fn(),
    lock: jest.fn(),
    unlock: jest.fn(),
    stockOut: jest.fn(),
    lockInTransaction: jest.fn(),     // 缺失！
    unlockInTransaction: jest.fn(),   // 缺失！
    stockOutInTransaction: jest.fn(), // 缺失！
}},
```

**修复工时**：0.3-0.5 人天

### 7.4 根因 #3：DataSource.transaction 未实现 callback 透传

```typescript
// ❌ 当前
{ provide: DataSource, useValue: { manager: { transaction: jest.fn() } } }
// 问题：transaction(callback) 不会调用 callback，测试中 service.dataSource.transaction() 实际返回 undefined

// ✅ 修复
{ provide: DataSource, useValue: {
    manager: {
      transaction: jest.fn().mockImplementation(async (cb) => cb({ 
        find: jest.fn(), findOne: jest.fn(), insert: jest.fn(), update: jest.fn() 
      })),
    },
}}
```

**修复工时**：0.2-0.3 人天

### 7.5 根因 #4：测试 DB 未配置

```typescript
// ❌ 当前：直接 mock Repository，绕过真实 DB
// 风险：mock 假绿 → TypeORM query builder 真实行为未验证（如 join、leftJoin）

// ✅ 建议：使用 SQLite in-memory（仅用于集成测试）
// packages/backend/test-utils/test-database.ts
export async function createTestDataSource(): Promise<DataSource> {
  return new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities: [/* 所有 entity */],
    synchronize: true,
  }).initialize()
}
```

**修复工时**：1-1.5 人天

### 7.6 总修复成本

| 任务 | 工时 |
|------|------|
| 共享 mock 工厂 | 0.5-1 人天 |
| 补全 3 个 spec 的依赖注入 | 0.3-0.5 人天 |
| 修复 DataSource.transaction mock | 0.2-0.3 人天 |
| 测试 DB（SQLite in-memory） | 1-1.5 人天 |
| 验证 3 个 spec 全绿 | 0.3 人天 |
| **合计** | **2.3-3.6 人天** |

**专业建议**：**与 Phase 0 CI 骨架同期完成**。先让现有 3 个 spec 跑通，作为 CI 第一个绿灯信号，给团队信心。

---

## 🔄 8. 测试维护成本分析

### 8.1 经验法则

| 场景 | 维护成本 |
|------|----------|
| 修改一行生产代码 | **0.5-2 行测试代码**（含边界扩展）|
| 新增一个 Service 方法 | **3-10 个测试用例**（happy + 边界 + 错误）|
| 重构（不改接口）| **0-5% 测试代码需更新**（一般不影响）|
| 重构（改接口）| **20-50% 测试代码需重写**（应避免）|
| Bug 修复 | **必须补回归测试**（1-3 个用例）|
| 依赖升级（如 TypeORM 0.3→0.4）| **5-10% 测试代码需调整** |

### 8.2 长期投入估算

| 维度 | 估算 |
|------|------|
| **每个 PR 的测试编写** | 平均 **+50-150 行测试**（基于代码量与变更类型） |
| **Bug 修复的回归测试** | 每月 **5-10 个新测试** |
| **依赖升级适配** | 每季度 **1-2 人天** |
| **覆盖率维护** | 防止覆盖率下降的"测试债" |
| **总计** | **0.5-1 人天/周** 持续投入 |

### 8.3 减少维护成本的工程实践

| 实践 | 节省 | 实施 |
|------|------|------|
| **共享 Mock 工厂** | 30-50% mock 代码 | 1-2 人天投入 |
| **Fixture 复用** | 20-30% 数据准备代码 | 1 人天投入 |
| **BDD 风格 describe 分层** | 提升可读性，降低维护认知 | 0.5 人天 |
| **testcontainers-node**（真实 DB）| 减少 mock 维护 | 1-2 人天 |
| **Page Object 模式**（E2E）| 减少 UI 变更影响 | 0.5-1 人天 |
| **测试代码 Review 制度** | 防止测试代码质量下降 | 流程 |

### 8.4 测试债务的"利息"

**警告**：**未维护的测试会变成负资产**。具体表现：
- 依赖升级后大量测试红 → 团队习惯性 `.skip` → 覆盖率虚高假象
- 业务变更后测试不再反映真实行为 → 假绿假红
- 测试运行时间膨胀（>10 分钟）→ 团队 `git commit --no-verify` 绕过

**预防**：
1. 每次依赖升级**强制**全测试通过才能合入
2. 每月一次"测试债务清理日"（清理 `.skip` / 修复 flaky test）
3. CI 超时**硬限制**（如 10 分钟）→ 倒逼优化

---

## 🎯 9. 与 PRD 设定的差异 + 专业独立判断

### 9.1 与 PRD 设定的对比

| 项 | PRD 设定 | 现实评估 | 建议 |
|----|----------|----------|------|
| 后端到 60% | "1-2 周冲刺" | **6-8 周**（1 人全职） | **分阶段**：先 30%（4 周），再 60%（再 4 周）|
| 前端到 50% | "2-3 周" | **3-5 周** | **分阶段**：先 composable/store（2 周），再组件（2-3 周）|
| CI 完整建设 | "2-3 天 + 1 周" | **1 周** | **最先做**（与其他并行）|
| SonarQube 集成 | 未提 | **1-2 人天** | ✅ 强烈建议（独立 PRD 项）|
| 测试金字塔比例 | 未明确 | **70/20/10** | 见 §3 |
| 现有失败测试修复 | 未提 | **2.3-3.6 人天** | 与 Phase 0 同步 |
| 维护成本 | 未提 | **0.5-1 人天/周** | 写入团队 OKR |

### 9.2 专业独立判断

**判断 1：不应直接追 60%**

> **60% 覆盖率不是写出来的，是"沉淀"出来的**。如果团队没有"每个 PR 加测试"的习惯，强行冲刺只会得到"假绿测试"——空跑用例、弱断言、为覆盖率而测试。

**建议路径**：
1. **第 1 个月**：建立 CI + 修复现有失败 + 核心 3-5 个 Service 测试（目标：30% 覆盖率 + CI 绿）
2. **第 2-3 个月**：所有核心 Service 测试 + 集成测试（目标：50% 覆盖率）
3. **第 4-6 个月**：业务模块测试 + 前端测试（目标：60% / 50%）
4. **持续**：维护 + 新功能测试

**判断 2：先 CI 后测试，避免"测试黑盒"**

> **先建立测试平台，再大量生产测试**。否则写 100 个测试但 CI 没跑通 → 团队质疑"写了也没用" → 测试文化崩溃。

**判断 3：超长 Service 不拆，测试写不动**

> 800 行的 `order.service.ts` 即使勉强写了 60% 覆盖，**也是低质量测试**——大量 mock + 弱断言 + 难以维护。**P0-1 拆分**与**P1-13 测试**应**同步推进**，否则测试就是给"代码债"打补丁。

**判断 4：超长 Vue 组件不拆，组件测试无意义**

> 1356 行的 `Customers.vue` **直接写组件测试 = 灾难**。拆分（Page + SubComponent）后，每个 SubComponent 才可独立测试。**P1-1 拆分**与**P1-14 组件测试**应**同步推进**。

**判断 5：CORE 闭源层的 70% 目标需 CORE 提供方配合**

> 本评估**不覆盖 CORE 测试**（闭源、无源码）。CORE 70% 目标**需要 CORE 提供方建立测试通道**（如：开放白盒测试 API、提供 mock 工具、配合契约测试）。**应作为独立工作流**，与本评估的"ERP 开源层 + 前端"分开推进。

**判断 6：测试金字塔比例是动态调整的**

> 推荐 70/20/10（单/集/E2E）是**目标**。**当前阶段**应**优先 100% 单元**（因为集成/E2E 需要基础设施先到位）。金字塔的形状是**随时间演化**的：
- 0-3 月：100 单元 / 0 集成 / 0 E2E
- 3-6 月：80 单元 / 15 集成 / 5 E2E
- 6+ 月：70 单元 / 20 集成 / 10 E2E

**判断 7：覆盖率为"指导指标"而非"阻断指标"**

> 在团队测试文化未成熟时，**覆盖率"硬阻断"会适得其反**：
- 团队为达标而"凑数"（空跑、弱断言）
- 业务紧急修复因覆盖率不达标被卡
- 团队抵触测试文化

**建议**：
- **Phase 1-2**：覆盖率"软警告"（PR 评论提醒，不阻断）
- **Phase 3+**：覆盖率"硬阻断"（必须达标才能合入）
- **始终**：覆盖率仅是**指标之一**，**更应关注**：
  - 关键路径（状态机/支付/库存）100% 覆盖
  - Bug 修复的回归测试率 100%
  - 改动代码的覆盖率 100%（新代码必须被测试）

---

## 📅 10. 推荐的实施 Roadmap

### 10.1 时间表（1 人全职）

| 周次 | 阶段 | 关键交付 | 验证 |
|------|------|----------|------|
| **W1** | Phase 0：CI 骨架 | `.github/workflows/ci.yml` + Husky + commitlint + PR 模板 | PR 触发 → 3 分钟内 CI 跑通 |
| **W2** | Phase 1：测试基础设施 | jest.config + vitest.config + mock 工厂 + fixture + 测试 DB | `npm test` 本地一键跑通 |
| **W3** | Phase 1：修复失败 | 修复 3 个 spec + 集成进 CI | 3 个 spec 全绿 + CI 绿 |
| **W4** | Phase 2：核心 Service 测试 | OrderService 状态机 + 支付 + 库存联动 | order.service.spec.ts 覆盖 ≥ 60% |
| **W5** | Phase 2：核心 Service 测试 | InventoryService + PricingEngine + Auth | 3 个核心 spec 覆盖 ≥ 60% |
| **W6** | Phase 2：状态机 + 并发 | 74 个状态机用例 + 6 个并发用例 | 关键路径 100% 覆盖 |
| **W7** | Phase 3：业务模块测试 | customer / product / after-sales / customer-auth | 后端覆盖率达 50% |
| **W8** | Phase 3：业务模块测试 | dictionary / website / system | 后端覆盖率达 50% |
| **W9** | Phase 4：集成测试 | 17-25 个 supertest 用例 | 关键 API 100% 集成覆盖 |
| **W10** | Phase 5：前端 composable/store | 8-11 个 composable + 2 store | 前端覆盖率达 25% |
| **W11** | Phase 5：前端组件 | 6.5-9.5 个组件测试 | 前端覆盖率达 35% |
| **W12** | Phase 5：前端 E2E | 6-10 个 Playwright 用例 | 前端覆盖率达 50% |
| **W13** | Phase 6：门禁上线 | 覆盖率 50% 阻断 + 类型检查阻断 + Lint 阻断 | 不达标 PR 自动 fail |
| **W14+** | 持续维护 | 0.5-1 人天/周 | 覆盖率稳步提升至 60% |

### 10.2 资源需求

| 角色 | 投入 | 备注 |
|------|------|------|
| **QA 工程师（1 人）** | 14 周全职 | 主导测试编写 + CI 建设 |
| **架构师（0.2 人）** | 2-3 周兼职 | 拆分超长 Service + 设计 Mock 架构 |
| **后端工程师（0.3 人）** | 8 周兼职 | 配合 Service 拆分 + 修复失败 spec |
| **前端工程师（0.3 人）** | 6 周兼职 | 配合组件拆分 + 组件测试 |
| **DevOps（0.1 人）** | 1 周 | CI 工作流 review + SonarQube 部署 |

### 10.3 关键里程碑

| 里程碑 | 周期 | 验收标准 |
|--------|------|----------|
| **M1：CI 跑通** | W1 | PR 触发 → 3 分钟内出结果 |
| **M2：测试基础设施完成** | W2-W3 | 3 个 spec 全绿 + 框架可复用 |
| **M3：核心路径 100% 覆盖** | W4-W6 | 状态机/支付/库存 100% 覆盖 |
| **M4：后端 50% 行覆盖** | W7-W8 | Jest 报告 ≥ 50% |
| **M5：集成测试完成** | W9 | supertest 17-25 用例全绿 |
| **M6：前端 50% 覆盖** | W10-W12 | Vitest 报告 ≥ 50% |
| **M7：质量门禁上线** | W13 | 不达标 PR 自动 fail |
| **M8：达到 60%/50% 目标** | W14-W20 | 持续维护期 |

---

## 📊 11. 总结

### 11.1 核心数据

| 项 | 数据 |
|----|------|
| 总投入 | **51-79 人天**（约 **10-16 周** 1 人全职 或 **5-8 周** 2 人并行）|
| 周维护成本 | **0.5-1 人天/周** |
| 后端达标周期 | 8 周（50%）→ 12 周（60%）|
| 前端达标周期 | 6-8 周（30%）→ 12 周（50%）|
| 失败测试修复 | 2.3-3.6 人天（与 Phase 0 同步）|
| CI 体系建设 | 1 周（最先做）|

### 11.2 与 PRD 的差异

| 项 | PRD 隐含 | 现实评估 | 调整建议 |
|----|----------|----------|----------|
| 整体周期 | "1-2 月" | **3-4 月** | 写入 OKR 季度目标 |
| 60% 覆盖 | 1-2 月内 | **4-6 月** | 分阶段达成 |
| CI 优先级 | 与测试并列 | **最优先** | 提前到第 1 周 |
| 维护成本 | 未提 | **0.5-1 人天/周** | 写入团队长期 OKR |

### 11.3 三大核心建议

1. **【CI 先行】** 第 1 周建立 CI 骨架——没有 CI 平台，写再多测试也是"沙堡"。建议先做 `ci.yml` + Husky + 修复现有 3 个 spec，建立第一个"绿灯信号"。

2. **【分阶段达阈值】** 不要直接追 60%/50%——先 30% 上轨道、3-6 个月后再阶梯提升。同时**核心路径必须 100% 覆盖**（状态机/支付/库存），覆盖率"硬阻断"仅用于约束"新代码"。

3. **【测试与重构同步】** P0-1（拆分超长 Service）+ P1-1（拆分超大组件）与 P1-13/14（测试）**必须同步推进**——超长代码不拆，测试就是给代码债打补丁，**维护成本 3 倍以上**。

### 11.4 风险预警

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 团队未养成"写测试"习惯 | 🟠 高 | 测试债务累积 | 门禁 + Review 制度 + OKR 关联 |
| 600+ 行业务改动频繁 | 🟠 中高 | 测试维护成本高 | 共享 mock + Page Object + 拆分 Service |
| 依赖升级导致测试大面积失败 | 🟡 中 | CI 长期红 | CI 超时限制 + 升级前跑全测试 |
| CORE 闭源层变化导致集成测试失败 | 🟠 中 | 测试不可控 | 契约测试（Contract Testing）+ CORE mock 服务 |
| 覆盖率"假绿"（空跑用例）| 🟠 中 | 负资产 | 关键路径 100% 覆盖 + Code Review 抽查 |

---

## 附录 A：完整工时明细

| 类别 | 任务 | 工时（人天）|
|------|------|------------|
| **CI 建设** | ci.yml + Husky + commitlint + PR 模板 | 2.7 |
| | SonarQube + CodeQL + Codecov | 2.0 |
| | CI 小计 | **4.7** |
| **后端基础设施** | jest.config 优化 + 测试 DB + mock 工厂 + Fixture | 5-8 |
| | 修复 3 个失败 spec | 2.3-3.6 |
| | 基础设施小计 | **7.3-11.6** |
| **后端单测** | OrderService（含状态机 25 用例 + 并发 6 用例）| 3-4 |
| | InventoryService（含并发 3 用例）| 2-3 |
| | PricingEngineService | 2-3 |
| | AuthService + JwtAuthGuard | 1.5-2 |
| | Payment / AfterSales / Customer / Product 业务 Service | 6-8 |
| | 其他 13 个模块 P2 覆盖 | 8-12 |
| | 单测小计 | **22.5-32** |
| **后端集成测试** | supertest 关键用户故事 | **5-8** |
| **前端基础设施** | vitest.config + happy-dom + Pinia 测试工具 + Router mock | 3-5 |
| **前端单测** | 14 个 composable + 2 个 store | 5-7 |
| | 关键组件（拆后） | 5-7 |
| | 前端单测小计 | **10-14** |
| **前端集成 + E2E** | 路由守卫 + 关键用户故事 + Playwright | **6-9** |
| **总计** | | **60-87 人天** |

## 附录 B：推荐的测试工具链

| 用途 | 工具 | 备注 |
|------|------|------|
| 后端单测 | **Jest 29** + ts-jest | 已有 |
| 后端集成 | **supertest** + testcontainers-node | 需新增 |
| 后端覆盖率 | **Istanbul**（Jest 内置）| 已有 |
| 前端单测 | **Vitest 4** + happy-dom + @vue/test-utils | 已有 |
| 前端组件 | **@vue/test-utils 2** + happy-dom | 已有 |
| 前端 E2E | **Playwright 1.60** | 已有但未用 |
| Mock 库 | **ts-mockito** 或 **@golevelup/ts-jest** | 需新增 |
| Fixture | **@faker-js/faker** | 推荐 |
| 真实 DB 测试 | **testcontainers-node** + Docker | 需新增 |
| 覆盖率可视化 | **Codecov** | 推荐 |
| 静态分析 | **SonarQube Cloud** | 推荐（免费）|
| 安全扫描 | **GitHub CodeQL**（内置）| 推荐 |
| 依赖审计 | **npm audit** + **Snyk** | 推荐 |
| Commit 规范 | **commitlint** + **Conventional Commits** | 需新增 |
| Pre-commit | **Husky** + **lint-staged** | 需新增 |

---

**报告结束**

*Powered by WorkBuddy QA Engineer Yan · 2026-06-08*
