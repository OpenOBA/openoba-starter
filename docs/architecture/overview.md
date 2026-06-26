# Architecture Overview

> How OpenOBA is built, layer by layer.

---

## One Sentence

OpenOBA is a **monorepo with per-directory licensing**. The upper layer is an ERP reference implementation (MIT). The lower layer is the OpenOBA Core engine (BSL 1.1 → Apache 2.0 in 2030). The architecture enables natural-language-driven, deterministic execution within enterprise digital systems.

---

## Architecture Layers

```
┌──────────────────────────────────────────────────────────┐
│                    Presentation Layer                     │
│   ┌──────────────┐    ┌──────────────┐                   │
│   │  Traditional  │    │  ERA-Chat    │  ← NL interface   │
│   │  Forms (Vue)  │    │  (Vue 3)     │                   │
│   └──────┬───────┘    └──────┬───────┘                   │
└──────────┼───────────────────┼───────────────────────────┘
           │  HTTP / WebSocket │
┌──────────┼───────────────────┼───────────────────────────┐
│          ▼                   ▼      Application Layer     │
│   ┌──────────────────────────────────────────────────┐    │
│   │           ERP Reference (MIT)                     │    │
│   │  product │ customer │ order │ inventory │ ...    │    │
│   └──────────────────────┬───────────────────────────┘    │
│                          │ DI + Entity registration       │
│   ┌──────────────────────▼───────────────────────────┐    │
│   │         OpenOBA Core (BSL 1.1)                    │    │
│   │                                                    │    │
│   │  ERDL · Action Guard · ReAct · SOUL                │    │
│   │  Meta-Mirror · Agent Memory · Skill System         │    │
│   └──────────────────────┬───────────────────────────┘    │
└──────────────────────────┼───────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                      Data Layer                           │
│          ┌───────────────▼───────────────┐                │
│          │      MySQL 8.0 (utf8mb4)      │                │
│          └───────────────────────────────┘                │
│          ┌───────────────┬───────────────┐                │
│          │  Redis (opt)   │  LLM API      │                │
│          │  rate-limit    │  DeepSeek/Qwen │               │
│          └───────────────┴───────────────┘                │
└───────────────────────────────────────────────────────────┘
```

---

## Two Core Components

### 1. ERP Reference Implementation (MIT)

A complete eyewear industry management system:

| Module | Capability |
|--------|-----------|
| **Product** | SPU/SKU/sets/barcodes/categories |
| **Customer** | Profiles/membership/auth |
| **Order** | Orders/after-sales/reviews |
| **Inventory** | Stock/transfer/alerts |
| **System** | Users/roles/permissions/menus/audit |

Built with NestJS 11 + TypeORM + MySQL, served via `packages/backend`.

### 2. OpenOBA Core Engine (BSL 1.1)

The AI Executor runtime. Every component addresses a specific gap between LLMs and enterprise systems:

| Component | Gap Addressed | Function |
|-----------|--------------|----------|
| **ERDL** | Semantics + Rules (L2+L3) | Five-layer semantic protocol: Entity, Alias, Relation, Rule, Action. YAML-defined, hot reload. Translates NL to system operations deterministically. |
| **Action Guard** | Action (L4) | Three-tier validation (Format → Rule → Permission). LLM output must pass all tiers before touching any system. |
| **ReAct Engine** | Execution control | Single-tool-per-round decision loop. Observation-driven. Full streaming output (Thought → Tool → Observation timeline). |
| **SOUL** | Identity + boundaries | Agent persona system: identity, capability scope, execution constraints. |
| **Meta-Mirror** | Self-awareness | Source structure scanning → knowledge base auto-generation + quality gate DSL. |
| **Agent Memory** | Evolution | Full-chain log archival. Success → experience accumulation. Failure → root cause injected for future avoidance. |
| **Skill System** | Extensibility | 18 built-in skills (CRUD, Analytics, CodeGen, TypeCheck). Extensible via TypeScript modules. |

---

## The Six-Step Execution Loop

Every natural language request follows the same path:

```
Intent → Semantic → Protocol → SingleTool → Execute → Memory
 (LLM)    (ERDL)   (ActionGuard)  (ReAct)     (Skill)
```

| Step | Component | What Happens |
|------|-----------|-------------|
| Intent | LLM | Parse NL, extract goal and parameters |
| Semantic | ERDL | Map NL to entities, fields, and rules |
| Protocol | Action Guard | Validate and structure the instruction |
| SingleTool | ReAct | Execute one tool, observe result, decide next step |
| Execute | Skill | Perform the operation (CRUD/Analytics/CodeGen) |
| Memory | Agent Memory | Archive log, accumulate experience |

### Dual Path: Success + Immunity

- **✔ Success** → result reported → experience written to Memory → next similar task: more precise, more efficient
- **✘ Failure** → Action Guard interception → Checkpoint rollback → root cause injected → automatically avoided next time

---

## Data Flow Example

User types: *"Show me frames with stock below 10"*

```
User Input
  │
  ▼
[ERA-Chat] ──WebSocket──▶ [ChatModule]
                              │
                              ▼
                         [SOUL]
                         Inject agent identity + constraints
                              │
                              ▼
                         [Meta-Mirror]
                         Inject Inventory entity context
                              │
                              ▼
                         [ReAct Loop]
                         Think → Single Tool → Observe
                              │
                              ▼
                         [Action Guard]
                         Parse LLM output (4-format adaptive)
                         Validate (Format → Rule → Permission)
                              │
                              ▼
                         [ERDL Translation]
                         "stock" → inventory entity → inventory table
                         "below 10" → qty < 10 → WHERE qty < ?
                              │
                              ▼
                         [ERP Layer]
                         InventoryService.lowStockQuery()
                              │
                              ▼
                         [MySQL]
                         SELECT * FROM inventory WHERE qty < 10
                              │
                              ▼
                         [Memory]
                         Success recorded for future optimization
                              │
                              ▼
                         [SSE Stream]
                         thought → tool_start → tool_end → observation → done
                              │
                              ▼
                         [ERA-Chat renders result]
```

---

## Monorepo Package Structure

```
packages/
├── backend/    # ERP backend (MIT, main application entry)
├── core/       # @openoba/core engine (BSL 1.1)
└── types/      # @openoba/types shared types (MIT)
frontend/       # Vue 3 frontend (MIT, independently deployable)
```

Dependencies:

```
frontend ──HTTP/WS──▶ backend
                        │
                        ├──▶ @openoba/core (engine)
                        └──▶ @openoba/types (shared types)
```

---

## Deployment

### Single-machine (recommended start)

```
[Browser] ──▶ [Nginx] ──▶ [Node.js (backend + core)]
                              │
                              ├──▶ [MySQL]
                              └──▶ [Redis (optional)]
```

### Three modes

Controlled via `OPENOBA_MODE` env variable:

| Mode | Purpose | When |
|------|---------|------|
| `operator` | Production | Hide dev features |
| `developer` | Local dev | Show debug tools |
| `maintainer` | Diagnostics | Show system internals |

---

## Key Design Decisions

### Why BSL 1.1 for Core?

BSL allows source-available use for non-production and research. Commercial competitive use requires a license. Converts to Apache 2.0 on 2030-06-09. This balances open-source principles with commercial sustainability.

### Why Monorepo?

ERP and Core share TypeORM entities, NestJS modules, and type definitions. Monorepo prevents version drift and simplifies entity registration across packages.

### Why YAML for ERDL?

ERDL rules must be readable and writable by both humans and LLMs. YAML's structured text format is natively suited for LLM generation while supporting hot reload (no restart needed) and version snapshots.

### Why single-tool-per-round (ReAct)?

Parallel tool execution (common in other agent frameworks) makes decisions based on assumptions before seeing actual results. OpenOBA's single-tool strategy executes one action, observes the real result, then decides the next step — eliminating wasted operations.

### Why Action Guard instead of Prompt constraints?

LLM output formats are unpredictable. The same model on the same task may return standard function calls one round and XML tags the next. Action Guard uses four-format adaptive parsing, ensuring structured output regardless of LLM variability. It is an architectural constraint, not a prompt engineering trick.

### Why Meta-Mirror?

Traditional AI assistants don't know what entities, APIs, or rules exist in your project — you must manually feed context. Meta-Mirror scans the entire project at startup, auto-generating a knowledge base injected into every agent's context. The AI knows what it can do.

---

## Further Reading

- [Quick Start](../getting-started/quick-start.md) — 5-minute hands-on
- [Tech Stack](./tech-stack.md) — Why each technology was chosen
- [Module List](./module-list.md) — Every module explained
- [ERDL Protocol](../erdl/overview.md) — Five-layer semantic model specification
- [Database Schema](../database/schema.md) — Table organization
- [Security Architecture](../security/security-architecture.md) — Auth and protection
