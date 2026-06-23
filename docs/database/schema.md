# 数据库 Schema

> OpenOBA Starter 的数据库结构、表分组、命名规范和初始化方式

## 数据库基础信息

| 项 | 值 |
|----|-----|
| 数据库 | MySQL ≥ 8.0 |
| 字符集 | `utf8mb4` |
| 排序规则 | `utf8mb4_unicode_ci` |
| 表数量 | 128+ 张 |
| 主键类型 | UUID `varchar(36)` |
| ORM | TypeORM 0.3 |

---

## 表分组

数据库表分为两大类：

### 1. 业务表（无前缀）

眼镜行业 ERP 的业务数据表，约占 80%：

| 业务域 | 代表表 | 说明 |
|--------|--------|------|
| 商品 | `product_spu`、`product_sku`、`product_set`、`product_category` | SPU/SKU/套装/分类 |
| 客户 | `customer`、`customer_member_rule` | 客户档案/会员 |
| 订单 | `order`、`order_item`、`order_status_log` | 订单/订单项/状态日志 |
| 库存 | `inventory`、`inventory_log` | 库存/库存流水 |
| 售后 | `after_sales`、`after_sales_log` | 售后单/售后日志 |
| 评价 | `review` | 商品评价 |
| 颜色 | `color_design_project`、`color_palette_item` | 颜色设计 |
| 美学 | `aesthetic_rules`、`aesthetic_compat_matrices` | 美学规则/兼容矩阵 |
| 结构 | `structure_standard` | 镜架结构标准 |
| 字典 | `dict_*`（多张） | 数据字典 |
| 草稿 | `draft_pool`、`draft_spu` | 草稿池 |
| 官网 | `website_*`（多张） | 官网内容 |
| 上传 | `upload_record` | 文件上传记录 |

### 2. 系统表（`sys_` 前缀）

系统管理相关表，约占 20%：

| 表 | 说明 |
|----|------|
| `sys_user` | 管理端用户 |
| `sys_role` | 角色 |
| `sys_permission` | 权限点 |
| `sys_role_permission` | 角色-权限关联 |
| `sys_user_role` | 用户-角色关联 |
| `sys_menu` | 菜单 |
| `sys_audit_log` | 审计日志 |
| `sys_agent_manifest` | Agent 清单 |
| `sys_agent_memory` | Agent 记忆 |
| `sys_model_key` | LLM API Key（PBKDF2 加密） |
| `sys_model_key_models` | Key-模型关联 |
| `sys_model_provider` | LLM 供应商 |
| `sys_model_registry` | 模型注册表 |
| `sys_model_connection_log` | 模型连接日志 |
| `sys_token_usage` | Token 用量统计 |

### 3. Core 引擎表（ERDL/EROS）

AI 执行官引擎的表，由 Core 包管理：

| 表 | 说明 |
|----|------|
| `erdl_rule_record` | ERDL 规则记录 |
| `erdl_snapshot` | 规则快照 |
| `erdl_proposal` | 规则提案 |
| `erdl_proposal_vote` | 提案投票 |
| `eros_agent_task` | Agent 任务 |
| `eros_agent_registry` | Agent 注册表 |
| `eros_cognitive_log` | 认知日志 |
| `eros_knowledge_entry` | 知识库条目 |
| `eros_report_target` | 报告目标 |
| `eros_publish_package` | 发布包 |
| `eros_skill_registry` | 技能注册 |
| `eros_skill_key_vault` | 技能密钥保管 |
| `eros_deliverable_manifest` | 交付物清单 |

---

## 命名规范

### 表命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 业务表 | snake_case，无前缀 | `product_spu`、`customer`、`order` |
| 系统表 | `sys_` 前缀 + snake_case | `sys_user`、`sys_audit_log` |
| Core 表 | 模块前缀 + snake_case | `erdl_rule_record`、`eros_agent_task` |
| 关联表 | 两表名 + `_` | `sys_role_permission`、`sys_user_role` |

### 字段命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 主键 | `id` | `id varchar(36)` |
| 外键 | 关联表_字段 | `customer_id`、`order_id`、`spu_id` |
| 时间戳 | `created_at` / `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` |
| 布尔 | `is_` 前缀 | `is_active`、`is_deleted` |
| 枚举 | `_type` / `_status` 后缀 | `order_status`、`after_sales_type` |
| 金额 | `decimal(10,2)` | `total_amount`、`unit_price` |
| JSON | `json` 类型 | `config`、`context`、`metadata` |

### 示例表结构

```sql
CREATE TABLE IF NOT EXISTS `product_spu` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `spu_code` varchar(64) NOT NULL COMMENT 'SPU编码',
  `spu_name` varchar(200) NOT NULL COMMENT 'SPU名称',
  `category_id` varchar(36) DEFAULT NULL COMMENT '分类ID',
  `brand` varchar(100) DEFAULT NULL COMMENT '品牌',
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_spu_code` (`spu_code`),
  INDEX `idx_category_id` (`category_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SPU';
```

---

## 初始化方式

### ⚠️ 重要：不要手动执行 SQL

OpenOBA Starter 使用**初始化向导**自动建表，**不要**手动执行 `database/init-structure.sql`。

### 初始化流程

1. 创建空数据库（只需 `CREATE DATABASE`）：
   ```bash
   mysql -u root -p -e "CREATE DATABASE openoba_starter DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

2. 启动后端，浏览器打开前端

3. 系统检测到数据库为空，自动进入初始化向导

4. 向导执行：
   - `database/init-structure.sql` — 创建 128+ 张表（`CREATE TABLE IF NOT EXISTS`）
   - `database/init-seed.sql` — 种子数据（管理员、角色、权限、菜单）
   - `database/init-seed-agent-agents.sql` — Agent 种子数据
   - `database/init-model-registry.sql` — 模型注册表
   - `database/init-model-seed.sql` — 模型种子数据

### SQL 文件说明

| 文件 | 用途 | 何时执行 |
|------|------|---------|
| `init-structure.sql` | 表结构 | 向导第 2 步 |
| `init-seed.sql` | 基础种子（管理员/角色/权限/菜单） | 向导第 3 步 |
| `init-seed-agent-agents.sql` | Agent 清单种子 | 向导第 3 步 |
| `init-model-registry.sql` | LLM 模型注册表 | 向导第 3 步 |
| `init-model-seed.sql` | LLM 模型种子数据 | 向导第 3 步 |
| `add-missing-dict-tables.sql` | 补充字典表 | 向导第 3 步 |
| `schema-validation.json` | Schema 校验配置 | 非执行文件 |
| `WARNING.txt` | 警告说明 | 非执行文件 |

> ⚠️ `init-structure.sql` 仅用于**首次安装**。已有生产数据库**不要**执行，使用增量迁移脚本。

---

## Entity 与表的关系

OpenOBA 使用 TypeORM 的 Data Mapper 模式：

- **Entity 类**定义表结构（`@Entity()` 装饰器）
- **Repository** 提供数据访问（`@InjectRepository()`）
- `synchronize: false` — **禁止自动同步**（生产安全）

### Entity 注册方式

```typescript
// app.module.ts
TypeOrmModule.forRootAsync({
  useFactory: (configService) => ({
    entities: [
      // ERP Entity：glob 自动扫描
      __dirname + '/**/*.entity{.ts,.js}',
      // Core Entity：显式注册（不依赖 glob）
      ERDLRuleRecord,
      ERDLSnapshot,
      AgentTask,
      // ...
    ],
    synchronize: false,  // 生产安全
  }),
})
```

### Entity 定义示例

```typescript
@Entity('product_spu')
export class ProductSpu {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  spuCode: string;

  @Column({ type: 'varchar', length: 200 })
  spuName: string;

  @Column({ name: 'category_id', type: 'varchar', length: 36, nullable: true })
  categoryId: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ name: 'is_deleted', type: 'tinyint', default: 0 })
  isDeleted: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## Schema 同步检查

OpenOBA 提供 Entity 与数据库 schema 的同步检查工具：

- **EntitySyncService**（`src/modules/system/entity-sync.service.ts`）— 扫描 Entity 定义，与数据库实际表结构对比
- 在 `maintainer` 模式下可查看差异报告

如果 Entity 新增了字段但数据库没有，需要手写增量 SQL：

```sql
ALTER TABLE product_spu ADD COLUMN new_field varchar(100) DEFAULT NULL COMMENT '新字段';
```

---

## 数据库连接池

```typescript
extra: {
  connectionLimit: 50,        // 最大连接数
  connectTimeout: 10000,      // 连接超时 10s
  waitForConnections: true,   // 连接耗尽时等待
  queueLimit: 0,              // 等待队列不限
}
```

**生产环境调优建议**：
- 单机部署：`connectionLimit: 50` 足够
- 高并发：根据 `max_connections` 调整，建议 `connectionLimit ≤ max_connections / 实例数`
- 监控：关注 `Threads_connected` 和 `Aborted_clients`

---

## 备份与恢复

### 备份

```bash
# 全库备份
mysqldump -u root -p openoba_starter > backup_$(date +%Y%m%d).sql

# 仅结构
mysqldump -u root -p --no-data openoba_starter > structure.sql

# 仅数据
mysqldump -u root -p --no-create-info openoba_starter > data.sql
```

### 恢复

```bash
mysql -u root -p openoba_starter < backup_20260623.sql
```

> 💡 生产环境建议配置 MySQL 主从复制 + 定时备份，详见 [生产部署](../deployment/production.md)。

---

## 下一步

- 📖 [架构总览](../architecture/overview.md) — 数据库在系统中的位置
- 📖 [后端模块清单](../architecture/module-list.md) — 每个模块对应的表
- 📖 [生产部署](../deployment/production.md) — 生产数据库配置
- 📖 [安装指南](../getting-started/installation.md) — 数据库初始化
