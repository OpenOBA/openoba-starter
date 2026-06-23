# API 概览

> OpenOBA Starter 后端 API 的认证方式、接口约定和 Swagger 入口

## API 基础信息

| 项 | 值 |
|----|-----|
| Base URL | `http://localhost:3400`（开发）/ `https://your-domain.com`（生产） |
| 协议 | HTTP/1.1 + WebSocket（Socket.io） |
| 数据格式 | JSON（`Content-Type: application/json`） |
| 字符集 | UTF-8 |
| 认证 | JWT Bearer Token |
| API 文档 | Swagger UI（开发模式 `http://localhost:3400/docs`） |

---

## 认证机制

OpenOBA 采用**双轨 JWT 认证**：

| 认证类型 | 适用对象 | 密钥环境变量 | 登录端点 | Token 头 |
|---------|---------|------------|---------|---------|
| 管理端认证 | 后台管理用户 | `JWT_SECRET` | `POST /auth/login` | `Authorization: Bearer <token>` |
| C 端认证 | 客户端客户 | `CUSTOMER_JWT_SECRET` | `POST /customer-auth/login` | `Authorization: Bearer <token>` |

两套认证完全独立：
- 不同密钥签发，互不通用
- 不同的 Guard 守卫（`JwtAuthGuard` vs `CustomerAuthGuard`）
- 不同的用户表（`sys_user` vs `customer`）

### 获取管理端 Token

```bash
curl -X POST http://localhost:3400/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

响应：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "username": "admin",
    "roles": ["admin"]
  }
}
```

### 使用 Token 调用 API

```bash
curl http://localhost:3400/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### 公开接口

部分接口无需认证（如健康检查、登录），通过 `@Public()` 装饰器标记：

```typescript
@Public()
@Get('health')
healthCheck() { ... }
```

---

## 统一响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [ ... ],
    "total": 100,
    "page": 1,
    "size": 10
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "参数错误：name 不能为空",
  "error": "Bad Request"
}
```

常见 HTTP 状态码：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 缺失或失效） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过频（限流） |
| 500 | 服务器内部错误 |

---

## 核心 API 模块

### 认证模块

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/login` | 管理端登录 | 公开 |
| GET | `/auth/profile` | 获取当前用户 | 管理 |
| POST | `/customer-auth/login` | C 端客户登录（短信验证码） | 公开 |

### 商品模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/products` | 分页查询商品（SPU） |
| POST | `/products` | 创建商品 |
| GET | `/products/:id` | 获取商品详情 |
| PUT | `/products/:id` | 更新商品 |
| DELETE | `/products/:id` | 删除商品 |
| GET | `/products/:id/skus` | 获取商品的 SKU 列表 |
| POST | `/products/:id/skus` | 创建 SKU |

### 客户模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/customers` | 分页查询客户 |
| POST | `/customers` | 创建客户 |
| GET | `/customers/:id` | 获取客户详情 |
| PUT | `/customers/:id` | 更新客户 |

### 订单模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/orders` | 分页查询订单 |
| POST | `/orders` | 创建订单 |
| GET | `/orders/:id` | 获取订单详情 |
| PUT | `/orders/:id/status` | 更新订单状态 |

### 库存模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/inventory` | 查询库存 |
| POST | `/inventory/adjust` | 库存调整 |
| GET | `/inventory/low-stock` | 低库存预警 |

### 售后模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/after-sales` | 查询售后单 |
| POST | `/after-sales` | 创建售后单 |
| PUT | `/after-sales/:id/status` | 更新售后状态 |

### 系统模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/system/users` | 用户管理 |
| GET | `/system/roles` | 角色管理 |
| GET | `/system/permissions` | 权限管理 |
| GET | `/system/menus` | 菜单管理 |
| GET | `/system/audit-logs` | 审计日志 |
| GET | `/system/deployment` | 部署信息 |

### ERDL 规则模块（Core）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/erdl/rules` | 查询规则 |
| POST | `/erdl/rules` | 创建规则 |
| PUT | `/erdl/rules/:id` | 更新规则 |
| POST | `/erdl/playground/execute` | Playground 执行规则 |
| GET | `/erdl/snapshots` | 规则快照 |

### Agent 任务模块（Core）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/eros/tasks` | 查询 Agent 任务 |
| POST | `/eros/tasks` | 创建 Agent 任务 |
| GET | `/eros/tasks/:id/cognitive-logs` | 任务认知日志 |
| GET | `/eros/report-targets` | 报告目标 |

### 健康检查

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/health` | 健康检查 | 公开 |

```bash
curl http://localhost:3400/health
# {"status":"ok","timestamp":"2026-06-23T06:00:00.000Z","version":"1.4.0-alpha9"}
```

---

## WebSocket 接口

AI 对话通过 Socket.io WebSocket 通信。

### 连接

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3400', {
  auth: { token: '你的JWT Token' }
});
```

### 核心事件

| 事件方向 | 事件名 | 说明 |
|---------|--------|------|
| 客户端 → 服务端 | `chat.message` | 发送对话消息 |
| 服务端 → 客户端 | `stream.thinking` | AI 思考过程（流式） |
| 服务端 → 客户端 | `stream.action` | AI 行动（流式） |
| 服务端 → 客户端 | `stream.observation` | AI 观察（流式） |
| 服务端 → 客户端 | `stream.done` | 流式结束 |
| 服务端 → 客户端 | `error` | 错误 |

### 示例：发送消息

```javascript
socket.emit('chat.message', {
  content: '帮我查一下库存低于 10 的镜架',
  agentCode: 'main-agent',
});
```

---

## 限流

为防止滥用，API 启用了限流：

| 模式 | 配置 | 适用 |
|------|------|------|
| Memory（默认） | 内存计数，重启失效 | 开发单机 |
| Redis | 共享计数，多实例一致 | 生产环境 |

限流触发时返回 `429 Too Many Requests`，响应头包含：

```
Retry-After: 60
```

登录端点有更严格的暴力破解防护（失败次数计数 + 锁定）。

---

## Swagger 文档

开发模式下访问 `http://localhost:3400/docs` 查看交互式 API 文档：

- 完整的端点列表
- 请求/响应 Schema
- 在线测试（支持带 Token 调用）
- 导出 OpenAPI JSON

> ⚠️ 生产环境建议关闭 Swagger（通过 `APP_ENV=production` 控制），避免暴露接口结构。

---

## 代码示例

### JavaScript / Node.js

```javascript
const baseURL = 'http://localhost:3400';

// 1. 登录获取 Token
const loginRes = await fetch(`${baseURL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
});
const { access_token } = await loginRes.json();

// 2. 调用业务 API
const productsRes = await fetch(`${baseURL}/products?page=1&size=10`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
const products = await productsRes.json();
console.log(products);
```

### cURL

```bash
# 登录并保存 Token
TOKEN=$(curl -s -X POST http://localhost:3400/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token')

# 查询商品
curl http://localhost:3400/products \
  -H "Authorization: Bearer $TOKEN"
```

---

## 下一步

- 📖 [架构总览](../architecture/overview.md) — 理解 API 背后的设计
- 📖 [后端模块清单](../architecture/module-list.md) — 每个模块的端点
- 📖 [安全架构](../security/security-architecture.md) — 认证授权细节
- 📖 [数据库 Schema](../database/schema.md) — 数据结构
