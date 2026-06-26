# ERDL Protocol Specification

> Entity-Relation Dynamic Language — the semantic protocol that bridges natural language and enterprise systems.

---

## What is ERDL?

ERDL (Entity-Relation Dynamic Language) is a **YAML-superset dynamic semantic data protocol**. It translates the tacit knowledge embedded in enterprise digital systems into explicit, machine-operable rules that LLMs can consume and execute against.

ERDL addresses the two deepest gaps between LLMs and enterprise systems:

| Gap | ERDL's Answer |
|-----|--------------|
| **L2 Semantics** — LLM can't read system schemas | **Entity + Alias**: Define what exists and how humans refer to it |
| **L3 Rules** — LLM doesn't know operational boundaries | **Relation + Rule**: Declare constraints and relationships |

---

## Five-Layer Semantic Model

```
Entity ──▶ Alias ──▶ Relation ──▶ Rule ──▶ Action
 (WHAT)     (HOW TO SAY)  (HOW CONNECTED)  (BOUNDARIES)  (WHAT TO DO)
```

### Layer 1: Entity — What exists in the system

Defines business entities. Maps to database tables.

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

### Layer 2: Alias — How humans refer to things

Natural language aliases bridge user language and system identifiers.

```yaml
alias:
  - field: name
    terms: ["客户名称", "姓名", "customer name", "client"]
  - field: credit_level
    terms: ["信用等级", "等级", "credit tier", "level"]
```

When a user says "把这个客户的等级调高", ERDL maps:
- "客户" → `Customer` entity
- "等级" → `credit_level` field

### Layer 3: Relation — How entities connect

Defines relationships between entities.

```yaml
relation:
  - type: one_to_many
    from: Customer
    to: Order
    foreign_key: customer_id
    description: "一个客户有多个订单"
```

The LLM now knows: when operating on an Order, it can reference the parent Customer.

### Layer 4: Rule — The boundaries

Declarative constraints. These are NOT suggestions. They are hard boundaries enforced by Action Guard.

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

Rules are:

- **Declarative** — no code, just statements
- **Checked by Action Guard** — before any LLM-generated operation touches the database
- **Hot-reloadable** — change a rule, it takes effect immediately without restart

### Layer 5: Action — What can be done

Defines executable operations the AI can invoke.

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

## ERDL in the Execution Loop

```
User says: "帮我把张三的信用等级调到5"
        │
        ▼
    [LLM Intent]
    Goal: update credit_level for Customer "张三"
        │
        ▼
    [ERDL Semantic Layer]
    "张三" → Customer entity → name field
    "信用等级" → credit_level field
    "调到5" → credit_level = 5
        │
        ▼
    [ERDL Rule Layer — Cross-check]
    ✅ credit_level between 1 and 5 → PASS
    ✅ credit_level 5 requires 12 months no default → CHECK
        │
        ▼
    [Action Guard]
    Validate → Approve → Route to Skill
        │
        ▼
    [Execute]
    UPDATE customer SET credit_level = 5 WHERE name = '张三'
        │
        ▼
    [Result]
    ✔ 客户张三信用等级已调整为5
```

Without ERDL, this interaction would require the LLM to:
1. Guess that "等级" means `credit_level` (might guess `member_tier`)
2. Guess that 5 is valid (might try 10)
3. Not know about the 12-month no-default requirement
4. Not know this triggers a risk control notification

**ERDL eliminates every guess.**

---

## ERDL File Format

ERDL files are YAML. One file per domain is recommended but not required.

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

## Hot Reload

ERDL files support hot reload. Change a rule, add an alias, define a new entity — the changes take effect on the next file save. No server restart. No deployment.

This is critical for enterprise adoption: business rules change frequently. ERDL makes rule changes as simple as editing a YAML file.

---

## SafeExpr — Expression Engine

ERDL rules use SafeExpr for constraint evaluation. SafeExpr is an in-house recursive-descent expression parser with:

- **Zero code injection risk** — no `eval()`, no `new Function()`
- **Whitelist-only operators** — arithmetic, comparison, logical, membership
- **Graceful degradation** — invalid expressions return clear error messages, never crash
- **Constant folding** — pre-computes static expressions at parse time

SafeExpr replaced `expr-eval@2.0.2` which had known security vulnerabilities (GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x).

---

## ERDL vs MCP

| | MCP (Model Context Protocol) | ERDL |
|---|------------------------------|------|
| **Purpose** | Connect LLMs to data sources | Enable LLMs to operate on systems |
| **Answers** | "What can I access?" | "What can I do, and what are the rules?" |
| **Abstraction** | Tool/resource layer | Semantic layer |
| **Constraint model** | None (trusts LLM output) | Declarative rules enforced by Action Guard |
| **Format** | JSON-RPC | YAML |

ERDL is not a competitor to MCP. It is the layer MCP doesn't provide: **semantic execution**.

---

## Further Reading

- [Architecture Overview](../architecture/overview.md)
- [Module List](../architecture/module-list.md)
- [Quick Start](../getting-started/quick-start.md)
