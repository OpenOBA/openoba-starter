# WorkBuddy 任务清单 — V1.4-c 大文件拆分 + V1.5 可执行项

> 生成：2026-06-09 22:48
> 来自：唐浩然（OpenOBA AI 执行官）
> 给：Henry / WorkBuddy

---

## 零、工作环境确认

```
仓库：    C:\Users\99tan\openoba\repos\openoba-starter
后端：    packages\backend\src\modules\
前端：    frontend\src\
包管理：   npm install --install-strategy=nested（已固化 .npmrc）
测试命令： npx jest --no-coverage <pattern>
编译检查： npx tsc --noEmit（后端）/ npx vue-tsc --noEmit（前端）
```

---

## 一、V1.4-c — 后端大文件拆分（5项 · 16h）

### 拆分总原则

1. **不动逻辑**——只把方法按功能域拆分到新文件，不改任何业务代码
2. **主 Service 改为门面（Facade）**——订单流程入口 + 委托给子 Service
3. **每拆一次编译一次**——确保 0 errors 再继续
4. **拆完一个 Service 接着跑全量测试**——`npx jest --no-coverage`

---

### 任务 1：AfterSalesService 拆分（3h · 先做最简单建立信心）

**文件**：`packages/backend/src/modules/after-sales/after-sales.service.ts`（336行→300行）

**拆分出**：
| 新文件 | 内容 | 行数 |
|--------|------|------|
| `after-sales-crud.service.ts` | CRUD（create, update, findOne, findAll） | ~80行 |
| `after-sales-flow.service.ts` | 流程（review, process, getLogs, getStats） | ~120行 |

**原 Service 改为**：
```typescript
// after-sales.service.ts — 门面，对外保持接口不变
constructor(
  private crud: AfterSalesCrudService,
  private flow: AfterSalesFlowService,
) {}
// 每个方法委托
async create(dto) { return this.crud.create(dto) }
```

**验证**：`npx jest --no-coverage after-sales.service.spec` → 应继续 PASS

---

### 任务 2：InventoryService 拆分（3h）

**文件**：`packages/backend/src/modules/inventory/inventory.service.ts`（636行→300行）

**拆分出**：
| 新文件 | 内容 |
|--------|------|
| `inventory-query.service.ts` | 查询（findBySkuId, getTransactions, getStats） |
| `inventory-mutation.service.ts` | 变更（recordTransaction, lock/unlock, adjust） |

**验证**：`npx jest --no-coverage inventory.service.spec`

---

### 任务 3：CustomerService 拆分（4h）

**文件**：`packages/backend/src/modules/customer/customer.service.ts`（783行→400行）

**拆分出**——按子资源分：
| 新文件 | 内容 | 行数 |
|--------|------|------|
| `customer-crud.service.ts` | 主表 CRUD + 搜索 | ~150行 |
| `customer-contact.service.ts` | 联系人管理 | ~60行 |
| `customer-prescription.service.ts` | 处方管理 | ~80行 |
| `customer-lens.service.ts` | 客户镜片记录 | ~80行 |

**验证**：`npx jest --no-coverage customer.service.spec`

---

### 任务 4：ProductService 拆分（3h）

**文件**：`packages/backend/src/modules/product/product.service.ts`（785行→400行）

**拆分出**：
| 新文件 | 内容 |
|--------|------|
| `product-crud.service.ts` | SKU/SPU 通用 CRUD |
| `product-pricing.service.ts` | 价格、档位、历史 |

**验证**：`npx jest --no-coverage product.service.spec`

---

### 任务 5：OrderService 拆分（5h · 最难）

**文件**：`packages/backend/src/modules/order/order.service.ts`（782行→400行）

**拆分出**——按订单生命周期：
| 新文件 | 内容 | 行数 |
|--------|------|------|
| `order-create.service.ts` | createOrder + 销售项生成 + 价格计算 | ~150行 |
| `order-flow.service.ts` | 状态流转（confirm, pay, ship, complete, cancel） | ~150行 |
| `order-query.service.ts` | 查询（findAll, findOne, findByCustomer） | ~80行 |
| `order-member.service.ts` | 会员更新（updateMemberAssets, populateLens, downgrade） | ~100行 |

**验证**：`npx jest --no-coverage order.service.spec`

---

## 二、V1.4-c — 前端大文件拆分（3项 · 12h）

### 任务 6：AgentChat.vue 拆分（5h）

**文件**：`frontend/src/pages/AgentChat.vue`（102KB → 3个组件）

**拆分出**：
| 新文件 | 内容 |
|--------|------|
| `components/agent/ChatMessages.vue` | 消息列表（滚动、渲染） |
| `components/agent/ChatInput.vue` | 输入框（提及、文件上传） |
| `components/agent/ChatSidebar.vue` | 侧边栏（任务列表、工具） |

**验证**：`npx vue-tsc --noEmit`

---

### 任务 7：Orders.vue 拆分（3h）

**文件**：`frontend/src/pages/Orders.vue`（80KB → 2个组件）

---

### 任务 8：Customers/TaskDashboard 拆分（4h）

---

## 三、V1.5 — WorkBuddy 可执行项（2项 · 13h）

### 任务 9：element-plus 按需引入（3h）

**文件**：`frontend/src/main.ts` + `frontend/vite.config.ts`

**操作**：
1. 安装 `unplugin-element-plus`
2. 移除 `main.ts` 中的 `import ElementPlus from 'element-plus'` + `app.use(ElementPlus)`
3. vite.config.ts 加入插件
4. Icons 手动改为按需引入（仅涉及 `src/components/` 中使用 ElementPlusIconsVue 的文件）

**验证**：`npx vue-tsc --noEmit`

---

### 任务 10：any 类型化扫描（10h · 分批执行）

**方式**：输出 `any` 出现清单，由唐浩然评估类型化方案后再执行

```bash
cd packages/backend
npx eslint src --rule '@typescript-eslint/no-explicit-any: warn' | grep "no-explicit-any"
```

---

## 四、执行纪律

1. ✅ **每步验证**——拆分一个 Service → 编译 → 测试 → 再拆下一个
2. ✅ **遇阻即停**——不绕过，不 hack，记录问题通知唐浩然
3. ✅ **不改逻辑**——拆分是纯组织重构，业务行为不变
4. ✅ **门面模式**——原 Service 改造为委托层，不破坏现有调用方
5. ✅ **Git 频率**——每拆一个 Service 提交一次

---

## 五、编译+测试验证命令

```bash
# 后端编译
cd C:\Users\99tan\openoba\repos\openoba-starter\packages\backend
npx tsc --noEmit

# 前端编译
cd C:\Users\99tan\openoba\repos\openoba-starter\frontend
npx vue-tsc --noEmit

# 全量测试
cd C:\Users\99tan\openoba\repos\openoba-starter\packages\backend
npx jest --no-coverage

# 单测
npx jest --no-coverage order.service.spec
```
