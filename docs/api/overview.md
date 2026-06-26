# API Overview

> RESTful API reference for OpenOBA backend.

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000` |
| Production | Configured host (behind reverse proxy) |

All API paths are relative to the base URL with the `/api` prefix.

---

## Authentication

Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Two auth tracks:

| Track | Endpoint | Token scope |
|-------|----------|-------------|
| **Admin** | `POST /api/auth/login` | Admin operations (system, CRUD, config) |
| **Customer** | `POST /api/customer-auth/login` | Customer-facing operations (orders, profile) |

Public endpoints (no auth required) are marked with `@Public()` decorator.

---

## Swagger Documentation

Auto-generated OpenAPI docs available at:

```
GET /api/docs
```

Includes all endpoints, request/response schemas, and authentication requirements. Updates automatically on server restart.

---

## Response Format

All responses are wrapped in a unified `ResponseDto`:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation result |
| `data` | any | Response payload (null on failure) |
| `message` | string | Human-readable message |

### Error Response

```json
{
  "success": false,
  "data": null,
  "message": "Invalid credentials",
  "error": "UNAUTHORIZED"
}
```

HTTP status codes follow REST conventions:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Pagination

List endpoints support cursor-style pagination via query parameters:

```
GET /api/product/sku?page=1&limit=20
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number (1-based) |
| `limit` | 20 | Items per page (max: 100) |

Response includes pagination metadata:

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## Endpoint Groups

### `/auth` — Admin Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Admin login (username + password) |
| `POST` | `/api/auth/logout` | Invalidate token |
| `GET` | `/api/auth/profile` | Current admin profile |

### `/system` — System Management (RBAC)

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/api/system/users` | Admin user management |
| CRUD | `/api/system/roles` | Role definitions |
| CRUD | `/api/system/permissions` | Permission definitions |
| CRUD | `/api/system/menus` | Navigation menu tree |
| `GET` | `/api/system/audit-logs` | Operation audit trail |
| `GET` | `/api/system/health` | Deployment health status |
| `POST` | `/api/system/wizard` | Onboarding wizard |

See [Module List](../architecture/module-list.md) for full RBAC details.

### `/product` — Product Management

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/api/product/spu` | SPU management |
| CRUD | `/api/product/sku` | SKU management (barcodes, pricing) |
| CRUD | `/api/product/sets` | Product sets/bundles |
| CRUD | `/api/product/categories` | Category tree |
| `GET` | `/api/product/pricing-tiers` | Tiered pricing rules |

### `/customer` — Customer Profiles

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/api/customers` | Customer profiles |
| `GET` | `/api/customers/:id/membership` | Membership tier info |
| `GET` | `/api/customers/:id/stats` | Consumption statistics |

### `/order` — Orders

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/api/orders` | Order management |
| `POST` | `/api/orders/:id/state` | State machine transition |
| `GET` | `/api/orders/:id/items` | Order line items |

### `/inventory` — Stock Management

| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/api/inventory` | Stock records |
| `POST` | `/api/inventory/transfer` | Stock transfer |
| `GET` | `/api/inventory/alerts` | Low stock alerts |
| `GET` | `/api/inventory/transactions` | Transaction history |

### `/eros` — Agent Chat (AI)

| Method | Path | Description |
|--------|------|-------------|
| WebSocket | `/chat` | Real-time streaming chat |
| `POST` | `/api/eros/tasks` | Create agent task |
| `GET` | `/api/eros/tasks` | List tasks |
| `GET` | `/api/eros/tasks/:id/logs` | Task cognitive logs |

### Additional Groups

- **`/customer-auth`** — Customer SMS login + JWT
- **`/after-sales`** — Returns, exchanges, refunds, repairs
- **`/review`** — Product reviews
- **`/upload`** — File upload (multer)
- **`/sms`** — Verification code (rate-limited)
- **`/dictionary`** — Data dictionary constants
- **`/color`** / **`/aesthetics`** / **`/structure`** — Eyewear domain data
- **`/draft-pool`** — AI-generated content staging
- **`/website`** — Website content management
- **`/health`** — Health check endpoint

See [Module List](../architecture/module-list.md) for the complete module tree.

---

## WebSocket (Real-time Streaming)

ERA-Chat uses Socket.IO 4 for real-time streaming of AI responses:

```
WebSocket: /chat
```

SSE event types streamed from the ReAct engine:

```
thought → tool_start → tool_end → observation → round_done → done
```

Each event includes a `taskId` for correlation. Room-based isolation ensures multi-user separation. Frontend uses the `useWsClient` composable for connection lifecycle management.

---

## Rate Limiting

| Mode | Backend |
|------|---------|
| Development | In-memory store |
| Production | Redis-backed (recommended) |

Default limits:

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 5 requests / minute |
| SMS verification | 1 request / minute per phone |
| General API | 100 requests / minute |

Controlled via `RateLimiterModule`. Redis is required for distributed deployments.

---

## Cross-Origin Resource Sharing (CORS)

CORS is configured per environment. In production, only whitelisted origins are allowed. Never expose the API to `*` in production.

---

## Further Reading

- [Architecture Overview](../architecture/overview.md)
- [Module List](../architecture/module-list.md)
- [Security Architecture](../security/security-architecture.md)
- [Production Deployment](../deployment/production.md)
