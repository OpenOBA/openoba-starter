# Tech Stack

> Every technology in OpenOBA, and why it was chosen.

---

## Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend Framework** | NestJS 11 | Modular Node.js framework |
| **ORM** | TypeORM 0.3 | MySQL data access |
| **Database** | MySQL 8.0 | Business data storage |
| **Cache/Rate Limit** | Redis (optional) | Production rate limiting |
| **Auth** | Passport + JWT | Dual-track auth (admin + customer) |
| **Real-time** | Socket.IO 4 | AI streaming output |
| **API Docs** | Swagger | OpenAPI auto-generation |
| **Validation** | Zod + class-validator | Runtime type validation |
| **Frontend** | Vue 3.5 | Progressive UI framework |
| **Build** | Vite | Frontend bundling |
| **UI Library** | Element Plus | Enterprise component library |
| **State** | Pinia | Composable state management |
| **Routing** | Vue Router | SPA routing |
| **Language** | TypeScript 5 (backend) / 6 (frontend) | Type safety |
| **Testing** | Jest + Vitest + Playwright | Unit + E2E |
| **Code Quality** | ESLint + Prettier + Husky | Lint + format + git hooks |

---

## Backend

### NestJS 11

Modular architecture with dependency injection. Controller → Service → Entity separation. Each business domain is a `@Module()`. Core engine modules are referenced via barrel exports from `@openoba/core`.

### TypeORM 0.3

Deep NestJS integration. Entities auto-scanned via glob patterns. Connection pool: `connectionLimit: 50`. Charset: `utf8mb4`. Production uses `synchronize: false` with SQL migrations.

### MySQL 8.0

Transaction consistency (ACID) for ERP workloads. JSON column support for ERDL rule storage and AI context. 128+ tables across business (`product_spu`, `customer`) and system (`sys_` prefix).

### Socket.IO 4

Streaming ReAct output (Thought → Tool → Observation) over WebSocket. Room-based multi-user isolation. Frontend `useWsClient` composable handles connection lifecycle.

---

## Frontend

### Vue 3.5 + Composition API

All pages use `<script setup lang="ts">`. Logic reuse via 18 composables in `composables/`. Large components split: Customers.vue reduced from 1,356 to 410 lines.

### Vite

Millisecond HMR in development. Rollup-based production builds. Vue 3's official recommendation.

### Element Plus

Enterprise-grade component library: tables, forms, dialogs. Covers all ERP UI patterns. Full import currently ~895KB; on-demand import planned.

### Pinia

Vue 3's recommended state management. No mutations boilerplate. Full TypeScript support.

---

## LLM Providers

| Provider | Recommended For |
|----------|----------------|
| DeepSeek | Domestic, best value |
| Qwen | Alibaba Cloud ecosystem |
| OpenAI | International |
| GLM / MiniMax / Kimi | Built-in seed data available |

API keys configured in-system (ERA-Chat → Settings → API Keys). Multi-key round-robin with DB-first routing.

---

## Testing

| Tool | Scope |
|------|-------|
| Jest | Backend + Core unit tests |
| Vitest | Frontend unit tests |
| Playwright | E2E tests |

---

## Version Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18 | 20 LTS |
| MySQL | 8.0 | 8.0 |
| npm | 9 | 10 |

> ⚠️ Node.js 16 and below not supported (NestJS 11 requires ≥ 18).

---

## Further Reading

- [Architecture Overview](./overview.md)
- [Environment Setup](../development/environment-setup.md)
- [Coding Standards](../development/coding-standards.md)
