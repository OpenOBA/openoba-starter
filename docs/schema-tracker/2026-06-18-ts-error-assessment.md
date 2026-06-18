# 前端 TS 错误逐文件评估报告

**基线**：e91c5ef · **检查**：`npx vue-tsc -b` · **日期**：2026-06-18 14:20

---

## 总体结论

**50 文件 · 670 行错误 · `npm run build` 当前不可用（typecheck 阻断 vite build）**

大部分错误来自：
1. **类型声明缺失** —— API 返回值用了 `AxiosResponse<any, ...>` 或 `any`，没声明实际 shape
2. **Composable 接口不完整** —— 解构出的属性缺少类型定义
3. **TypeScript 5→6 迁移残留** —— `catch(e)` 从 `any` 变 `unknown`

---

## 逐文件评估（按实际影响排序）

### 1. Products.vue — 67 错误 ⚠️ 高风险
| 类别 | 数量 | 根因 |
|------|------|------|
| TS2339 属性缺失 | 24 | batch 导入功能引用不存在的 props：batchDialogVisible/batchTab/batchText/batchFileList 等。**product composable 的重构中这些属性和函数被移除但模板未同步** |
| TS6133 未使用 | 18 | 大量 import 的函数未使用（createSpu/updateSpu/createSku/updateSku…— 被重构到 composable 后残留） |
| TS2740 类型缺失 | 7 | AxiosResponse 返回值被当数组用 |
| TS2322 类型不匹配 | 2 | 同上 |
| TS2551 拼写提示 | 2 | batchDialogVisible → setDialogVisible |
| TS7053 索引 | 2 | gender 字段索引 |

**评估**：Products.vue 的模板和 composable 不同步。batch 功能被重构成了 `useProductsBatch` 但旧模板代码残留。需要清理模板中不可用的 prop 引用，同时清理未使用的 import。

### 2. AgentChat.vue — 41 错误 ⚠️ 高风险
| 类别 | 数量 | 根因 |
|------|------|------|
| TS2339 属性缺失 | 18 | ChatMsg 接口缺少 thoughts/toolCalls/observations 字段（已迁移到 reactTimeline，旧兼容代码残留） |
| TS6133 未使用 | 8 | Promotion、taskStatusLabel 等已死代码 |
| TS2353 多余属性 | 3 | 对象字面量中有 interface 不认的字段（time/version 等） |
| TS2345 类型错误 | 3 | AgentTask 当 TimelineItem 用 |
| TS18048 可能 undefined | 4 | 可选属性的空检查 |
| TS1117 重复属性 | 2 | 对象字面量中出现两次 text/ts |

**评估**：AgentChat.vue 的 ChatMsg 接口定义与其实际使用脱节。旧版 thoughts/toolCalls/observations 的三通道设计已替换为 reactTimeline 统一时间线，但 localStorage 恢复代码中仍保留了旧版兼容逻辑，且 interface 未更新。

### 3. DraftPool.vue — 32 错误 ⚠️ 中风险
| 类别 | 数量 | 根因 |
|------|------|------|
| TS18046 catch unknown | 14 | TypeScript 5+ strict |
| TS6133 未使用 | 8 | 死代码 |
| TS7006 隐式any | 4 | 缺少类型标注 |
| TS2339 属性缺失 | 4 | AxiosResponse 返回值 |
| TS2740 类型缺失 | 2 | — |

### 4. usePricingTiers.ts — 27 错误 ⚠️ 中风险
| 类别 | 数量 | 根因 |
|------|------|------|
| TS6133 未使用参数 | 14 | 函数签名中有未使用参数 |
| TS2339 属性缺失 | 8 | 同上类型缺失 |
| TS18046 catch | 4 | — |

### 5. Orders.vue — 25 错误 ⚠️ 中风险
| 类别 | 数量 | 根因 |
|------|------|------|
| TS2339 属性 | 14 | API 返回值属性不存在 |
| TS6133 未使用 | 6 | 死代码 |
| TS18046 catch | 5 | — |

### 6. 其余文件速评

| 文件 | 错误数 | 主要类型 | 修复难度 |
|------|--------|----------|----------|
| useCustomers.ts | 22 | TS2322类型不匹配 | 中 |
| useCustomerDetail.ts | 19 | TS6133未使用参数 | 低 |
| System.vue | 18 | TS6133未使用ref | 低 |
| Dictionary.vue | 17 | TS18046 catch | 低—批量 |
| AfterSales.vue | 16 | TS2339/TS18046 | 中 |
| KnowledgeCenter.vue | 16 | TS6133/TS2322 | 中 |
| Inventory.vue | 16 | TS18046/TS2322 | 中 |
| Colors.vue | 15 | TS7053/TS2740 | 中 |
| ERDLPlayground.vue | 14 | TS2339/TS2551 | **高**（ERDL核心） |
| StructureStandard.vue | 14 | TS2769/TS2349 | 中 |
| Reviews.vue | 13 | TS2339/TS18046 | 中 |
| Customers.vue | 13 | TS2339/TS6133 | 中 |
| Pricing.vue | 13 | TS7053/TS6133 | 中 |
| useSkuImages.ts | 14 | TS6133/TS18046 | 低 |
| useDict.ts | 13 | TS6133/TS2411 | 低 |
| Categories.vue | 12 | TS6133/TS18046 | 低 |
| 其余 30+ 文件 | ≤12 each | 混合 | 低—中 |

---

## 修复策略

### 第一批：P0 阻断（核心功能文件）
- Products.vue（67）— 清 batch 残留 + 未使用 import
- AgentChat.vue（41）— 统一 reactTimeline interface
- ERDLPlayground.vue（14）— ERDL 核心工具

### 第二批：P0 阻断（业务模块）
- Orders.vue（25）
- AfterSales.vue（16）  
- DraftPool.vue（32）

### 第三批：composables + 系统设置
- usePricingTiers.ts（27）
- useCustomers.ts（22）
- useCustomerDetail.ts（19）
- System.vue（18）

### 第四批：批量清理
- 所有 TS18046 catch(e) 错误（87个）：全局替换 catch(e: unknown) / catch(e: any)
- 所有 TS6133 未使用变量（88个）：批量删除或加 _ 前缀

### 第五批：Tests + 杂项
- __tests__/ 目录（34个）
- 其余 ≤10 错的文件

---

## 关键决策建议

1. **TS18046（87个 catch(e)）**：批量 `catch (e: unknown)` → `catch (e: any)` 最快，但会损失类型安全。推荐逐个改为 `catch (e: any)` 并在 catch 块内做类型守卫。生产上线后逐步 stricter。

2. **TS6133（88个未使用）**：大部分是死 import。最快方案是 `--noUnusedLocals: false`（降低严格度），但不推荐。推荐逐文件清理。

3. **build 脚本**：已经在 e91c5ef 分离为 `typecheck` + `build:skip-ts`。可以通过 `npm run build:skip-ts` 绕过类型检查构建，用于紧急上线。但**不建议**，应该先把 P0 错误修到 typecheck 通过。
