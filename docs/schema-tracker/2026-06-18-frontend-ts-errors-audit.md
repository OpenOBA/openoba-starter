# 前端 TypeScript 错误全面审计

**日期**：2026-06-18 14:00 CST
**基线**：c3e1960
**审计人**：唐浩然
**触发**：Henry 要求上线前全面排查

---

## 执行摘要

| 指标 | 数值 |
|------|------|
| **错误文件数** | 50 文件 |
| **错误总数** | **~670 行（含重复引用）** |
| **去重错误码** | 22 种 |
| **Build 阻塞** | ✅ 是 — `vue-tsc -b` 在 build pipeline 中 |

---

## 按错误码分类

### 🔴 P0 — Build 阻断（必须修复才能上线）

| 错误码 | 数量 | 含义 | 代表文件 |
|--------|------|------|----------|
| **TS2339** | 207 | Property does not exist——类型上没有该属性 | 最多，分散在各 composable/view |
| **TS2322** | 61 | Type not assignable——赋值类型不匹配 | useCustomers, Inventory, Dictionary 等 |
| **TS2345** | 36 | Argument type mismatch——参数类型不对 | Orders, usePricingTiers 等 |
| **TS2740** | 25 | Type missing properties——类型缺少必要属性 | Products, useCustomerDetail 等 |
| **TS2554** | 25 | Expected N arguments but got M——参数数量不对 | __tests__ 文件, usePricingTiers 等 |
| **TS18046** | 87 | `e` is of type `unknown`——catch 块中 e 类型不明确 | 几乎所有视图 |
| **TS18048** | 9 | Possibly `undefined`——可选属性未做空检查 | useTaskProposals, useProductSet 等 |

> **以上 450 个错误直接影响构建成功。**

### 🟡 P1 — 质量警告（建议修复）

| 错误码 | 数量 | 含义 |
|--------|------|------|
| **TS2551** | 6 | Property does not exist, did you mean X? — 拼写/命名问题 |
| **TS7006** | 4 | Parameter implicitly has 'any' type |
| **TS2353** | 3 | Object literal may only specify known properties |
| **TS2769** | 2 | No overload matches this call |
| **TS6192/6196** | 2 | Unused import |
| **TS7053** | 20 | Element implicitly has 'any' type (index signature) |

### 🟢 P2 — 死代码/风格（低优先级）

| 错误码 | 数量 | 含义 |
|--------|------|------|
| **TS6133** | 88 | Declared but never read——未使用变量/函数/import |
| **TS2593** | 9 | Cannot find name（测试文件中 beforeAll/beforeEach） |
| **TS2538** | 15 | Type 'unknown' cannot be used as index type |
| **TS2862** | 2 | Deprecated JSX setting |
| **TS2488** | 2 | Type must have Symbol.iterator |
| **TS2411** | 4 | Type undefined not assignable to type（与 strict mode 相关） |
| **TS1117** | 2 | Duplicate property names（AgentChat.vue 历史遗留） |

---

## 按文件严重度排序（Top 15）

| 文件 | 错误数 | 严重度 | 说明 |
|------|--------|--------|------|
| `views/Products.vue` | 67 | 🔴 最高 | 核心模块，大量 TS2339/TS2322 |
| `views/tasks/AgentChat.vue` | 41 | 🔴 高 | 核心功能，已在用但类型有歧义 |
| `views/DraftPool.vue` | 32 | 🟡 中 | 草稿池 |
| `composables/usePricingTiers.ts` | 27 | 🔴 高 | 定价模块 |
| `views/Orders.vue` | 25 | 🔴 高 | 订单模块 |
| `composables/useCustomers.ts` | 22 | 🟡 中 | 客户 composable |
| `views/System.vue` | 18 | 🟡 中 | 系统设置 |
| `views/Inventory.vue` | 16 | 🟡 中 | 库存 |
| `views/AfterSales.vue` | 16 | 🔴 高 | 售后 |
| `views/KnowledgeCenter.vue` | 16 | 🟡 中 | 知识库 |
| `views/Colors.vue` | 15 | 🟡 中 | 色表 |
| `views/erdl/ERDLPlayground.vue` | 14 | 🔴 高 | ERDL 核心 |
| `views/StructureStandard.vue` | 14 | 🟡 中 | 结构标准 |
| `views/Reviews.vue` | 13 | 🟡 中 | 评论 |
| `views/Customers.vue` | 13 | 🟡 中 | 客户 |

---

## 评估结论

1. **当前状态下 `npm run build` 无法通过** — vue-tsc -b 产生 670 行错误，vite build 不会启动
2. **TS2339 错误占比最高（207 个）** — 多为 API 返回值类型声明不完整，或 composable 解构后使用了未声明的属性
3. **TS6133 未使用变量（88 个）** — 大量死代码警告，虽然不影响运行但污染代码质量
4. **TS18046 catch(e) unknown（87 个）** — TypeScript 5.x 引入的 strict 变化，每个 catch 块都需要类型守卫
5. **`__tests__/` 目录（34 个）** — 主要是 Jest 全局类型缺失（`@types/jest` 未在 tsconfig 中声明）

### 建议分批修复策略

**第一批（上线前必须）**：修复 P0 阻断项，使 `vue-tsc -b` 通过
**第二批（上线后积压）**：TS6133 死代码清理、__tests__ 类型修复
**第三批（后续迭代）**：strict 模式全面启用
