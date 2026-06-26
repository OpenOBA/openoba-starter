# Changelog

All notable changes to OpenOBA will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org).

---

## [Unreleased]

### Added
- Project introduction (`README.md` / `README.zh-CN.md`) — bilingual project overview with five-gap analysis and execution loop documentation
- GitHub docs directory (`docs-github/`) — centralized public-facing documentation workspace

---

## [1.4.0-alpha9] — 2026-06-24

### Added
- **Chat persistence unified to `chat_message` table**: DB-first with JSONL fallback; streaming thought/tool merged writes
- **Message recovery API**: `GET /eros/chat/:sessionKey/messages`; frontend three-tier recovery (DB → localStorage → AgentTask.context)
- **Meta-Mirror V3.0**: Code quality operating system
  - Quality gate DSL: 23 rules with three-tier matching (tool name + operation type + file pattern)
  - Version guardian: monorepo version consistency checks, Conventional Commits audit, CHANGELOG tracking
  - Rollback safety net: Checkpoint snapshots + 7-step rollback path + schema compatibility detection
  - Frontend panel (`/meta-mirror`): four metric cards + quality/version/rollback tabs
- **Open-source compliance files**: SECURITY.md, CODE_OF_CONDUCT.md, GOVERNANCE.md, CLA.md at repo root
- **Frontend 8 new components**: CustomerDetailDrawer, SetDialog, SkuImagePanel, AgentChatSidebar, AgentChatLogPanel, EraChatWelcome, TaskListPanel

### Changed
- **Frontend large-file split**: 4 files >800 lines all split (-38%, 4,561 → 2,824 lines)
  - Customers.vue 1,356 → 410 (-70%)
  - Products.vue 1,341 → 816 (-39%)
  - AgentChat.vue 1,023 → 963 (-6%)
  - TaskDashboard.vue 841 → 635 (-25%)

### Fixed
- Vue template syntax: multi-line `@click` + template `as` assertions in 3 files
- Product set API path: `/product-sets` → `/products/sets`
- Tool result rendering: streaming fragments merged; `pre-wrap` removed
- ChatMessage entity registration in TypeORM + barrel export
- Meta-Mirror panel UI: removed emoji, pure text minimal style

---

## [1.4.0-alpha7] — 2026-06-13

### Added
- Core V1.3.0 source migrated into monorepo (`packages/core/src/`)
- `@openoba/core` barrel export + dependency declaration
- GLM / MiniMax / Kimi model seed data
- ERA-Chat header model selector dropdown
- Settings API Key list management
- LLM Key dual-path integration (DB-first routing)

### Changed
- ts-jest / ESLint / nest-build compatibility upgrade
- Version number synchronized across repo (1.3.0 → 1.4.0-alpha7)

### Fixed
- Version check: offline fallback returns current version
- Version semantic comparison (prevent stale tag false positives)
- ReAct full-streaming output restored (`streamReActRound`)
- `model`/`token` tables aligned with Core entity (`sys_` prefix + column upgrade)
- `after_sales.is_deleted`, ERDLPlayground `nlHints`, Vite proxy port
- 14 split-file encoding fixes
- Core package `postinstall` script
- NestJS 11 re-upgrade (correct `package.json` version)

---

## [1.4.0-alpha2] — 2026-06-11

### Changed
- `xlsx`: npm 0.18.5 → CDN 0.20.3 (official source, fix Prototype Pollution)
- `expr-eval`: deprecated 2019 build → `mathjs` 15.2.0 (replaced by SafeExpr in later release)
- `exceljs`: removed

---

## [1.4.0-alpha1] — 2026-06-11

### Changed
- NestJS 11 upgrade (initial, superseded by alpha3)
- `tsconfig` paths + `jest` `rootDir` fix (core moved to backend `node_modules`)
- 4 split service file encoding fixes (binary restore)

### Security
- `npm audit`: 29 → 18 vulnerabilities (-38%)
- High-severity: 10 → 5 (-50%)
- Removed orphan `expr-eval` / `xlsx` dependency declarations

---

## [1.3.6] — 2026-06-11

### Added
- `docs/SECURITY-RUNBOOK.md` (24h incident response + 7 monitoring metrics)

---

## [1.3.5] — 2026-06-11

### Fixed
- CI: removed `continue-on-error`; added `npm audit` security step

---

## [1.3.4] — 2026-06-11

### Added
- MIT LICENSE, CONTRIBUTING.md, `.env.example`
- CI pipeline + E2E foundation + Playwright config

---

## [1.3.3] — 2026-06-11

### Changed
- V1.4-c large-file split: 5 backend modules + 14 frontend composables + view updates

### Added
- `wizard.guard.ts`, `after-sales-state-machine.ts`

---

## [1.3.2] — 2026-06-11

### Security
- `Math.random` → `crypto` (34 occurrences → 0)
- `.gitignore` hardening

---

## [1.3.1] — 2026-06-11

### Added
- `init-structure.sql` rebuilt (134 tables verified against entities)
- Full database schema documented in engineering master checklist

### Fixed
- `product_sku.lens_width` → `structure_width`

---

## [1.3.0] — 2026-06-08

### Added
- ReAct full-streaming output
- Wizard onboarding
- Redis rate limiting
- ESLint + Prettier + Husky
- `@openoba/types` package

### Changed
- `orderNo` prefix: `MJ-` → `OBA-`
- CORE barrel unified export

### Fixed
- 24 silent `catch` blocks
- 23 `LIKE` escape issues
- `OrderItemDto`, SMS counter, `execSync`, `Object.assign`, `audit-log`, CORS, SQL injection, `forwardRef`

### Security
- JWT weak key detection
- Global exception handler
- `helmet` integration

---

## [1.2.0] — 2026-06-07

### Added
- ERDL CRUD operations
- Agent model info injection

---

## [1.1.0] — 2026-06-06

### Added
- Agent persona awakening
- API Key persistence
- Provider compatibility layer

---

## [1.0.0] — 2026-05-31

### Added
- Three-mode operations design
- Wizard onboarding
- `.env.example`
- Version management system

---

## [0.9.0] — 2026-05-17

### Added
- "AI 执行官" brand positioning
- ERA-Chat workspace
- ERDL protocol
- Action Guard
- Meta-Mirror engine
- Skill system
- DataBridge
- 7 invention patents filed

---

## [0.1.0] — 2026-04-05

### Added
- Project initialization
- Eyewear industry schema
- Basic ERDL framework
