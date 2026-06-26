# 生产部署

> OpenOBA 生产环境部署指南。

---

## 部署模式

生产环境设置 `OPENOBA_MODE=operator`。此模式隐藏开发/调试功能并启用生产级防护。

| 模式 | 用途 |
|------|------|
| `operator` | **生产环境** — 隐藏开发功能，启用所有防护 |
| `developer` | 本地开发 — 调试工具、自动重载 |
| `maintainer` | 诊断 — 暴露系统内部 |

---

## 生产部署检查清单

### 部署前

- [ ] `.env` 文件已配置（绝不提交——已被 `.gitignore` 排除）
- [ ] `NODE_ENV=production` 已设置
- [ ] `OPENOBA_MODE=operator` 已设置
- [ ] JWT 密钥已从默认值轮换
- [ ] LLM API 密钥已配置
- [ ] 数据库连接串已设置（生产凭证）
- [ ] Redis 连接串已设置（用于速率限制）
- [ ] CORS 白名单已配置（禁止 `*`）
- [ ] 已运行 `npm ci --production`（无 devDependencies）
- [ ] `npm run build:backend` 通过，0 错误
- [ ] `npm test` 全部通过

### 安全

- [ ] 已启用 HTTPS（Nginx 或负载均衡器 TLS 终端）
- [ ] 防火墙：仅 80、443 端口对外公开；3000 端口仅限本地访问
- [ ] Helmet 中间件已启用（安全响应头）
- [ ] 速率限制已激活（Redis 后端）
- [ ] JWT 过期时间 ≤ 2 小时，带刷新机制
- [ ] 密码哈希：Argon2id（首选）或 bcrypt（cost ≥ 12）
- [ ] CORS 已限制到特定源

### 数据库

- [ ] MySQL 8.0 已安装并配置
- [ ] 数据库字符集：`utf8mb4`
- [ ] TypeORM 配置中 `synchronize: false`
- [ ] 连接池：`connectionLimit: 50`
- [ ] 初始 Schema 已加载：`database/init-structure.sql`
- [ ] 已配置自动备份（见备份部分）
- [ ] 数据库用户仅拥有最小必要权限（应用用户无 DROP/ALTER）

### 基础设施

- [ ] 已安装 SSL 证书（Let's Encrypt / 商业证书）
- [ ] 已配置 Nginx 反向代理（见下文）
- [ ] PM2 进程管理器已安装并配置
- [ ] 日志轮转已配置
- [ ] 监控：`/health` 端点内部可达

---

## Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持 /chat
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 前端静态文件
    location / {
        root /var/www/openoba/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 健康检查（仅内部）
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        allow 127.0.0.1;
        deny all;
    }
}
```

---

## 进程管理（PM2）

### 生态配置（`ecosystem.config.js`）

```javascript
module.exports = {
  apps: [{
    name: 'openoba-backend',
    script: 'dist/main.js',
    cwd: '/opt/openoba/packages/backend',
    instances: 'max',          // 自动扩展到 CPU 核心数
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      OPENOBA_MODE: 'operator'
    },
    max_memory_restart: '1G',
    error_file: '/var/log/openoba/error.log',
    out_file: '/var/log/openoba/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

### PM2 命令

```bash
pm2 start ecosystem.config.js --env production
pm2 save                       # 持久化进程列表
pm2 startup                    # 开机自启
pm2 logs openoba-backend       # 查看日志
pm2 restart openoba-backend    # 零停机重启
pm2 monit                      # 实时监控
```

---

## 数据库：备份策略

### 自动备份

```bash
#!/bin/bash
# /opt/openoba/scripts/backup.sh
BACKUP_DIR="/var/backups/openoba"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u openoba_backup -p'${DB_PASSWORD}' \
  --single-transaction \
  --routines \
  --triggers \
  --databases openoba \
  | gzip > "${BACKUP_DIR}/openoba_${DATE}.sql.gz"

# 保留最近 30 天
find "${BACKUP_DIR}" -name "openoba_*.sql.gz" -mtime +30 -delete
```

### 定时任务（cron）

```
0 2 * * * /opt/openoba/scripts/backup.sh
```

### 恢复

```bash
gunzip -c openoba_20260625_020000.sql.gz | mysql -u root -p openoba
```

备份文件应静态加密存储（AES-256）并存放于服务器外。

---

## Redis 配置

生产速率限制必需，推荐用于会话存储：

```bash
# 安装
apt install redis-server

# 安全配置
redis-cli CONFIG SET requirepass "${REDIS_PASSWORD}"
redis-cli CONFIG SET bind 127.0.0.1

# 验证
redis-cli -a "${REDIS_PASSWORD}" ping
```

在 `.env` 中配置：

```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
```

---

## SSL/TLS 配置

### Let's Encrypt（推荐）

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
# 自动续期已自动配置
```

### 手动证书

放置证书文件并在 Nginx 中配置（见上方 Nginx 配置）。

---

## 监控

### 健康端点

```
GET /health
```

返回服务状态、数据库连通性和内存使用情况。配置外部监控（Uptime Kuma、Pingdom）每 60 秒轮询此端点。

### 日志文件

| 日志 | 位置 |
|------|------|
| 应用日志 | `/var/log/openoba/out.log` |
| 错误日志 | `/var/log/openoba/error.log` |
| Nginx 访问 | `/var/log/nginx/access.log` |
| Nginx 错误 | `/var/log/nginx/error.log` |
| MySQL 慢查询 | `/var/log/mysql/mysql-slow.log` |

### 日志轮转

```
/var/log/openoba/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

---

## 安全加固

| 措施 | 配置 |
|------|------|
| Helmet | `app.use(helmet())` — CSP、HSTS、X-Frame-Options |
| CORS | `app.enableCors({ origin: ['https://your-domain.com'] })` |
| 速率限制 | Redis 后端，按 IP 和端点 |
| CSRF | 无状态 JWT API 不需要 |
| 输入验证 | 所有 DTO 使用 Zod + class-validator |
| SQL 注入 | 仅参数化查询（TypeORM） |
| XSS | 前端模板输出编码 |

---

## 密钥管理

- `.env` 通过 `.gitignore` 排除于 Git
- 绝不记录密钥、Token 或密钥到日志
- 所有密钥每 90 天轮换
- 使用 `openssl rand -hex 32` 生成新 JWT 密钥
- 备份加密密钥与备份文件分开存储

---

## 回滚流程

如果部署导致问题，执行 7 步回滚：

```bash
# 1. Git：回退到最后一个已知正常提交
git checkout <stable-commit>

# 2. 构建：重新构建
npm ci --production && npm run build:backend

# 3. 测试：验证
npm test

# 4. 重启：PM2 零停机重启
pm2 reload openoba-backend

# 5. 验证：检查 /health 端点
curl http://127.0.0.1:3000/health

# 6. 监控：观察日志 15 分钟
pm2 logs openoba-backend --lines 100

# 7. 数据库：如需则从备份恢复
#    gunzip -c backup.sql.gz | mysql -u root -p openoba
```

---

## 延伸阅读

- [安全架构](../security/security-architecture.zh-CN.md)
- [安全策略](/SECURITY.md)（仓库根目录）
- [安装指南](../getting-started/installation.md)
- [环境配置](../development/environment-setup.md)
