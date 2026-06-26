# Production Deployment

> Guide for deploying OpenOBA in production.

---

## Deployment Mode

Set `OPENOBA_MODE=operator` in production. This hides development/debug features and enables production-only safeguards.

| Mode | Purpose |
|------|---------|
| `operator` | **Production** — hide dev features, enable all guards |
| `developer` | Local development — debug tools, auto-reload |
| `maintainer` | Diagnostics — system internals exposed |

---

## Production Checklist

### Pre-deployment

- [ ] `.env` file configured (never committed — excluded by `.gitignore`)
- [ ] `NODE_ENV=production` set
- [ ] `OPENOBA_MODE=operator` set
- [ ] JWT secret rotated from default
- [ ] LLM API keys configured
- [ ] Database connection string set (production credentials)
- [ ] Redis connection string set (for rate limiting)
- [ ] CORS whitelist configured (no `*`)
- [ ] `npm ci --production` run (no devDependencies)
- [ ] `npm run build:backend` passes with 0 errors
- [ ] `npm test` passes

### Security

- [ ] HTTPS enabled (TLS termination at Nginx or load balancer)
- [ ] Firewall: only ports 80, 443 open to public; 3000 restricted to localhost
- [ ] Helmet middleware enabled (security headers)
- [ ] Rate limiting active (Redis-backed)
- [ ] JWT expiration ≤ 2 hours with refresh mechanism
- [ ] Password hashing: Argon2id (preferred) or bcrypt (cost ≥ 12)
- [ ] CORS restricted to specific origins

### Database

- [ ] MySQL 8.0 installed and configured
- [ ] Database charset: `utf8mb4`
- [ ] `synchronize: false` in TypeORM config
- [ ] Connection pool: `connectionLimit: 50`
- [ ] Initial schema loaded: `database/init-structure.sql`
- [ ] Automated backups configured (see Backup section)
- [ ] Database user has minimal required privileges (no DROP/ALTER in app user)

### Infrastructure

- [ ] SSL certificate installed (Let's Encrypt / commercial)
- [ ] Nginx reverse proxy configured (see below)
- [ ] PM2 process manager installed and configured
- [ ] Log rotation configured
- [ ] Monitoring: `/health` endpoint accessible internally

---

## Nginx Reverse Proxy

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

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for /chat
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend static files
    location / {
        root /var/www/openoba/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Health check (internal only)
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        allow 127.0.0.1;
        deny all;
    }
}
```

---

## Process Management (PM2)

### Ecosystem Config (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [{
    name: 'openoba-backend',
    script: 'dist/main.js',
    cwd: '/opt/openoba/packages/backend',
    instances: 'max',          // Auto-scale to CPU cores
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

### PM2 Commands

```bash
pm2 start ecosystem.config.js --env production
pm2 save                       # Persist process list
pm2 startup                    # Auto-start on boot
pm2 logs openoba-backend       # View logs
pm2 restart openoba-backend    # Zero-downtime restart
pm2 monit                      # Real-time monitoring
```

---

## Database: Backup Strategy

### Automated Backup

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

# Retain last 30 days
find "${BACKUP_DIR}" -name "openoba_*.sql.gz" -mtime +30 -delete
```

### Schedule (cron)

```
0 2 * * * /opt/openoba/scripts/backup.sh
```

### Recovery

```bash
gunzip -c openoba_20260625_020000.sql.gz | mysql -u root -p openoba
```

Backup files should be encrypted at rest (AES-256) and stored off-server.

---

## Redis Setup

Required for production rate limiting and recommended for session storage:

```bash
# Install
apt install redis-server

# Secure
redis-cli CONFIG SET requirepass "${REDIS_PASSWORD}"
redis-cli CONFIG SET bind 127.0.0.1

# Verify
redis-cli -a "${REDIS_PASSWORD}" ping
```

Configure in `.env`:

```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
```

---

## SSL/TLS Setup

### Let's Encrypt (Recommended)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
# Auto-renewal is configured automatically
```

### Manual Certificate

Place certificate files and configure in Nginx (see Nginx config above).

---

## Monitoring

### Health Endpoint

```
GET /health
```

Returns service status, database connectivity, and memory usage. Configure external monitoring (Uptime Kuma, Pingdom) to poll this endpoint every 60 seconds.

### Log Files

| Log | Location |
|-----|----------|
| Application | `/var/log/openoba/out.log` |
| Errors | `/var/log/openoba/error.log` |
| Nginx access | `/var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` |
| MySQL slow query | `/var/log/mysql/mysql-slow.log` |

### Log Rotation

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

## Security Hardening

| Measure | Configuration |
|---------|--------------|
| Helmet | `app.use(helmet())` — CSP, HSTS, X-Frame-Options |
| CORS | `app.enableCors({ origin: ['https://your-domain.com'] })` |
| Rate limiting | Redis-backed, per-IP and per-endpoint |
| CSRF | Not required for stateless JWT API |
| Input validation | Zod + class-validator on all DTOs |
| SQL injection | Parameterized queries only (TypeORM) |
| XSS | Output encoding in frontend templates |

---

## Secret Management

- `.env` excluded from git via `.gitignore`
- Never log secrets, tokens, or keys
- Rotate all secrets every 90 days
- Use `openssl rand -hex 32` to generate new JWT secrets
- Store backup encryption keys separately from backup files

---

## Rollback Procedure

If a deployment causes issues, execute the 7-step rollback:

```bash
# 1. Git: revert to last known-good commit
git checkout <stable-commit>

# 2. Build: rebuild
npm ci --production && npm run build:backend

# 3. Test: verify
npm test

# 4. Restart: PM2 zero-downtime restart
pm2 reload openoba-backend

# 5. Verify: check /health endpoint
curl http://127.0.0.1:3000/health

# 6. Monitor: watch logs for 15 minutes
pm2 logs openoba-backend --lines 100

# 7. Database: restore from backup if needed
#    gunzip -c backup.sql.gz | mysql -u root -p openoba
```

---

## Further Reading

- [Security Architecture](../security/security-architecture.md)
- [Security Policy](/SECURITY.md) (repo root)
- [Installation Guide](../getting-started/installation.md)
- [Environment Setup](../development/environment-setup.md)
