# 数据库 Schema

> OpenOBA MySQL 8.0 数据库 Schema 概览。

---

## 数据库

| 属性 | 值 |
|------|-----|
| 引擎 | MySQL 8.0 |
| 字符集 | `utf8mb4`（完整 Unicode，含 emoji） |
| 排序规则 | `utf8mb4_general_ci` |
| 表数量 | 128+ |
| 主键 | UUID（binary(16) / char(36)） |
| ORM | TypeORM 0.3，生产环境 `synchronize: false` |

---

## 表分类

表分为两大类：

### 业务表

ERP 核心领域实体。无前缀约定，按领域命名。

| 领域 | 关键表 |
|------|--------|
| **商品** | `product_spu`、`product_sku`、`product_set`、`product_barcode`、`product_price_tier` |
| **客户** | `customer`、`customer_membership`、`customer_stats` |
| **订单** | `order`、`order_item`（编号前缀：`OBA-`） |
| **库存** | `inventory`、`inventory_transaction`、`stock_alert` |
| **售后** | `after_sales`、`after_sales_log` |
| **商品元数据** | `color`、`aesthetic_rule`、`structure_standard`、`category` |
| **内容** | `review`、`draft_pool`、`website_content` |
| **支撑** | `dictionary`、`sms_log`、`upload_file` |

### 系统表

以 `sys_` 为前缀，用于管理基础设施。

| 表 | 用途 |
|----|------|
| `sys_user` | 管理员账户 |
| `sys_role` | 角色定义 |
| `sys_permission` | 权限定义（资源 + 操作） |
| `sys_role_permission` | 角色 ↔ 权限映射 |
| `sys_user_role` | 用户 ↔ 角色映射 |
| `sys_menu` | 导航菜单树 |
| `sys_audit_log` | 操作审计日志 |
| `sys_deployment_health` | 部署状态快照 |

### 核心引擎表

| 表 | 用途 |
|----|------|
| `agent_task` | ReAct 任务记录 |
| `cognitive_log` | 每步 ReAct 日志（Thought/Tool/Observation） |
| `knowledge_entry` | MetaMirror 知识库 |
| `agent_memory` | 持久经验/教训 |
| `erdl_rule` | ERDL 规则存储（JSON 列） |
| `erdl_snapshot` | 规则版本快照 |
| `erdl_schema` | Schema 定义 |
| `skill` | 技能注册表 |
| `skill_key` | 技能认证密钥（PBKDF2） |

---

## 关键实体关系

```
Customer ──(1:N)──▶ Order ──(1:N)──▶ OrderItem
   │                                      │
   │                              ┌───────┘
   ▼                              ▼
CustomerMembership        ProductSKU ──(1:1)──▶ Inventory
                                 │
                                 │ (N:1)
                                 ▼
                            ProductSPU ──(1:N)──▶ ProductSet

sys_user ──(N:M)──▶ sys_role ──(N:M)──▶ sys_permission
                                       │
                                       ▼
                                 sys_menu（关联）
```

- **Customer → Order**：一个客户拥有多个订单。`order.customer_id` → `customer.id`
- **ProductSPU → ProductSKU**：一个 SPU（如某镜架型号）有多个 SKU（颜色 × 尺寸变体）
- **ProductSKU → Inventory**：每个 SKU 对应一条库存记录，跟踪库存数量
- **Order → OrderItem**：一个订单包含多个明细行，每行引用一个 `product_sku_id`
- **RBAC**：`sys_user` → `sys_user_role` → `sys_role` → `sys_role_permission` → `sys_permission`

---

## ERDL 实体 ↔ 数据库表映射

ERDL 实体是语义层，数据库表是物理层。

```yaml
# ERDL（逻辑）
entity: Customer
  table: customer
  fields:
    - name: credit_level
      type: integer

# 映射到 SQL（物理）
CREATE TABLE `customer` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `credit_level` INT DEFAULT 1,
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

ERDL 的 `entity.table` 属性声明显式映射。Action Guard 在执行任何数据库操作前通过此映射将实体名称解析为表名。完整规范见 [ERDL 协议](../erdl/overview.zh-CN.md)。

---

## 迁移策略

| 环境 | 策略 |
|------|------|
| **开发** | `synchronize: true`（启动时自动同步） |
| **预发布** | `synchronize: false` + 手动迁移 |
| **生产** | `synchronize: false` + 仅 SQL 迁移 |

### 初始 Schema

权威 Schema 位于后端包的 `database/init-structure.sql`。首次引导时执行：

```bash
mysql -u root -p openoba < database/init-structure.sql
```

### TypeORM 迁移

增量变更使用 TypeORM 迁移 CLI：

```bash
npx typeorm migration:generate -d src/data-source.ts -n <名称>
npx typeorm migration:run -d src/data-source.ts
npx typeorm migration:revert -d src/data-source.ts  # 回滚
```

**切勿**在生产环境启用 `synchronize: true`，它可能删除列和数据。

---

## 索引策略

| 索引类型 | 用途 |
|----------|------|
| **主键** | 所有业务表的 UUID |
| **外键** | 所有 `*_id` 列均索引（`customer_id`、`product_sku_id` 等） |
| **唯一** | `product_sku.barcode`、`sys_user.username`、`customer.phone` |
| **复合** | `order(customer_id, created_at)`、`inventory(warehouse_id, product_sku_id)` |
| **全文** | ERDL 规则描述（用于 MetaMirror 扫描） |

MySQL 8.0 支持不可见索引和降序索引——开发期间选择性用于查询优化。

---

## 查看 Schema

- **完整 SQL**：后端包中的 `database/init-structure.sql`
- **实体定义**：`src/entities/` — 每个 `@Entity()` 装饰类对应一张表
- **ERDL 映射**：`src/modules/schema/` — 语义实体到表声明
- **运行时**：`npx typeorm schema:log -d src/data-source.ts` 预览待处理变更

---

## 延伸阅读

- [架构概览](../architecture/overview.zh-CN.md)
- [ERDL 协议](../erdl/overview.zh-CN.md)
- [模块列表](../architecture/module-list.zh-CN.md)
