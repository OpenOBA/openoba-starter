# 前端 TS 错误完整清单

**基线**：c3e1960 · **检查命令**：`npx vue-tsc -b` · **总错误行**：~670

---

## 按文件分组（严重度排序）

### 🔴 Products.vue — 67 错误
**风险**：核心模块，商品管理。大量 TS2339（属性不存在）、TS2322（类型不匹配）、TS2740（缺属性）、TS6133（未使用）

### 🔴 AgentChat.vue — 41 错误
**风险**：ERA-Chat 核心对话引擎。TS2339（thoughts/toolCalls/observations 属性）、TS2353（对象字面量多余属性）、TS1117（重复属性名）、TS6133（未使用导入）

### 🟡 DraftPool.vue — 32 错误
**风险**：草稿池。TS7006（隐式 any 参数）、TS6133（未使用）、TS18046（catch 类型）

### 🔴 usePricingTiers.ts — 27 错误
**风险**：定价模块 composable。TS6133（未使用）、TS2339（属性不存在）、TS18046（catch）

### 🔴 Orders.vue — 25 错误
**风险**：订单模块。TS2339（属性）、TS6133（未使用）、TS2345（参数类型）、TS18046（catch）

### 🟡 useCustomers.ts — 22 错误
**风险**：客户 composable。TS2322（类型不匹配）、TS18046（catch）、TS2345（参数）

### 🟡 useCustomerDetail.ts — 19 错误
**风险**：客户详情 composable。TS6133（未使用参数）、TS2345（参数）、TS2740（缺属性）

### 🟡 System.vue — 18 错误
**风险**：系统设置页。TS6133（未使用 ref）、TS2339（属性）、TS2322（类型）

### 🟡 Dictionary.vue — 17 错误
**风险**：字典管理。TS18046（catch）、TS2538（unknown 索引）、TS7006（隐式 any）

### 🔴 AfterSales.vue — 16 错误
**风险**：售后模块。TS2339（属性）、TS6133（未使用）、TS18046（catch）

### 🟡 KnowledgeCenter.vue — 16 错误
**风险**：知识库。TS6133（未使用）、TS2322（类型）、TS2488（迭代器）、TS2339（属性）

### 🟡 Inventory.vue — 16 错误
**风险**：库存。TS18046（catch）、TS2322（类型）、TS2339（属性）

### 🟡 Colors.vue — 15 错误
**风险**：色表。TS7053（索引签名）、TS2740（缺属性）、TS2339（属性）

### 🔴 ERDLPlayground.vue — 14 错误
**风险**：ERDL 核心工具。TS2339（属性）、TS2551（拼写）、TS2322（类型）

### 🟡 StructureStandard.vue — 14 错误
**风险**：结构标准。TS2769（重载）、TS2349（不可调用）、TS2339（属性）

### 🟡 Reviews.vue — 13 错误
**风险**：评论。TS2339（属性）、TS2345（参数）、TS18046（catch）

### 🟡 Customers.vue — 13 错误
**风险**：客户页面。TS2339（属性）、TS6133（未使用）、TS2551（拼写）

### 🟡 Pricing.vue — 13 错误
**风险**：定价页面。TS7053（索引）、TS6133（未使用）、TS2345（参数）

### 🟡 useSkuImages.ts — 14 错误
**风险**：SKU 图片 composable。TS6133（未使用）、TS18046（catch）

### 🟡 useDict.ts — 13 错误
**风险**：字典 composable。TS6133（未使用）、TS2411（undefined 赋值）

### 🟡 Categories.vue — 12 错误
**风险**：分类。TS6133（未使用）、TS18046（catch）

### 🟡 useCustomerOperations.ts — 12 错误
**风险**：客户操作 composable。TS6133（未使用）、TS2740（缺属性）

### 🟡 TaskDashboard.vue — 12 错误
**风险**：首页仪表盘。TS6133（未使用变量：reactive/ElMessageBox/CallingInput/displayedTasks 等）

### 🟡 SubSkuTab.vue — 9 错误
**风险**：SKU 子标签。TS6133（未使用）、TS2322（类型）

### Other (≤10 errors each)
- `useAgentChat.ts` (11), `usePricingPromotions.ts` (9), `SkuDialog.vue` (9)
- `ERDLManagement.vue` (8), `useProductSku.ts` (7), `useProductSpu.ts` (7)
- `useProductSet.ts` (6), `Settings.vue` (5), `useProductCategory.ts` (5)
- `useProductTechDicts.ts` (5), `useTaskProposals.ts` (4), `App.vue` (3)
- `Dashboard.vue` (3), `Skills.vue` (3), `useAgentList.ts` (3)
- `__tests__/api-product.test.ts` (20), `__tests__/api-business.test.ts` (8)
- `__tests__/api-request.test.ts` (6)

---

## 修复优先级

### 第一批：核心流程（AgentChat + Products + Orders）— 133 错误
### 第二批：业务模块（DraftPool / AfterSales / Pricing / Inventory）— 92 错误
### 第三批：composables（usePricingTiers / useCustomers / useCustomerDetail 等）— 68 错误
### 第四批：杂项 + tests + 死代码清理 — 约 377 行
