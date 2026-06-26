# API 概览

> OpenOBA 后端 RESTful API 参考文档。

---

## 基础 URL

| 环境 | URL |
|------|-----|
| 开发 | `http://localhost:3000` |
| 生产 | 配置的域名（通过反向代理） |

所有 API 路径均以 `/api` 为前缀。

---

## 认证

在 `Authorization` 头中携带 Bearer Token：

```
Authorization: Bearer <jwt_token>
```

双轨认证：

| 轨道 | 端点 | Token 范围 |
|------|------|-----------|
| **管理员** | `POST /api/auth/login` | 管理操作（系统、CRUD、配置） |
| **客户** | `POST /api/customer-auth/login` | 客户操作（订单、个人资料） |

标记 `@Public()` 装饰器的端点无需认证。

---

## Swagger 文档

自动生成的 OpenAPI 文档：

```
GET /api/docs
```

包含所有端点、请求/响应 Schema 和认证要求。服务重启后自动更新。

---

## 响应格式

所有响应均使用统一的 `ResponseDto` 包装：

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| `success` | boolean | 操作结果 |
| `data` | any | 响应负载（失败时为 null） |
| `message` | string | 人类可读消息 |

### 错误响应

```json
{
  "success": false,
  "data": null,
  "message": "凭证无效",
  "error": "UNAUTHORIZED"
}
```

HTTP 状态码遵循 REST 约定：

| 状态码 | 含义 |
|--------|------|
| `200` | 成功 |
| `201` | 已创建 |
| `400` | 请求错误（验证失败） |
| `401` | 未授权（缺少/无效 Token） |
| `403` | 禁止访问（权限不足） |
| `404` | 未找到 |
| `429` | 请求频率超限 |
| `500` | 内部服务器错误 |

---

## 分页

列表端点通过查询参数支持分页：

```
GET /api/product/sku?page=1&limit=20
```

| 参数 | 默认值 | 描述 |
|------|--------|------|
| `page` | 1 | 页码（从 1 开始） |
| `limit` | 20 | 每页条数（最大 100） |

响应包含分页元数据：

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

## 端点分组

### `/auth` — 管理员认证

| 方法 | 路径 | 描述 |
|------|------|------|
| `POST` | `/api/auth/login` | 管理员登录（用户名 + 密码） |
| `POST` | `/api/auth/logout` | 使 Token 失效 |
| `GET` | `/api/auth/profile` | 当前管理员资料 |

### `/system` — 系统管理（RBAC）

| 方法 | 路径 | 描述 |
|------|------|------|
| CRUD | `/api/system/users` | 管理员用户管理 |
| CRUD | `/api/system/roles` | 角色定义 |
| CRUD | `/api/system/permissions` | 权限定义 |
| CRUD | `/api/system/menus` | 导航菜单树 |
| `GET` | `/api/system/audit-logs` | 操作审计日志 |
| `GET` | `/api/system/health` | 部署健康状态 |
| `POST` | `/api/system/wizard` | 引导式配置向导 |

完整 RBAC 详情见 [模块列表](../architecture/module-list.zh-CN.md)。

### `/product` — 商品管理

| 方法 | 路径 | 描述 |
|------|------|------|
| CRUD | `/api/product/spu` | SPU 管理 |
| CRUD | `/api/product/sku` | SKU 管理（条形码、定价） |
| CRUD | `/api/product/sets` | 商品套装/捆绑 |
| CRUD | `/api/product/categories` | 分类树 |
| `GET` | `/api/product/pricing-tiers` | 阶梯定价规则 |

### `/customer` — 客户档案

| 方法 | 路径 | 描述 |
|------|------|------|
| CRUD | `/api/customers` | 客户档案 |
| `GET` | `/api/customers/:id/membership` | 会员等级信息 |
| `GET` | `/api/customers/:id/stats` | 消费统计 |

### `/order` — 订单

| 方法 | 路径 | 描述 |
|------|------|------|
| CRUD | `/api/orders` | 订单管理 |
| `POST` | `/api/orders/:id/state` | 状态机流转 |
| `GET` | `/api/orders/:id/items` | 订单明细 |

### `/inventory` — 库存管理

| 方法 | 路径 | 描述 |
|------|------|------|
| CRUD | `/api/inventory` | 库存记录 |
| `POST` | `/api/inventory/transfer` | 库存调拨 |
| `GET` | `/api/inventory/alerts` | 低库存告警 |
| `GET` | `/api/inventory/transactions` | 库存交易历史 |

### `/eros` — Agent 对话（AI）

| 方法 | 路径 | 描述 |
|------|------|------|
| WebSocket | `/chat` | 实时流式对话 |
| `POST` | `/api/eros/tasks` | 创建 Agent 任务 |
| `GET` | `/api/eros/tasks` | 任务列表 |
| `GET` | `/api/eros/tasks/:id/logs` | 任务认知日志 |

### 其他分组

- **`/customer-auth`** — 客户短信登录 + JWT
- **`/after-sales`** — 退货、换货、退款、维修
- **`/review`** — 商品评价
- **`/upload`** — 文件上传（multer）
- **`/sms`** — 验证码（限速）
- **`/dictionary`** — 数据字典常量
- **`/color`** / **`/aesthetics`** / **`/structure`** — 眼镜领域数据
- **`/draft-pool`** — AI 生成内容暂存区
- **`/website`** — 网站内容管理
- **`/health`** — 健康检查端点

完整模块树见 [模块列表](../architecture/module-list.zh-CN.md)。

---

## WebSocket（实时流式）

ERA-Chat 使用 Socket.IO 4 流式传输 AI 响应：

```
WebSocket: /chat
```

ReAct 引擎推送的 SSE 事件类型：

```
thought → tool_start → tool_end → observation → round_done → done
```

每个事件包含 `taskId` 用于关联。基于 Room 的多用户隔离。前端使用 `useWsClient` 组合式函数管理连接生命周期。

---

## 速率限制

| 模式 | 后端 |
|------|------|
| 开发 | 内存存储 |
| 生产 | Redis 存储（推荐） |

默认限制：

| 端点 | 限制 |
|------|------|
| 认证端点 | 5 次/分钟 |
| 短信验证码 | 1 次/分钟（每手机号） |
| 通用 API | 100 次/分钟 |

通过 `RateLimiterModule` 控制。分布式部署需要 Redis。

---

## 跨域资源共享（CORS）

CORS 按环境配置。生产环境仅允许白名单源。切勿在生产环境将 API 暴露给 `*`。

---

## 延伸阅读

- [架构概览](../architecture/overview.zh-CN.md)
- [模块列表](../architecture/module-list.zh-CN.md)
- [安全架构](../security/security-architecture.zh-CN.md)
- [生产部署](../deployment/production.zh-CN.md)
