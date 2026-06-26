# ERDL 协议规范

> Entity-Relation Dynamic Language — 连接自然语言与企业系统的语义协议。

---

## 什么是 ERDL？

ERDL（Entity-Relation Dynamic Language）是一个 **YAML 超集的动态语义数据协议**。它将企业数字系统中沉淀的隐性知识，翻译为 LLM 可理解、可操作的显性规则。

ERDL 解决了 LLM 与企业系统之间最深的两道裂痕：

| 裂痕 | ERDL 的答案 |
|------|------------|
| **L2 语义权** — LLM 看不懂系统 schema | **Entity + Alias**：定义"有什么"以及"人怎么叫" |
| **L3 规则权** — LLM 不知道操作边界 | **Relation + Rule**：声明约束和关系 |

---

## 五层语义模型

```
Entity ──▶ Alias ──▶ Relation ──▶ Rule ──▶ Action
（有什么）  （怎么称呼） （如何关联） （边界在哪） （能做什么）
```

### 第一层：Entity — 系统里有什么

定义业务实体，映射到数据库表。

```yaml
entity: Customer
  table: customer
  description: "客户档案"
  fields:
    - name: id
      type: uuid
      primary: true
    - name: name
      type: string
      nullable: false
    - name: credit_level
      type: integer
      default: 1
```

### 第二层：Alias — 人怎么说

自然语言别名桥接用户用语和系统标识。

```yaml
alias:
  - field: name
    terms: ["客户名称", "姓名", "customer name", "client"]
  - field: credit_level
    terms: ["信用等级", "等级", "credit tier", "level"]
```

当用户说"把这个客户的等级调高"，ERDL 映射：
- "客户" → `Customer` 实体
- "等级" → `credit_level` 字段

### 第三层：Relation — 数据之间什么关系

定义实体间的关系。

```yaml
relation:
  - type: one_to_many
    from: Customer
    to: Order
    foreign_key: customer_id
    description: "一个客户有多个订单"
```

LLM 现在知道：操作 Order 时，可以引用父级 Customer。

### 第四层：Rule — 边界在哪

声明式约束。不是建议。是硬边界，由 Action Guard 强制执行。

```yaml
rule:
  - name: credit_level_range
    entity: Customer
    field: credit_level
    constraint: between 1 and 5
    message: "信用等级必须在 1-5 之间"

  - name: credit_level_upgrade_only
    entity: Customer
    field: credit_level
    constraint: new_value >= old_value
    unless: approval_flow == "special_override"
    message: "信用等级只能升不能降，除非特殊审批"

  - name: credit_level_5_requires_12m
    entity: Customer
    field: credit_level
    constraint: |
      if new_value == 5:
        require months_since_last_default >= 12
    message: "升至5级需要近12个月无逾期"
```

规则特点：

- **声明式** — 不写代码，只写约束
- **由 Action Guard 检查** — LLM 生成的任何操作在触达数据库前都经过规则验证
- **热加载** — 改规则即生效，无需重启

### 第五层：Action — 能做什么

定义 AI 可以调用的可执行操作。

```yaml
action:
  - name: createOrder
    entity: Order
    description: "创建新订单"
    params:
      - name: customer_id
        type: uuid
        required: true
      - name: items
        type: array
        required: true
    skill: order.create
```

---

## ERDL 在执行闭环中的角色

```
用户说："帮我把张三的信用等级调到5"
        │
        ▼
    [LLM 意图理解]
    目标：更新客户"张三"的 credit_level
        │
        ▼
    [ERDL 语义层]
    "张三" → Customer 实体 → name 字段
    "信用等级" → credit_level 字段
    "调到5" → credit_level = 5
        │
        ▼
    [ERDL 规则层 — 交叉验证]
    ✅ credit_level 在 1-5 之间 → 通过
    ✅ 升至5级需12个月无逾期 → 检查中
        │
        ▼
    [Action Guard]
    校验 → 通过 → 路由到 Skill
        │
        ▼
    [执行]
    UPDATE customer SET credit_level = 5 WHERE name = '张三'
        │
        ▼
    [结果]
    ✔ 客户张三信用等级已调整为5
```

没有 ERDL，这个交互需要 LLM 去：
1. 猜"等级"对应 `credit_level`（可能猜成 `member_tier`）
2. 猜 5 是有效值（可能试 10）
3. 不知道需要 12 个月无逾期
4. 不知道这个操作会触发风控通知

**ERDL 消灭了每一次猜测。**

---

## ERDL 文件格式

ERDL 文件是 YAML。推荐一个领域一个文件。

```yaml
# inventory.erdl.yaml
domain: inventory
version: "1.0"

entity:
  Inventory:
    table: inventory
    fields:
      - name: id
        type: uuid
        primary: true
      - name: product_sku_id
        type: uuid
      - name: quantity
        type: integer
      - name: warehouse_id
        type: uuid

alias:
  - field: quantity
    terms: ["库存数量", "库存", "stock", "qty", "库存水位"]
  - field: product_sku_id
    terms: ["商品", "SKU", "货品", "product"]

relation:
  - type: many_to_one
    from: Inventory
    to: ProductSku
    foreign_key: product_sku_id

rule:
  - name: quantity_non_negative
    field: quantity
    constraint: ">= 0"
    message: "库存数量不能为负数"

  - name: low_stock_alert
    field: quantity
    constraint: "if quantity < 10: notify inventory_manager"
    message: "库存低于10件时通知仓管"

action:
  - name: checkLowStock
    description: "查询库存低于阈值的商品"
    skill: inventory.lowStockQuery
  - name: transferStock
    description: "库存调拨"
    skill: inventory.transfer
```

---

## 热加载

ERDL 文件支持热加载。改一条规则、加一个别名、定义一个新的实体——变化在文件保存后立即生效。无需重启服务器，无需重新部署。

这对企业落地至关重要：业务规则频繁变化。ERDL 让规则变更和编辑 YAML 文件一样简单。

---

## SafeExpr — 表达式引擎

ERDL 规则使用 SafeExpr 进行约束求值。SafeExpr 是自研的递归下降表达式解析器：

- **零代码注入风险** — 不使用 `eval()`，不使用 `new Function()`
- **操作符白名单** — 算术、比较、逻辑、成员检查
- **优雅降级** — 非法表达式返回清晰的错误信息，从不崩溃
- **常量折叠** — 在解析阶段预计算静态表达式

SafeExpr 替代了存在已知安全漏洞的 `expr-eval@2.0.2`（GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x）。

---

## ERDL 与 MCP

| | MCP（Model Context Protocol） | ERDL |
|---|------------------------------|------|
| **目的** | 连接 LLM 与数据源 | 让 LLM 能操作企业系统 |
| **回答的问题** | "我能访问什么？" | "我能做什么？规则是什么？" |
| **抽象层级** | 工具/资源层 | 语义层 |
| **约束模型** | 无（信任 LLM 输出） | 声明式规则，由 Action Guard 强制执行 |
| **格式** | JSON-RPC | YAML |

ERDL 不是 MCP 的竞争对手。它是 MCP 没有提供的那层：**语义执行**。

---

## 延伸阅读

- [架构总览](../architecture/overview.zh-CN.md)
- [模块清单](../architecture/module-list.zh-CN.md)
- [快速开始](../getting-started/quick-start.zh-CN.md)
