# Backend Module List

> Every NestJS module in OpenOBA, what it does, and where to find it.

---

## Module Tree

```
AppModule
├── Infrastructure
│   ├── ConfigModule          # Environment variables
│   ├── TypeOrmModule         # Database connection
│   ├── RateLimiterModule     # Rate limiting (Redis/Memory dual-mode)
│   └── ServeStaticModule     # Static file serving (uploads/)
│
├── ERP Business Modules (MIT)
│   ├── AuthModule            # Admin authentication
│   ├── SystemModule          # Users / Roles / Permissions / Menus
│   ├── CustomerModule        # Customer profiles & membership
│   ├── CustomerAuthModule    # Customer-facing auth (SMS login)
│   ├── ProductModule         # SPU / SKU / Sets / Pricing / Barcodes
│   ├── CategoryModule        # Product categories
│   ├── OrderModule           # Orders & state machine
│   ├── InventoryModule       # Stock / Transfer / Alerts
│   ├── AfterSalesModule      # Returns / Exchanges / Refunds / Repairs
│   ├── ColorModule           # Color design & palette
│   ├── AestheticsModule      # Aesthetic matching rules
│   ├── StructureModule       # Frame structure standards
│   ├── DictionaryModule      # Data dictionaries (enums, constants)
│   ├── SmsModule             # Alibaba Cloud SMS
│   ├── ReviewModule          # Product reviews
│   ├── UploadModule          # File upload (multer)
│   ├── WebsiteModule         # Website content
│   ├── DraftPoolModule       # AI-generated content staging
│   ├── SubSkuModule          # Sub-SKU management
│   ├── HealthModule          # Health check endpoint /health
│   └── SchemaModule          # ERDL schema definitions
│
└── Core Engine Modules (BSL 1.1, via @openoba/core)
    ├── ERDLModule            # Rule engine & semantic protocol
    ├── ErosTaskModule        # Task workflows (ReAct loop)
    ├── ChatModule            # WebSocket chat & streaming
    ├── MetaMirrorModule      # Source scanning & self-awareness
    ├── AgentMemoryModule     # Persistent memory & evolution
    ├── SkillModule           # Skill registry
    ├── ToolRegistryModule    # Tool registry (@Global)
    └── SoulModule            # Agent persona (@Global)
```

---

## Core Engine Modules

### ERDLModule — Semantic Protocol Engine

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | CRUD, hot reload, snapshots, recommendations for ERDL rules |
| Key classes | `ERDLRuleEngine`, `SafeExpr`, `RuleStoreService`, `SnapshotManagerService` |

**SafeExpr**: In-house recursive-descent expression engine. Zero code injection risk. Replaces `expr-eval@2.0.2`.

### ErosTaskModule — ReAct Task Workflow

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | Agent task creation, execution, cognitive logging, knowledge base |
| Key entities | `AgentTask`, `CognitiveLog`, `KnowledgeEntry` |

**ReAct single-tool decision**: One tool per round. Result observed before next decision. Four-tier protection: token budget cutoff, user abort detection, infinite loop detection, soft round limit. Five SSE event types: `thought → tool_start → tool_end → observation → round_done`.

### ChatModule — WebSocket Streaming & Action Guard

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | Socket.IO connection management, streaming event dispatch |

**Action Guard pipeline**: LLM output passes four modules before execution:
1. **Intent Parser** — Four-format adaptive parsing (FC > JSON > XML > text)
2. **Action Validator** — Three-tier check: definition → alias → completeness
3. **Action Router** — Action → Service route execution
4. **Output Cleaner** — Strips protocol details from user view

Can be toggled off instantly via `ERDL_ACTION_GUARD=false` env variable.

### MetaMirrorModule — Self-Awareness Engine

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | Auto-scan entities, APIs, DTOs, rules; register as AI-accessible capabilities |
| Scanners | `entity.scanner`, `api.scanner`, `dto.scanner`, `rule.scanner` |

Precision context injection: extracts only declared scope content (~200-500 tokens) vs full injection, saving ~90% tokens. DTO consistency audit: cross-compares `@Min/@Max/@IsEnum` decorators against ERDL rules.

### AgentMemoryModule — Persistent Memory & Evolution

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | Persistent memory storage, error → memory conversion, scoped injection, versioned lifecycle |

**Failure → memory chain**: tool failure → error log → self-review post-task → extract lesson → create `agent_memory` → auto-inject next similar task. Structured fields: `category`, `severity`, `scope`, `scope_value`. ≤8 relevant memories injected per session. Versioned lifecycle: `active → stale (30d) → archived (90d)`.

### SkillModule — Skill Registry

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | AI skill registration center, skill key vault (PBKDF2 encrypted) |

### ToolRegistryModule — Tool Registry

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | Global tool call registry (`@Global`), tool authentication |

### SoulModule — Agent Persona

| Path | `@openoba/core` |
|------|-----------------|
| Responsibility | Agent identity, constraints, capability boundaries (`@Global`) |
| Layers | Identity (`securityClearance`) + Capability (`canEditCode`, tools) + Iron Rules (hard constraint instructions) |

---

## ERP Business Modules

| Module | Path | Key Entities & Features |
|--------|------|------------------------|
| **AuthModule** | `src/modules/auth/` | Admin login, JWT issuance, bcrypt passwords |
| **SystemModule** | `src/modules/system/` | Users, roles, permissions (RBAC), menus, audit logs, deployment health, Wizard onboarding |
| **CustomerModule** | `src/modules/customer/` | Customer profiles, membership tiers, consumption stats |
| **CustomerAuthModule** | `src/modules/customer-auth/` | SMS-based customer login, separate JWT secret |
| **ProductModule** | `src/modules/product/` | SPU/SKU/sets/pricing, barcode generation, SKU naming engine, tiered pricing |
| **CategoryModule** | `src/modules/category/` | Category tree management |
| **OrderModule** | `src/modules/order/` | Orders, state machine, order items. Prefix: `OBA-` |
| **InventoryModule** | `src/modules/inventory/` | Stock CRUD, inventory transactions, stock alerts |
| **AfterSalesModule** | `src/modules/after-sales/` | Return/exchange/refund/repair, state machine |
| **ColorModule** | `src/modules/color/` | Color design, palette management, material mapping |
| **AestheticsModule** | `src/modules/aesthetics/` | Aesthetic matching rules, compatibility matrix |
| **StructureModule** | `src/modules/structure/` | Frame structure dimension standards |
| **DictionaryModule** | `src/modules/dictionary/` | System dictionaries, constants cache at startup |
| **SmsModule** | `src/modules/sms/` | Alibaba Cloud SMS, rate-limited verification codes |
| **ReviewModule** | `src/modules/review/` | Product reviews |
| **UploadModule** | `src/modules/upload/` | File upload (multer) |
| **WebsiteModule** | `src/modules/website/` | Website content management |
| **DraftPoolModule** | `src/modules/draft-pool/` | AI-generated content staging |
| **SubSkuModule** | `src/modules/sub-sku/` | Sub-SKU management |
| **HealthModule** | `src/modules/health/` | Health check endpoint `/health` |
| **SchemaModule** | `src/modules/schema/` | ERDL schema definitions |

---

## Shared Components (`common/`)

| Component | Purpose |
|-----------|---------|
| `PublicDecorator` | Mark endpoints as public (skip JWT) |
| `RolesDecorator` | Role-based access control |
| `RolesGuard` | Role enforcement guard |
| `RateLimiterModule` | Memory + Redis rate limit implementations |
| `ResponseDto` | Unified API response format |
| `DictConstants` | Dictionary constant cache |

---

## Further Reading

- [Architecture Overview](./overview.md)
- [ERDL Protocol](../erdl/overview.md)
- [Database Schema](../database/schema.md)
- [API Overview](../api/overview.md)
