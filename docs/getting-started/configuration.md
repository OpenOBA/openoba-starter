# 配置说明

> 所有环境变量和系统配置项的完整说明

## 配置文件位置

OpenOBA Starter 使用 `.env` 文件管理环境变量：

| 文件 | 用途 | 是否提交到 Git |
|------|------|---------------|
| `.env.example` | 配置模板 | ✅ 是（供参考） |
| `.env` | 实际配置 | ❌ 否（已 gitignore） |

> ⚠️ **永远不要把真实的 `.env` 提交到版本库**。`.env` 已在 `.gitignore` 中排除。

## 快速开始

```bash
cp .env.example .env
# 编辑 .env，至少修改 DB_PASSWORD 和 JWT_SECRET
```

---

## 环境变量详解

### 应用环境

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `APP_ENV` | 否 | `development` | 应用环境：`development` / `staging` / `production`。控制功能开关（如开发模式显示调试工具） |
| `APP_PORT` | 否 | `3400` | 后端 API 服务端口 |

> **注意**：`APP_ENV` 是 OpenOBA 应用层变量，与 Node.js 的 `NODE_ENV` 不同。`NODE_ENV` 由工具链自动设置，不需要在 `.env` 中配置。

### 部署模式

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DEPLOYMENT_MODE` | 否 | `operator` | 部署模式：`operator`（运营）/ `developer`（开发）/ `maintainer`（维护） |
| `OPENOBA_MODE` | 否 | `operator` | v1.3.0 新增统一别名，**优先于** `DEPLOYMENT_MODE` |

三种模式区别：

| 模式 | 适用场景 | 显示内容 |
|------|---------|---------|
| `operator` | 生产环境 | 仅业务功能，隐藏开发态工具 |
| `developer` | 本地开发 | 显示调试工具、Swagger、Meta-Mirror 诊断 |
| `maintainer` | 运维排查 | 显示系统诊断、Entity 同步检查 |

### 数据库（MySQL）

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DB_HOST` | 是 | `localhost` | MySQL 主机地址 |
| `DB_PORT` | 否 | `3306` | MySQL 端口 |
| `DB_USERNAME` | 是 | - | MySQL 用户名 |
| `DB_PASSWORD` | 是 | - | MySQL 密码 |
| `DB_DATABASE` | 是 | `openoba_starter` | 数据库名 |

**连接池配置**（在 `app.module.ts` 中硬编码，如需修改需改代码）：

```typescript
extra: {
  connectionLimit: 50,        // 最大连接数
  connectTimeout: 10000,      // 连接超时（毫秒）
  waitForConnections: true,   // 连接耗尽时等待
  queueLimit: 0,              // 等待队列长度（0 = 不限）
}
```

**字符集**：强制 `utf8mb4`（支持 emoji 和生僻字），不可配置。

### JWT 认证

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | 是 | - | 管理端 JWT 签名密钥，**至少 32 字符** |
| `CUSTOMER_JWT_SECRET` | 是 | - | C 端客户 JWT 签名密钥（与管理端分离），**至少 32 字符** |

> ⚠️ **生产环境必须更换为强随机字符串**。生成方式：
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

OpenOBA 采用**双轨 JWT 认证**：
- 管理端用户用 `JWT_SECRET` 签发
- C 端客户用 `CUSTOMER_JWT_SECRET` 签发
- 两套密钥独立，即使一个泄露也不影响另一个

### CORS

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `CORS_ORIGIN` | 否 | `http://localhost:5173` | 允许的前端来源，多个用逗号分隔 |

生产环境示例：
```ini
CORS_ORIGIN=https://erp.yourcompany.com,https://admin.yourcompany.com
```

### Redis（可选）

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `REDIS_URL` | 否 | - | Redis 连接地址。不配置时使用内存限流 |

```ini
REDIS_URL=redis://localhost:6379
# 带密码
REDIS_URL=redis://:password@localhost:6379
```

**何时需要 Redis**：
- 生产环境（内存限流重启后失效）
- 多实例部署（限流需要共享状态）
- 高并发场景（内存限流性能不如 Redis）

### 阿里云短信（可选）

| 变量 | 必填 | 说明 |
|------|------|------|
| `ALIYUN_SMS_ACCESS_KEY_ID` | 启用短信时必填 | 阿里云 AccessKey ID |
| `ALIYUN_SMS_ACCESS_KEY_SECRET` | 启用短信时必填 | 阿里云 AccessKey Secret |
| `ALIYUN_SMS_SIGN_NAME` | 启用短信时必填 | 短信签名 |
| `ALIYUN_SMS_TEMPLATE_CODE_LOGIN` | 启用短信时必填 | 登录验证码模板 ID |

> 用于 C 端客户手机验证码登录。不配置则短信功能不可用，但不影响系统其他功能。

### CDN（可选）

| 变量 | 必填 | 说明 |
|------|------|------|
| `CDN_BASE_URL` | 否 | CDN 域名，用于图片等静态资源 URL 替换 |

---

## 完整 `.env` 示例

```ini
# ---------- 应用环境 ----------
APP_ENV=production
APP_PORT=3400

# ---------- 部署模式 ----------
OPENOBA_MODE=operator

# ---------- 数据库 ----------
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=openoba
DB_PASSWORD=一个强密码
DB_DATABASE=openoba_starter

# ---------- JWT（生产环境用强随机字符串） ----------
JWT_SECRET=用node命令生成的64位hex字符串
CUSTOMER_JWT_SECRET=另一个不同的64位hex字符串

# ---------- CORS ----------
CORS_ORIGIN=https://erp.yourcompany.com

# ---------- Redis（生产推荐） ----------
REDIS_URL=redis://:redis密码@localhost:6379

# ---------- 阿里云短信 ----------
ALIYUN_SMS_ACCESS_KEY_ID=your_key
ALIYUN_SMS_ACCESS_KEY_SECRET=your_secret
ALIYUN_SMS_SIGN_NAME=秒镜科技
ALIYUN_SMS_TEMPLATE_CODE_LOGIN=SMS_123456789
```

---

## 环境变量优先级

OpenOBA 使用 `@nestjs/config` 加载配置，优先级从高到低：

1. **进程环境变量**（`process.env.XXX`）— 如 Docker `-e` 或 systemd `Environment=`
2. **`.env` 文件** — 项目根目录
3. **代码默认值** — `configService.get('KEY', defaultValue)`

> 💡 生产环境推荐用进程环境变量注入敏感信息，`.env` 文件仅作 fallback。

## 配置验证

后端启动时会校验关键配置：

| 变量 | 校验规则 | 启动失败行为 |
|------|---------|------------|
| `DB_USERNAME` | `getOrThrow`，必须存在 | 启动报错 |
| `DB_PASSWORD` | `getOrThrow`，必须存在 | 启动报错 |
| `DB_DATABASE` | `getOrThrow`，必须存在 | 启动报错 |
| `JWT_SECRET` | 生产环境检查长度 | 长度不足时退出进程 |

## LLM API Key 配置（特殊）

LLM API Key **不通过 `.env` 配置**，而是在系统内配置：

1. 登录系统
2. 进入 **ERA-Chat → 设置 → API Key**
3. 添加 Provider 的 Key（DeepSeek / Qwen / OpenAI 等）

API Key 存储在数据库 `sys_model_key` 表中，使用 PBKDF2 加密。这样设计是因为：
- 支持多 Key 轮询和负载均衡
- 运行时可切换，无需重启
- 支持按 Agent 分配不同 Key

---

## 下一步

- 📖 [安装指南](./installation.md) — 完整安装步骤
- 📖 [生产部署](../deployment/production.md) — 生产环境配置清单
- 📖 [安全架构](../security/security-architecture.md) — 密钥管理机制
