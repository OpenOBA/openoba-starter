# 安全架构

> OpenOBA Starter 的认证、授权、加密、限流、审计机制

## 安全设计原则

1. **纵深防御**：多层安全控制，单层失效不致全盘崩溃
2. **最小权限**：用户/服务只授予必要权限
3. **安全默认**：开箱即用即为安全配置（如 `synchronize: false`）
4. **不信任输入**：所有外部输入都校验、转义、参数化
5. **可审计**：关键操作记录审计日志

---

## 认证机制

### 双轨 JWT 认证

OpenOBA 采用管理端和 C 端分离的 JWT 认证：

```
┌─────────────────┐     ┌─────────────────────┐
│  管理端用户      │     │  C 端客户            │
│  (sys_user 表)  │     │  (customer 表)       │
└────────┬────────┘     └──────────┬──────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐     ┌─────────────────────┐
│  POST /auth/login│     │ POST /customer-auth/ │
│  JWT_SECRET 签发 │     │ login               │
│                 │     │ CUSTOMER_JWT_SECRET  │
└────────┬────────┘     └──────────┬──────────┘
         │                         │
         ▼                         ▼
┌─────────────────┐     ┌─────────────────────┐
│  JwtAuthGuard   │     │ CustomerAuthGuard   │
│  (管理端守卫)    │     │ (C 端守卫)           │
└─────────────────┘     └─────────────────────┘
```

**设计理由**：密钥分离，即使管理端 JWT 泄露，攻击者也无法伪造 C 端身份，反之亦然。

### 密码存储

- 算法：**bcrypt**（加盐哈希）
- 不存储明文、不使用 MD5/SHA1
- 密码不记入审计日志

### C 端短信验证码登录

- 验证码通过阿里云短信发送
- 验证码有时效（通常 5 分钟）
- 发送频率限制（防短信轰炸）
- 验证失败次数限制（防暴力破解）

---

## 授权机制

### RBAC 权限模型

```
用户(User) ──┬── 角色(Role) ──┬── 权限(Permission)
             │                 │
             └── 多对多关系     └── 对应 API 操作
```

- **用户**：`sys_user` 表，可关联多个角色
- **角色**：`sys_role` 表，可关联多个权限
- **权限**：`sys_permission` 表，对应具体 API 操作

### 权限控制实现

```typescript
// 装饰器标记所需角色
@Roles('admin', 'operator')
@Get('products')
findAll() { ... }

// RolesGuard 自动校验
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

### 公开接口

通过 `@Public()` 装饰器标记无需认证的接口：

```typescript
@Public()
@Get('health')
healthCheck() { ... }
```

---

## 加密机制

### LLM API Key 加密

LLM API Key 存储在 `sys_model_key` 表，使用 **PBKDF2** 加密：

- **算法**：PBKDF2 with SHA-256
- **迭代次数**：100,000 轮
- **Salt**：每个 Key 独立随机 salt
- **向后兼容**：解密时先试 V2（PBKDF2），失败回退 V1（单轮 SHA256）

> v1.4.0 已从单轮 SHA256 升级到 PBKDF2，提升暴力破解难度。

### 技能密钥保管

`eros_skill_key_vault` 表存储 AI 技能的密钥，同样使用 PBKDF2 加密。

### JWT 密钥

- 生产环境强制 ≥ 32 字符
- 启动时校验长度，不足则退出进程
- 推荐用 `crypto.randomBytes(32).toString('hex')` 生成

---

## 限流机制

### 双模式限流

| 模式 | 实现 | 适用场景 |
|------|------|---------|
| Memory | 内存 Map 计数 | 开发单机 |
| Redis | Redis 计数（共享） | 生产多实例 |

通过 `REDIS_URL` 配置自动切换。

### 限流策略

- **全局 API 限流**：防止接口滥用
- **登录限流**：防暴力破解（失败计数 + 锁定）
- **短信限流**：防短信轰炸（频率 + 日配额）

### 触发限流的响应

```
HTTP 429 Too Many Requests
Retry-After: 60
```

---

## 输入安全

### SQL 注入防护

- **TypeORM 参数化查询**：所有查询使用 QueryBuilder 或 Repository 方法
- **禁止字符串拼接 SQL**
- **LIKE 查询转义**：转义 `%`、`_`、`\` 特殊字符

```typescript
// ✅ 正确：参数化
repo.createQueryBuilder('p')
  .where('p.name LIKE :name', { name: `%${escapeLike(input)}%` })
  .getMany();

// ❌ 错误：字符串拼接
repo.query(`SELECT * FROM product WHERE name LIKE '%${input}%'`);
```

> v1.3.0 已修复 23 处 LIKE 未转义问题。

### XSS 防护

- **Helmet**：设置安全 HTTP 头（CSP、X-Frame-Options 等）
- **前端 DOMPurify**：渲染用户输入前过滤 XSS
- **后端不直接返回 HTML**：所有响应为 JSON

### 命令注入防护

- **`execFileSync`** 替代 `execSync`（参数分离，不经过 shell）
- **参数白名单校验**：如 git diff 的 mode 参数仅允许 `staged`/`unstaged`
- **路径白名单**：文件操作前校验 `resolve()` + `startsWith(root)`

> v1.4.0 已修复 `executeGitDiff` 命令注入（P0）和 `executeFileEdit` 路径穿越（P0）。

### SSRF 防护

- **URL 校验器**：`url-validator.ts` 拦截内网地址、IPv6 回环、链路本地地址
- 应用到所有 LLM 配置相关的 fetch 操作

> v1.4.0 已修复 SSRF（P0），提取公共 `validateFetchUrl` 函数。

### 随机数安全

- **`crypto.randomUUID()`** 替代 `Math.random()`（生成 UUID/Token）
- **`crypto.randomInt()`** 替代 `Math.random()`（生成随机数）

> v1.4.0 已修复 36 处 `Math.random()` 安全用法，0 残留。

---

## 安全 HTTP 头

通过 Helmet 中间件设置：

| 头 | 值 | 作用 |
|----|-----|------|
| `X-Content-Type-Options` | `nosniff` | 防 MIME 嗅探 |
| `X-Frame-Options` | `SAMEORIGIN` | 防点击劫持 |
| `X-XSS-Protection` | `1; mode=block` | XSS 过滤 |
| `Strict-Transport-Security` | `max-age=31536000` | 强制 HTTPS |
| `Content-Security-Policy` | 配置中 | 限制资源加载 |

---

## 审计日志

### 记录范围

`sys_audit_log` 表记录关键操作：

- 用户登录/登出
- 数据增删改（POST/PUT/DELETE）
- 权限变更
- 系统配置修改
- Agent 任务执行

### 日志内容

```json
{
  "userId": "操作者ID",
  "username": "操作者用户名",
  "action": "CREATE_PRODUCT",
  "method": "POST",
  "path": "/products",
  "ip": "客户端IP",
  "userAgent": "客户端UA",
  "requestBody": "请求体（脱敏后）",
  "statusCode": 200,
  "duration": 150,
  "createdAt": "2026-06-23T10:00:00Z"
}
```

> ⚠️ 密码、Token 等敏感字段在记录前脱敏。

---

## CORS 配置

```typescript
// 生产环境严格限制来源
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
```

> 生产环境 `CORS_ORIGIN` 必须设置为具体域名，不要用 `*`。

---

## 已修复的安全漏洞（v1.4.0）

### P0 级别

| 漏洞 | 修复 |
|------|------|
| `executeGitDiff` 命令注入 | `execSync` → `execFileSync` + mode 白名单 + 路径正则白名单 |
| `executeFileEdit` 路径穿越 | `resolve()` + `startsWith(projectRoot)` 边界校验 |
| SSRF | 提取 `validateFetchUrl`，拦截内网/IPv6 回环/链路本地 |
| Core 许可证头错误 | 36 个文件 `AGPL-3.0` → `BSL-1.1` |
| `Math.random()` 用于安全场景 | 36 处全部替换为 `crypto` API |

### P1 级别

| 漏洞 | 修复 |
|------|------|
| `expr-eval@2.0.2` 漏洞 | 自研 `SafeExpr` 安全表达式引擎 |
| 22 处静默 catch | 全部补齐 `logger.warn/debug` |
| Deployment 事务原子性 | 添加 `startTransaction/commit/rollback` |
| Vault Key 弱派生 | 单轮 SHA256 → PBKDF2 10万轮 + salt |
| JWT 弱密钥检测 | 启动时校验长度 |

---

## 安全最佳实践（部署时）

1. **生产环境**：
   - `APP_ENV=production`（关闭 Swagger、调试工具）
   - `OPENOBA_MODE=operator`（隐藏开发态功能）
   - 配置 Redis 限流
   - Nginx 配置 HTTPS + 安全头
   - 数据库专用用户（非 root）

2. **密钥管理**：
   - JWT_SECRET、CUSTOMER_JWT_SECRET 用强随机字符串
   - 不要把 `.env` 提交到 Git
   - 定期轮换密钥

3. **监控**：
   - 监控审计日志异常
   - 监控登录失败次数
   - 监控 API 限流触发
   - 监控 LLM Token 异常消耗

---

## 漏洞报告

发现安全漏洞？请按 [安全策略](../../SECURITY.md) 报告：

- **邮箱**：postmaster@openoba.com
- **SLA**：24 小时内确认，7 工作日内初步评估
- **Safe Harbor**：善意安全研究受保护
- **CVE**：通过 GitHub Security Advisories 分配

> ⚠️ **请勿在公开 Issue / Discussion / PR 中报告安全漏洞。**

## 延伸阅读

- [安全策略](../../SECURITY.md) — 漏洞报告流程
- [编码标准 - 安全编码](../development/coding-standards.md#安全编码) — 安全代码规范
- [生产部署 - 安全加固](../deployment/production.md#安全加固清单) — 部署安全清单
- [安全应急手册](../SECURITY-RUNBOOK.md) — 24h 应急响应
