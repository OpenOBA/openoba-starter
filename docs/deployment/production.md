# 生产部署指南

> 把 OpenOBA Starter 部署到生产环境的完整步骤和检查清单

## 部署前检查清单

### 代码与构建

- [ ] 代码版本已锁定（使用 git tag 或 commit hash）
- [ ] `npm run build:backend` 编译成功
- [ ] 前端 `npm run build` 构建成功（产物在 `frontend/dist/`）
- [ ] 所有测试通过（`npm test`）
- [ ] ESLint 无错误（`npm run lint:all`）
- [ ] `npm audit` 无 high/critical 漏洞

### 环境配置

- [ ] `.env` 中所有密钥已替换为强随机字符串
- [ ] `JWT_SECRET` 和 `CUSTOMER_JWT_SECRET` 长度 ≥ 32 字符
- [ ] `APP_ENV=production`
- [ ] `OPENOBA_MODE=operator`
- [ ] `CORS_ORIGIN` 设置为生产域名
- [ ] 数据库密码为强密码
- [ ] Redis 已配置（生产推荐）

### 数据库

- [ ] MySQL 版本 ≥ 8.0
- [ ] 字符集 `utf8mb4`
- [ ] 已创建生产数据库
- [ ] 已完成初始化向导（建表 + 种子）
- [ ] 已修改 admin 默认密码
- [ ] 已配置数据库备份

### 基础设施

- [ ] 服务器 Node.js ≥ 18
- [ ] Nginx（或同类反向代理）已配置
- [ ] HTTPS 证书已配置
- [ ] 防火墙仅开放 80/443 端口
- [ ] 日志收集已配置

---

## 部署架构

### 推荐架构（单机）

```
                    ┌─────────────┐
                    │   用户浏览器  │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │    Nginx    │  ← 80/443
                    │  反向代理    │
                    └──┬───────┬──┘
                       │       │
            ┌──────────┘       └──────────┐
            ▼                              ▼
    ┌───────────────┐              ┌──────────────┐
    │  前端静态文件  │              │  Node.js 后端 │  ← 内网 :3400
    │  dist/        │              │  (PM2 管理)   │
    └───────────────┘              └──────┬───────┘
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                   ┌────────────┐  ┌────────────┐  ┌────────────┐
                   │   MySQL    │  │   Redis    │  │  LLM API   │
                   │   8.0      │  │  (限流缓存) │  │ (DeepSeek) │
                   └────────────┘  └────────────┘  └────────────┘
```

### 端口规划

| 服务 | 端口 | 暴露 |
|------|------|------|
| Nginx | 80, 443 | ✅ 公网 |
| Node.js 后端 | 3400 | ❌ 仅内网 |
| MySQL | 3306 | ❌ 仅本机 |
| Redis | 6379 | ❌ 仅本机 |

> ⚠️ 后端、MySQL、Redis 端口**绝不**对公网开放。仅 Nginx 的 80/443 暴露。

---

## 部署步骤

### 1. 服务器准备

```bash
# 安装 Node.js 20 LTS（推荐用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 安装 PM2（进程管理）
npm install -g pm2

# 安装 MySQL 8.0（Ubuntu/Debian 示例）
sudo apt update
sudo apt install mysql-server-8.0

# 安装 Redis（可选但推荐）
sudo apt install redis-server

# 安装 Nginx
sudo apt install nginx
```

### 2. 获取代码并构建

```bash
# 创建部署目录
sudo mkdir -p /opt/openoba
sudo chown $USER:$USER /opt/openoba
cd /opt/openoba

# 克隆代码（用特定 tag）
git clone --branch v1.4.0-alpha9 <repo-url> .
# 或：git clone <repo-url> . && git checkout v1.4.0-alpha9

# 安装依赖（生产依赖）
npm ci --omit=dev

# 编译后端
npm run build:backend

# 构建前端
cd frontend
npm ci
npm run build
cd ..
```

### 3. 配置环境变量

```bash
cp .env.example .env
vim .env
```

**生产环境 `.env` 关键配置**：

```ini
APP_ENV=production
APP_PORT=3400
OPENOBA_MODE=operator

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=openoba
DB_PASSWORD=强随机密码
DB_DATABASE=openoba_starter

# 用 node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 生成
JWT_SECRET=64位hex字符串
CUSTOMER_JWT_SECRET=另一个不同的64位hex字符串

CORS_ORIGIN=https://erp.yourcompany.com

REDIS_URL=redis://:redis密码@localhost:6379
```

> ⚠️ `.env` 文件权限设为 600：`chmod 600 .env`

### 4. 初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE openoba_starter DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 创建专用用户（不要用 root）
mysql -u root -p -e "CREATE USER 'openoba'@'localhost' IDENTIFIED BY '强随机密码'; GRANT ALL ON openoba_starter.* TO 'openoba'@'localhost'; FLUSH PRIVILEGES;"
```

启动后端，通过初始化向导完成建表和种子数据。

### 5. 配置 PM2 进程管理

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'openoba-backend',
    script: 'packages/backend/dist/main.js',
    cwd: '/opt/openoba',
    instances: 1,           // 单实例（多实例需 Redis 共享状态）
    autorestart: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/openoba/error.log',
    out_file: '/var/log/openoba/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
```

启动：

```bash
sudo mkdir -p /var/log/openoba
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 开机自启
```

### 6. 配置 Nginx

创建 `/etc/nginx/sites-available/openoba`：

```nginx
server {
    listen 80;
    server_name erp.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourcompany.com;

    # SSL 证书（用 certbot 申请 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/erp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourcompany.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 前端静态文件
    root /opt/openoba/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3400/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket（Socket.io）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3400;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;  # WebSocket 长连接
    }

    # 上传文件大小限制
    client_max_body_size 20M;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/openoba /etc/nginx/sites-enabled/
sudo nginx -t          # 测试配置
sudo systemctl reload nginx
```

### 7. 配置 HTTPS

```bash
# 用 certbot 申请 Let's Encrypt 免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d erp.yourcompany.com
```

### 8. 验证部署

```bash
# 健康检查
curl https://erp.yourcompany.com/api/health
# 应返回 {"status":"ok",...}

# 检查 PM2 状态
pm2 status

# 检查 Nginx 状态
sudo systemctl status nginx

# 检查日志
pm2 logs openoba-backend --lines 50
```

---

## 运维操作

### 更新版本

```bash
cd /opt/openoba
git fetch --tags
git checkout v1.4.1   # 新版本

npm ci --omit=dev
npm run build:backend
cd frontend && npm ci && npm run build && cd ..

pm2 reload openoba-backend
```

> ⚠️ 更新前备份数据库：`mysqldump -u root -p openoba_starter > backup_$(date +%Y%m%d).sql`

### 查看日志

```bash
# 实时日志
pm2 logs openoba-backend

# 错误日志
pm2 logs openoba-backend --err

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 数据库备份

```bash
# 手动备份
mysqldump -u root -p openoba_starter > /backup/openoba_$(date +%Y%m%d_%H%M%S).sql

# 定时备份（crontab）
crontab -e
# 添加：每天 3 点备份
0 3 * * * mysqldump -u root -pYOUR_PASSWORD openoba_starter | gzip > /backup/openoba_$(date +\%Y\%m\%d).sql.gz
```

### 性能监控

```bash
# PM2 监控面板
pm2 monit

# MySQL 连接数
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# Redis 状态
redis-cli info
```

---

## 安全加固清单

- [ ] `.env` 权限 600，且不提交到 Git
- [ ] admin 默认密码已修改
- [ ] MySQL 仅监听 127.0.0.1（`bind-address = 127.0.0.1`）
- [ ] Redis 已设置密码且仅监听 127.0.0.1
- [ ] 服务器 SSH 禁用密码登录，仅用密钥
- [ ] 防火墙仅开放 22/80/443
- [ ] HTTPS 已强制（HTTP 自动跳转）
- [ ] Swagger 在生产环境关闭（`APP_ENV=production` 自动关闭）
- [ ] 定期备份并验证可恢复
- [ ] LLM API Key 已配置并设置用量上限

---

## 故障排查

### 后端无法启动

```bash
pm2 logs openoba-backend --err --lines 100
```

常见原因：
- 数据库连接失败（检查 `.env` 的 DB 配置）
- 端口 3400 被占用（`lsof -i :3400`）
- 编译产物缺失（重新 `npm run build:backend`）

### 前端页面 502

```bash
# 检查后端是否运行
pm2 status
curl http://127.0.0.1:3400/health

# 检查 Nginx 配置
sudo nginx -t
```

### WebSocket 连接失败

检查 Nginx 的 `/socket.io/` 配置，确保 `Upgrade` 和 `Connection` 头正确传递。

### 数据库连接耗尽

```bash
mysql -u root -p -e "SHOW PROCESSLIST;"
# 检查连接数
mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

调大 `max_connections` 或排查连接泄漏。

---

## 下一步

- 📖 [安装指南](../getting-started/installation.md) — 开发环境安装
- 📖 [配置说明](../getting-started/configuration.md) — 环境变量详解
- 📖 [安全架构](../security/security-architecture.md) — 安全机制
- 📖 [数据库 Schema](../database/schema.md) — 数据库结构
