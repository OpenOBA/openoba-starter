# ERA ↔ ERP 交互点知识

> 元镜自动生成 · 补充文档
> 描述 Agent 执行引擎（ERA）与 ERP 业务系统的交互边界

---

## 一、Agent 可操作的 ERP 数据表

### 读写权限矩阵

| 模块 | Entity | 读 | 写 | 备注 |
|------|--------|----|----|------|
| product | ProductSpu | ✅ | ✅ | Agent 可创建/修改 SPU |
| product | ProductSku | ✅ | ✅ | Agent 可创建/修改 SKU |
| product | ProductSet | ✅ | ✅ | 套装管理 |
| product | ProductCategory | ✅ | ✅ | 分类管理 |
| product | DictEffectTag | ✅ | ✅ | 效果词字典 |
| product | DictSkuColor | ✅ | ✅ | 色彩字典 |
| product | DictFrameMaterial | ✅ | ✅ | 材质字典 |
| product | DictFrameType | ✅ | ✅ | 框型字典 |
| product | DictHinge | ✅ | ✅ | 铰链字典 |
| product | DictNosePad | ✅ | ✅ | 鼻托字典 |
| product | DictSurfaceTreatment | ✅ | ✅ | 表面处理字典 |
| product | MemberLevel | ✅ | ❌ | 会员等级（只读） |
| product | WholesaleTier | ✅ | ❌ | 批发层级（只读） |
| product | Promotion | ✅ | ✅ | 促销活动 |
| customer | Customer | ✅ | ✅ | 客户信息 |
| customer | CustomerAddress | ✅ | ✅ | 客户地址 |
| customer | CustomerContact | ✅ | ✅ | 客户联系人 |
| customer | CustomerLens | ✅ | ✅ | 客户镜片档案 |
| customer | CustomerTierPricing | ✅ | ✅ | 客户协议价 |
| customer | VisionPrescription | ✅ | ✅ | 验光处方 |
| order | Order | ✅ | ✅ | 订单管理 |
| order | OrderItem | ✅ | ✅ | 订单明细 |
| order | OrderPayment | ✅ | ✅ | 支付记录 |
| order | OrderShipment | ✅ | ✅ | 物流发货 |
| inventory | Inventory | ✅ | ✅ | 库存数据 |
| inventory | InventoryDocument | ✅ | ✅ | 出入库单据 |
| inventory | InventoryTransaction | ✅ | ❌ | 库存流水（只读） |
| structure | StructureStandard | ✅ | ✅ | 结构标准 |
| draft-pool | Draft | ✅ | ✅ | 草稿内容 |
| draft-pool | DraftSpu | ✅ | ✅ | 草稿SPU |
| draft-pool | DraftSku | ✅ | ✅ | 草稿SKU |

### 禁止操作的表

| 表 | 原因 |
|----|------|
| sys_user / sys_role / sys_permission | 系统安全，只能通过管理后台操作 |
| cognitive_log | Agent 认知日志，只写不读 |
| agent_task | Agent 自身任务表，由系统管理 |
| skill_registry / skill_key_vault | SKILL 注册表，由 SkillLoader 管理 |

---

## 二、关键业务流程中的 ERA↔ERP 交互

### 2.1 商品上架流程

```
1. Agent 接收指令 → 查 DictEffectTag/DictSkuColor/DictFrameType 等字典
2. Agent 调用 draft_create → 在 draft_spu/draft_sku 创建草稿
3. Agent 调用 aesthetics_check → 校验美学兼容性
4. 人工审核草稿 → 通过 → 发布到 product_spu/product_sku
5. 发布后库存自动初始化 → inventory 表记录
```

### 2.2 订单处理流程

```
1. 客户下单 → order/order_item 创建
2. 支付 → order_payment 记录 → inventory 锁定库存（lockInTransaction）
3. 发货 → order_shipment 记录 → inventory 出库（stockOutInTransaction）
4. 收货 → order 状态变为 completed
5. 退货 → after_sales 创建 → 库存回滚（return_in）
```

### 2.3 Agent 查询能力

- `query_erp_data`: 查 SPU/SKU/订单/库存/客户 的统计数据
- `erdl_crud read`: 按条件查询任意白名单表
- `query_knowledge`: 查知识库（品牌/文案/行业经验）

---

## 三、Entity 关系图（Agent 理解用）

### product 模块关系
```
ProductSpu (1) ──→ (N) ProductSku
ProductSpu ──→ ProductCategory
ProductSku ──→ DictSkuColor (colorCode)
ProductSku ──→ StructureStandard (structureStandardCode)
ProductSku ──→ DictEffectTag (skinToneEffect/faceShapeEffect)
ProductSet (1) ──→ (N) ProductSku (skuList)
```

### customer 模块关系
```
Customer (1) ──→ (N) CustomerAddress
Customer (1) ──→ (N) CustomerContact
Customer (1) ──→ (N) CustomerLens
Customer (1) ──→ (N) VisionPrescription
Customer (1) ──→ (1) CustomerTierPricing
Customer (1) ──→ (N) Order
```

### order 模块关系
```
Order (1) ──→ (N) OrderItem
Order (1) ──→ (1) OrderAddress
Order (1) ──→ (N) OrderPayment
Order (1) ──→ (N) OrderShipment
Order (1) ──→ (N) OrderLog
OrderItem ──→ ProductSku
Order ──→ Customer
```

---

## 四、SKILL ↔ ERP 映射

| SKILL | 工具名 | 读写的 ERP 表 |
|-------|--------|-------------|
| erdl-crud | `erdl_crud` | 全部白名单表（见上文矩阵） |
| draft-create | `draft_create` | draft_spu, draft_sku |
| draft-update | `draft_update` | draft_spu, draft_sku, draft |
| aesthetics-check | `aesthetics_check` | aesthetic_rules, aesthetic_compat_matrices (只读) |
| query-erp-data | `query_erp_data` | 全部业务表（聚合查询） |
| query-knowledge | `query_knowledge` | knowledge_entry (只读) |
| file_edit | `file_edit` | 项目源代码文件（受部署模式限制） |
| tsc_check | `tsc_check` | TypeScript 编译检查 |
| git_diff | `git_diff` | Git 工作区变更 |

---

## 五、Agent 安全红线 🛡️

### 5.1 禁止操作的数据库表

以下表在 **所有部署模式下** Agent 都不能通过 `erdl_crud` 读写：

| 表 | 原因 | 影响 |
|----|------|------|
| `sys_user` | 用户账号安全 | 防止 Agent 创建后门账户 |
| `sys_role` | 权限体系安全 | 防止 Agent 提权 |
| `sys_permission` | 权限体系安全 | 防止 Agent 修改权限 |
| `sys_user_role` | 权限体系安全 | 防止 Agent 为自己分配角色 |
| `sys_role_permission` | 权限体系安全 | 防止 Agent 修改角色权限 |
| `cognitive_log` | Agent 自身认知日志 | 防止 Agent 擦除痕迹 |
| `agent_task` | Agent 任务队列 | 防止 Agent 创建隐藏任务 |
| `skill_registry` | SKILL 注册表 | 防止 Agent 注册恶意 SKILL |
| `skill_key_vault` | SKILL 密钥库 | 防止 Agent 窃取 API Key |

### 5.2 部署模式与 Agent 权限

| 模式 | 文件写入 | 引擎代码 | 系统表 | 业务表 | 适用场景 |
|------|---------|---------|--------|--------|---------|
| **operator** 🔵 | ❌ 禁止 | ❌ 禁止 | ❌ 禁止 | ✅ 允许 | 日常运营（默认） |
| **developer** 🟡 | ✅ 允许 | ❌ 禁止 | ❌ 禁止 | ✅ 允许 | 二次开发/定制 |
| **maintainer** 🔴 | ✅ 允许 | ✅ 允许 | ✅ 允许 | ✅ 允许 | 引擎维护（厂商支持终止） |

### 5.3 ERA 引擎核心文件（developer 模式禁止修改）

- `backend/src/modules/eros/` — Agent 执行引擎
- `backend/src/modules/erdl/` — ERDL 协议层
- `backend/src/modules/meta-mirror/` — 元镜引擎
- `backend/src/modules/system/` — 系统管理
- `backend/src/common/guards/` — 安全守卫
- `backend/erdl/core.erdl` — 引擎规则

### 5.4 责任划分

> ⚠️ 运营模式：Agent 只能操作业务数据和行业规则。秒镜科技提供技术支持。
> ⚠️ 开发模式：Agent 可修改项目源代码。用户对修改承担全部责任。
> ⚠️ 维护模式：Agent 完全开放。秒镜科技不承担技术支持义务。

---

## 六、Agent 工具调用链示例

### 示例：Agent 创建一个新 SPU + SKU
```
1. erdl_crud read DictSkuColor → 获取可用颜色
2. erdl_crud read DictFrameType → 获取可用框型
3. erdl_crud read StructureStandard → 获取结构标准
4. draft_create {spuName, shapeCode, seriesCode, skus: [{colorCode}]}
5. aesthetics_check {shapeCode, colorCode, skinToneEffect}
6. erdl_crud create ProductSpu → 发布到正式表
7. erdl_crud create ProductSku → 发布SKU
```

### 示例：Agent 查询客户订单
```
1. erdl_crud read Customer {filters: {phone: '138xxxx'}}
2. erdl_crud read Order {filters: {customerId: 'xxx'}}
3. erdl_crud read OrderItem {filters: {orderId: 'xxx'}}
4. erdl_crud read ProductSku {filters: {skuCode: ['SKU001','SKU002']}}
```

---

> 本文档由 唐浩然（AI 联合创始人）于 2026-05-23 手工补充
> 与元镜自动生成的 21 个知识文件共同构成 ERA 系统知识体系
