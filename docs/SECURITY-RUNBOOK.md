# OpenOBA Starter — 24h 应急响应 Runbook

> 版本：V1.0 · 2026-06-11
> 适用范围：OpenOBA Starter 生产部署
> 目标：关键漏洞/安全事故 24 小时内响应

---

## 紧急联系方式

| 角色 | 渠道 | 说明 |
|------|------|------|
| 安全报告 | support@openoba.com | PGP: 待发布 |
| 社区 | GitHub Issues | 非紧急问题 |
| 维护者 | GitHub CODEOWNERS | 代码级安全问题 |

## 漏洞严重度分级

| 等级 | 响应时间 | 修复时间 | 示例 |
|------|----------|----------|------|
| **Critical** | 2h | 24h | RCE、认证绕过、数据泄露 |
| **High** | 6h | 7d | SQLi、XSS、敏感信息暴露 |
| **Moderate** | 24h | 30d | DoS、信息泄露（非敏感） |
| **Low** | 7d | 90d | 理论攻击向量 |

## 应急流程

### 1. 发现漏洞（T+0h）

```
□ 确认漏洞真实性和影响范围
□ 在 GitHub Security Advisory 创建私密报告
□ 通知 Henry + 维护者
```

### 2. 临时缓解（T+2h）

```
□ 评估是否可热修复（配置/防火墙/WAF 规则）
□ 如需下线 → 通知用户 + 维护模式公告
□ 创建 mitigation commit
```

### 3. 根本修复（T+24h）

```
□ 开发修复补丁
□ CI 全量测试通过
□ Code review（至少一人）
□ 发布补丁版本 + CVE（如适用）
```

### 4. 事后复盘

```
□ Root cause analysis 文档
□ 更新测试用例（防回归）
□ 更新本 Runbook
```

## 监控指标（7 项）

| # | 指标 | 阈值 | 告警渠道 |
|---|------|------|----------|
| 1 | API 错误率 | > 5% / 5min | 日志 |
| 2 | P99 响应时间 | > 2000ms | 日志 |
| 3 | 数据库连接池使用率 | > 80% | 日志 |
| 4 | 认证失败率 | > 20% / 5min | 日志 |
| 5 | 文件上传异常 | > 10 / 5min | 日志 |
| 6 | 内存使用率 | > 85% | 系统 |
| 7 | 磁盘使用率 | > 90% | 系统 |

## 关键安全配置检查清单

```
□ JWT_SECRET 强度 ≥ 256-bit
□ APP_ENV=production 时 Swagger 禁用
□ CORS origin 白名单（非 *）
□ helmet 安全头启用
□ rate-limit 启用（Redis 模式）
□ SQL 日志不输出到生产日志
□ .env / .env.local / .env.production 在 .gitignore 中
□ 生产数据库密码 ≠ 开发密码
```

---

> 本文件随版本迭代持续更新。发现安全漏洞请发送至 support@openoba.com
