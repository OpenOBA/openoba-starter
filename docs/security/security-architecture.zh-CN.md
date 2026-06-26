# 安全架构

> OpenOBA 如何保护数据、身份和执行。

---

## 认证

### 双轨 JWT

| 轨道 | 用途 | 密钥 |
|------|------|------|
| **管理员** | 管理面板、系统配置、CRUD | `JWT_SECRET` |
| **客户** | 客户侧 API（订单、个人资料） | `CUSTOMER_JWT_SECRET` |

独立密钥确保被攻破的客户 Token 无法访问管理员功能。

### 密码哈希

- **首选**：Argon2id（内存密集型，抗 GPU 破解）
- **备选**：bcrypt，cost ≥ 12
- 明文密码从不存储
- 输入时进行密码验证（最小长度、复杂度）

---

## 授权 — RBAC

基于角色的访问控制，三个层次：

```
sys_user ──▶ sys_role ──▶ sys_permission ──▶ sys_menu
  (用户)      (角色)       (资源+操作)         (UI 可见性)
```

| 层次 | 功能 |
|------|------|
| **角色** | 命名权限集（admin、operator、viewer） |
| **权限** | 资源 + 操作对（如 `product:create`、`order:read`） |
| **菜单** | UI 可见性 — 用户只能看到其角色允许的菜单项 |

通过 `RolesGuard` 在每个受保护的端点上强制执行。`@Roles()` 装饰器指定每个处理程序所需的角色。

---

## Action Guard — 三层验证

每个 LLM 生成的操作在接触任何系统之前必须通过三层验证：

```
格式 ──▶ 规则 ──▶ 权限
 (L1)     (L2)     (L3)
```

| 层次 | 检查内容 |
|------|---------|
| **格式** | 意图解析器：四格式自适应解析（FC > JSON > XML > 文本）。无论格式如何漂移，确保 LLM 输出结构有效。 |
| **规则** | 操作验证器：三层检查 — 定义存在 → 别名映射正确 → 所有必填字段已填充。交叉引用 ERDL 规则。 |
| **权限** | RBAC 执行：执行用户/Agent 是否有此操作的权限？ |

开发环境可通过 `ERDL_ACTION_GUARD=false` 关闭 Action Guard，但**绝不可**在生产环境中这样做。

---

## SafeExpr — 表达式引擎

ERDL 规则使用的自研递归下降表达式解析器：

- **零代码注入风险** — 无 `eval()`，无 `new Function()`
- **白名单运算符** — 算术、比较、逻辑、成员关系
- **优雅降级** — 无效表达式返回清晰错误
- **常量折叠** — 在解析时预计算静态表达式

因已知漏洞（GHSA-8gw3-rxh4-v6jx、GHSA-jc85-fpwf-qm7x）替换了 `expr-eval@2.0.2`。

---

## 数据库安全

- **仅参数化查询** — 所有 TypeORM 操作使用参数绑定
- **无 LLM 原始 SQL** — ERDL 在执行前验证所有规则
- **连接池** — 最大 50 连接，配置空闲超时
- **数据库凭证** — 与应用凭证分离
- **最小权限** — 生产环境应用用户无 DROP/ALTER 权限

---

## 检查点 + 回滚

部署或配置问题的七步回滚流程：

| 步骤 | 操作 |
|------|------|
| 1 | **Git** — `git checkout <stable-commit>` |
| 2 | **构建** — `npm ci --production && npm run build:backend` |
| 3 | **测试** — `npm test` |
| 4 | **重启** — `pm2 reload openoba-backend`（零停机） |
| 5 | **验证** — `curl /health` |
| 6 | **监控** — 观察日志 15 分钟 |
| 7 | **数据库** — 如需则从加密备份恢复 |

每个 ReAct 步骤均在 `cognitive_log` 中检查点化，用于审计和回滚参考。

---

## 审计日志

每个 ReAct 执行步骤均记录在 `cognitive_log` 中：

| 字段 | 内容 |
|------|------|
| `taskId` | 任务关联 ID |
| `step` | Thought / Tool-Start / Tool-End / Observation |
| `tool` | 调用的技能/工具名称 |
| `input` | 工具输入参数（已清洗） |
| `output` | 工具输出（大结果时截断） |
| `timestamp` | ISO 8601 |
| `status` | success / failure / intercepted |

生产环境中审计日志应保留 ≥ 180 天。可集成 SIEM（Splunk / ELK）进行集中监控。

---

## 技能密钥库

技能认证密钥使用 PBKDF2 哈希存储：

| 属性 | 值 |
|------|-----|
| 算法 | PBKDF2 |
| 盐 | 每密钥随机盐 |
| 迭代次数 | 100,000+ |
| 存储 | `skill_key` 表，仅存储哈希值 |

密钥绝不记录日志或在 API 响应中返回。建议每 90 天轮换。

---

## 网络安全

| 层次 | 防护 |
|------|------|
| **CORS** | 生产环境仅允许白名单源 |
| **Helmet** | CSP、HSTS、X-Content-Type-Options、X-Frame-Options、Referrer-Policy |
| **速率限制** | Redis 后端，按 IP 和端点（详见 [API 概览](../api/overview.zh-CN.md)） |
| **TLS** | Nginx 反向代理 TLS 1.2+ |
| **防火墙** | 仅 80/443 公开；3000 端口仅限本地访问 |

---

## 密钥管理

| 实践 | 详情 |
|------|------|
| `.env` 排除 | 从不提交（`.gitignore`、CI 密钥扫描） |
| 密钥轮换 | 生产环境所有密钥每 90 天轮换 |
| 生成 | 使用 `openssl rand -hex 32` 生成新密钥 |
| 清除 | 轮换时从 Git 历史中清除旧密钥 |
| 不记录 | 密钥、Token 和密码绝不出现在日志中 |

---

## 延伸阅读

- [安全策略](/SECURITY.md) — 漏洞报告、SLA、安全港
- [API 概览](../api/overview.zh-CN.md) — 认证端点和 Token 约定
- [生产部署](../deployment/production.zh-CN.md) — 安全加固检查清单
- [ERDL 协议](../erdl/overview.zh-CN.md) — SafeExpr 和 Action Guard 集成
- [架构概览](../architecture/overview.zh-CN.md) — 系统级安全设计
