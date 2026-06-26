# OpenOBA — AI-Native Autonomous Executor

> **AI-Native Autonomous Executor** — An intelligent execution entity driven by natural language, capable of autonomous path planning, deterministic task execution within enterprise digital systems, and continuous self-evolution.
>
> **中文**: AI 原生自主执行体

---

## Preface: One Human, One Machine

OpenOBA is the real-world output of human-AI co-creation.

In April 2026, a founder with zero technical background set out to form a human-AI co-creation entity. Starting from imitation and replication of existing products, the AI's capabilities led the entity toward a breakthrough direction: deterministic execution in digital systems. Human defines goals and provides feedback. AI handles architecture design, full-stack coding, code review, testing, and documentation. In three months, this entity delivered a rigorous enterprise-grade software system from scratch — full-stack TypeScript, three-layer execution engine, built-in Skill system, complete test coverage, and quality gates. That system is OpenOBA.

**OpenOBA's product philosophy was proven in the very process of its creation: AI possesses — and can exceed — human-level execution capability.**

---

## 1. Problem: Five Gaps Between LLMs and Enterprise Systems

Between LLMs and enterprise digital systems lie five progressive gaps:

| Layer | Gap | What LLM Lacks | Manifestation |
|-------|-----|----------------|---------------|
| **L1 Access** | Can't reach | Physical connection | LLM in cloud, DB/API on intranet |
| **L2 Semantics** | Can't read | Business semantic mapping | `f_crd_lvl` = ? Industry codes → business meaning |
| **L3 Rules** | No boundaries | Business rule constraints | Rules scattered across code; LLM sees IF-ELSE fragments |
| **L4 Action** | Can't act | Executable operations | Can generate SQL, can't execute it |
| **L5 Accountability** | Can't trust | Traceability & rollback | Who's responsible? LLM can't sign off |

**Bottom line: Can't reach, can't read, can't trust. Paralyzed at every layer.**

---

## 2. Solution: Breaking Through Each Layer

OpenOBA provides deterministic answers for every gap at the protocol layer:

| Gap | OpenOBA Solution | Mechanism |
|-----|-----------------|-----------|
| **L1 Access** | Connector layer | On-premise deployment, direct DB/API/FileSystem access |
| **L2 Semantics** | ERDL Entity + Alias | Business entity definitions + NL → field-name mapping |
| **L3 Rules** | ERDL Rule + Relation | Declarative rule constraints + entity relationship graph |
| **L4 Action** | Action Guard + Skill | Three-tier validation (Format/Rule/Permission) → 18 built-in Skills execute directly |
| **L5 Accountability** | Audit log + Checkpoint | Full-chain traceability + one-click 7-step rollback |

### ERDL — Semantic Foundation (L2 + L3)

ERDL (Entity-Relation Dynamic Language) is a YAML-superset dynamic semantic data protocol. Its five-layer semantic model translates enterprise tacit knowledge into explicit rules LLMs can operate on:

| Layer | Responsibility |
|-------|---------------|
| **Entity** | Business entity definitions (Customer, Order, Inventory) |
| **Alias** | Natural language aliases (`"order time"` → `created_at`) |
| **Relation** | Entity relationships (Customer 1:N Order) |
| **Rule** | Declarative rule constraints (amount > 0, state machine validity) |
| **Action** | Executable operation definitions (createOrder, updateStock) |

Fully YAML-defined, Hot Reload. Enterprises express knowledge directly against the system — no model training required.

### Action Guard — Execution Firewall (L4)

Every LLM output passes three rigid validation tiers before touching any system:

1. **Format** — Four-format adaptive parsing; output must be structured
2. **Rule** — Cross-validation against ERDL Rule layer; reject violations
3. **Permission** — Role-based operation boundary check

Instructions failing Action Guard **physically cannot reach any enterprise system**.

### Audit & Rollback (L5)

Every ReAct step is recorded. ERDL rule layer and DTO code layer are cross-audited bidirectionally. Automatic Checkpoint snapshots before critical operations. One-click 7-step rollback (Git + Build + Test + Restart).

---

## 3. Six-Step Execution Loop

```
Intent → Semantic → Protocol → SingleTool → Execute → Memory
 (LLM)    (ERDL)   (ActionGuard)  (ReAct)     (Skill)
```

| Step | Component | Function |
|------|-----------|----------|
| Intent | LLM | Natural language parsing, goal & parameter extraction |
| Semantic | ERDL | NL → entity/field/rule mapping |
| Protocol | Action Guard | Structured instruction conversion + three-tier validation |
| SingleTool | ReAct | One tool per round, Observation-driven next step |
| Execute | Skill | CRUD / Analytics / CodeGen / TypeCheck |
| Memory | Agent Memory | Full-chain log archival + experience accumulation |

### Dual Path: Evolution + Immunity

**✔ Success** → Result reported → Experience written to Agent Memory → Next similar task: more precise, more efficient.

**✘ Failure** → Action Guard interception → Checkpoint auto-rollback → Root cause injected into Memory → Automatically avoided in next inference.

**Gets smarter. Gets more reliable. Every run.**

---

## 4. Tech Stack

- **LLM**: DeepSeek / Qwen multi-model routing
- **Protocol**: ERDL (YAML superset, Hot Reload)
- **Backend**: NestJS 11 + TypeScript + TypeORM + MySQL + Redis
- **Frontend**: Vue 3 + Element Plus + TypeScript (Composition API · `<script setup>`)
- **Communication**: WebSocket-first + SSE fallback (Socket.IO)
- **Execution Engine**: ReAct + Action Guard + SafeExpr (in-house expression engine)
- **Infrastructure**: RDBMS / REST API / FileSystem / Cache / Queue
- **Patents**: 7 invention patents backing the deterministic execution architecture

## 5. License

This repository uses per-directory licensing:

| Scope | License |
|-------|---------|
| `packages/core/` | BSL 1.1 (converts to Apache 2.0 on 2030-06-09) |
| Everything else (backend / frontend / types) | MIT |

See root [LICENSE](./LICENSE) and [packages/core/LICENSE](./packages/core/LICENSE).

---

## 6. Human-AI Co-Creation Results

OpenOBA itself is the first real-world validation of the AI-Native Autonomous Executor. 120 days. 30 billion tokens.

| Metric | Data |
|--------|------|
| Timeline | 2026.04.03 — present |
| Participants | 1 Human + 1 AI Executor |
| Source files | ~570 TS/Vue files, ~3MB production code |
| Commits | 3,200+ |
| Version | V1.5.0-alpha |
| Backend | 22 modules · 72 entities |
| Frontend | 11 views · 18 composables |
| Tests | 35 backend suites + 7 frontend suites |
| Quality | 0 TS errors · 0 ESLint errors · 0 `any` |

### Key Innovations

- **ERDL** — Five-layer semantic protocol bridging the NL ↔ Schema gap
- **SafeExpr** — In-house recursive-descent expression engine, zero code injection risk
- **Action Guard** — Protocol-layer three-tier validation (Format → Rule → Permission), no Prompt dependency
- **ReAct Engine** — Single-tool decision + full streaming + Thought → Tool → Observation timeline
- **Meta-Mirror** — Source structure scanning → auto knowledge base generation + quality gate DSL
- **Agent Memory** — Failure root cause injected by scope, precision improves with every run
- **Quality Gates** — L1 Git → L2 Type → L3 Test → L4 Lint → L5 Review

**One human, one machine. Co-creating. Continuously evolving.**

---

> OpenOBA is not a tool you use. It is an executor you trust.
>
> This project is the first proof.
