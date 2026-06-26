# Security Architecture

> How OpenOBA protects data, identity, and execution.

---

## Authentication

### Dual-Track JWT

| Track | Purpose | Secret |
|-------|---------|--------|
| **Admin** | Management panel, system config, CRUD | `JWT_SECRET` |
| **Customer** | Customer-facing API (orders, profile) | `CUSTOMER_JWT_SECRET` |

Separate secrets ensure a compromised customer token cannot access admin functions.

### Password Hashing

- **Preferred**: Argon2id (memory-hard, GPU-resistant)
- **Fallback**: bcrypt with cost ≥ 12
- Plaintext passwords are never stored
- Password validation on input (minimum length, complexity)

---

## Authorization — RBAC

Role-Based Access Control with three layers:

```
sys_user ──▶ sys_role ──▶ sys_permission ──▶ sys_menu
  (user)      (role)       (resource+action)   (UI visibility)
```

| Layer | Function |
|-------|----------|
| **Roles** | Named permission sets (admin, operator, viewer) |
| **Permissions** | Resource + action pairs (e.g., `product:create`, `order:read`) |
| **Menus** | UI visibility — users only see menu items their roles permit |

Enforced by `RolesGuard` on every protected endpoint. `@Roles()` decorator specifies required roles per handler.

---

## Action Guard — Three-Tier Validation

Every LLM-generated action passes through three validation tiers before touching any system:

```
Format ──▶ Rule ──▶ Permission
 (L1)       (L2)       (L3)
```

| Tier | What It Checks |
|------|---------------|
| **Format** | Intent Parser: four-format adaptive parsing (FC > JSON > XML > text). Ensures LLM output is structurally valid regardless of format drift. |
| **Rule** | Action Validator: three-tier check — definition exists → alias maps correctly → all required fields present. Cross-references ERDL rules. |
| **Permission** | RBAC enforcement: does the executing user/agent have permission for this action? |

Action Guard can be toggled off via `ERDL_ACTION_GUARD=false` for development, but this should **never** be done in production.

---

## SafeExpr — Expression Engine

In-house recursive-descent expression parser used by ERDL rules:

- **Zero code injection** — no `eval()`, no `new Function()`
- **Whitelist-only operators** — arithmetic, comparison, logical, membership
- **Graceful degradation** — invalid expressions return clear errors
- **Constant folding** — pre-computes static expressions at parse time

Replaced `expr-eval@2.0.2` due to known vulnerabilities (GHSA-8gw3-rxh4-v6jx, GHSA-jc85-fpwf-qm7x).

---

## Database Security

- **Parameterized queries only** — all TypeORM operations use parameter binding
- **No raw SQL from LLM output** — ERDL validates all rules before execution
- **Connection pooling** with max 50 connections, idle timeout configured
- **Database credentials** separated from application credentials
- **Minimal privileges** — app user has no DROP/ALTER in production

---

## Checkpoint + Rollback

Seven-step rollback procedure for deployment or configuration issues:

| Step | Action |
|------|--------|
| 1 | **Git** — `git checkout <stable-commit>` |
| 2 | **Build** — `npm ci --production && npm run build:backend` |
| 3 | **Test** — `npm test` |
| 4 | **Restart** — `pm2 reload openoba-backend` (zero-downtime) |
| 5 | **Verify** — `curl /health` |
| 6 | **Monitor** — watch logs for 15 minutes |
| 7 | **Database** — restore from encrypted backup if needed |

Every ReAct step is checkpointed in `cognitive_log` for audit and rollback reference.

---

## Audit Logging

Every ReAct execution step is recorded in `cognitive_log`:

| Field | Content |
|-------|---------|
| `taskId` | Task correlation ID |
| `step` | Thought / Tool-Start / Tool-End / Observation |
| `tool` | Skill/tool name invoked |
| `input` | Tool input parameters (sanitized) |
| `output` | Tool output (truncated if large) |
| `timestamp` | ISO 8601 |
| `status` | success / failure / intercepted |

Audit logs should be retained ≥ 180 days in production. Integrate with SIEM (Splunk / ELK) for centralized monitoring.

---

## Skill Key Vault

Skill authentication keys are stored with PBKDF2 hashing:

| Property | Value |
|----------|-------|
| Algorithm | PBKDF2 |
| Salt | Per-key random salt |
| Iterations | 100,000+ |
| Storage | `skill_key` table, hashed value only |

Keys are never logged or returned in API responses. Rotation recommended every 90 days.

---

## Network Security

| Layer | Protection |
|-------|-----------|
| **CORS** | Whitelisted origins only in production |
| **Helmet** | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| **Rate Limiting** | Redis-backed, per-IP and per-endpoint (see [API Overview](../api/overview.md)) |
| **TLS** | TLS 1.2+ at Nginx reverse proxy |
| **Firewall** | Only ports 80/443 public; 3000 restricted to localhost |

---

## Secret Management

| Practice | Detail |
|----------|--------|
| `.env` exclusion | Never committed (`.gitignore`, CI secrets scanning) |
| Key rotation | All secrets rotated every 90 days in production |
| Generation | `openssl rand -hex 32` for new secrets |
| Purging | Old keys purged from Git history on rotation |
| No logging | Secrets, tokens, and keys never appear in logs |

---

## Further Reading

- [Security Policy](/SECURITY.md) — vulnerability reporting, SLA, safe harbor
- [API Overview](../api/overview.md) — auth endpoints and token conventions
- [Production Deployment](../deployment/production.md) — security hardening checklist
- [ERDL Protocol](../erdl/overview.md) — SafeExpr and Action Guard integration
- [Architecture Overview](../architecture/overview.md) — system-level security design
