# Database Schema

> MySQL 8.0 schema overview for OpenOBA.

---

## Database

| Property | Value |
|----------|-------|
| Engine | MySQL 8.0 |
| Charset | `utf8mb4` (full Unicode, including emoji) |
| Collation | `utf8mb4_general_ci` |
| Table count | 128+ |
| Primary keys | UUID (binary(16) / char(36)) |
| ORM | TypeORM 0.3, `synchronize: false` in production |

---

## Table Organization

Tables fall into two categories:

### Business Tables

Core ERP domain entities. No prefix convention — named by domain.

| Domain | Key Tables |
|--------|-----------|
| **Product** | `product_spu`, `product_sku`, `product_set`, `product_barcode`, `product_price_tier` |
| **Customer** | `customer`, `customer_membership`, `customer_stats` |
| **Order** | `order`, `order_item` (prefix: `OBA-`) |
| **Inventory** | `inventory`, `inventory_transaction`, `stock_alert` |
| **After-sales** | `after_sales`, `after_sales_log` |
| **Product meta** | `color`, `aesthetic_rule`, `structure_standard`, `category` |
| **Content** | `review`, `draft_pool`, `website_content` |
| **Support** | `dictionary`, `sms_log`, `upload_file` |

### System Tables

Prefixed with `sys_` for administrative infrastructure.

| Table | Purpose |
|-------|---------|
| `sys_user` | Admin accounts |
| `sys_role` | Role definitions |
| `sys_permission` | Permission definitions (resource + action) |
| `sys_role_permission` | Role ↔ Permission mapping |
| `sys_user_role` | User ↔ Role mapping |
| `sys_menu` | Navigation menu tree |
| `sys_audit_log` | Operation audit trail |
| `sys_deployment_health` | Deployment status snapshots |

### Core Engine Tables

| Table | Purpose |
|-------|---------|
| `agent_task` | ReAct task records |
| `cognitive_log` | Per-step ReAct logs (Thought/Tool/Observation) |
| `knowledge_entry` | MetaMirror knowledge base |
| `agent_memory` | Persistent experience/lessons |
| `erdl_rule` | ERDL rule storage (JSON column) |
| `erdl_snapshot` | Rule version snapshots |
| `erdl_schema` | Schema definitions |
| `skill` | Skill registry |
| `skill_key` | Skill authentication keys (PBKDF2) |

---

## Key Entity Relationships

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
                                 sys_menu (linked)
```

- **Customer → Order**: A customer owns multiple orders. `order.customer_id` → `customer.id`
- **ProductSPU → ProductSKU**: One SPU (e.g., a frame model) has multiple SKUs (color × size variants)
- **ProductSKU → Inventory**: Each SKU maps to one inventory record tracking stock quantity
- **Order → OrderItem**: An order contains multiple line items, each referencing a `product_sku_id`
- **RBAC**: `sys_user` → `sys_user_role` → `sys_role` → `sys_role_permission` → `sys_permission`

---

## ERDL Entity ↔ DB Table Mapping

ERDL entities are the semantic layer; DB tables are the physical layer.

```yaml
# ERDL (logical)
entity: Customer
  table: customer
  fields:
    - name: credit_level
      type: integer

# Maps to SQL (physical)
CREATE TABLE `customer` (
  `id` CHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `credit_level` INT DEFAULT 1,
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

ERDL `entity.table` property declares the explicit mapping. Action Guard resolves entity names to tables through this mapping before any database operation. See [ERDL Protocol](../erdl/overview.md) for the full specification.

---

## Migration Strategy

| Environment | Strategy |
|-------------|----------|
| **Development** | `synchronize: true` (auto-sync on startup) |
| **Staging** | `synchronize: false` + manual migration |
| **Production** | `synchronize: false` + SQL migrations only |

### Initial Schema

The canonical schema lives in `database/init-structure.sql` in the backend package. Run this once to bootstrap:

```bash
mysql -u root -p openoba < database/init-structure.sql
```

### TypeORM Migrations

For incremental changes, use TypeORM migration CLI:

```bash
npx typeorm migration:generate -d src/data-source.ts -n <name>
npx typeorm migration:run -d src/data-source.ts
npx typeorm migration:revert -d src/data-source.ts  # rollback
```

**Never** enable `synchronize: true` in production. It can drop columns and data.

---

## Index Strategy

| Index Type | Usage |
|------------|-------|
| **Primary** | UUID on all business tables |
| **Foreign keys** | Indexed on all `*_id` columns (`customer_id`, `product_sku_id`, etc.) |
| **Unique** | `product_sku.barcode`, `sys_user.username`, `customer.phone` |
| **Composite** | `order(customer_id, created_at)`, `inventory(warehouse_id, product_sku_id)` |
| **Full-text** | ERDL rule descriptions (for MetaMirror scanning) |

MySQL 8.0 supports invisible indexes and descending indexes — used selectively for query optimization during development.

---

## Viewing the Schema

- **Full SQL**: `database/init-structure.sql` in the backend package
- **Entity definitions**: `src/entities/` — each `@Entity()` decorated class maps to one table
- **ERDL mapping**: `src/modules/schema/` — semantic entity-to-table declarations
- **Runtime**: `npx typeorm schema:log -d src/data-source.ts` to preview pending changes

---

## Further Reading

- [Architecture Overview](../architecture/overview.md)
- [ERDL Protocol](../erdl/overview.md)
- [Module List](../architecture/module-list.md)
