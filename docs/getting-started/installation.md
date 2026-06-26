# Installation Guide

Detailed instructions for installing OpenOBA from source.

## System Requirements

| Component   | Requirement                       |
|-------------|-----------------------------------|
| OS          | Linux, macOS, or Windows 10+      |
| Node.js     | >= 18 (LTS recommended)           |
| npm         | >= 9                              |
| MySQL       | >= 8.0                            |
| Redis       | >= 6.0 (optional, caching)        |
| Disk space  | ~500 MB                           |

## Step 1: Clone

```bash
git clone https://github.com/openoba/openoba-starter.git
cd openoba-starter
```

## Step 2: Install Dependencies

```bash
npm install
```

This installs dependencies for all workspace packages: `packages/backend` (MIT), `packages/core` (BSL 1.1), `packages/types` (MIT), `frontend/` (MIT).

## Step 3: Configure Environment

```bash
cp .env.example .env
```

### Required Variables

| Variable        | Description                       | Example                    |
|----------------|-----------------------------------|----------------------------|
| `DB_HOST`      | MySQL host                        | `localhost`                |
| `DB_PORT`      | MySQL port                        | `3306`                     |
| `DB_USER`      | MySQL user                        | `root`                     |
| `DB_PASSWORD`  | MySQL password                    | `your_password`            |
| `DB_NAME`      | Database name                     | `openoba`                  |
| `JWT_SECRET`   | JWT signing secret (min 32 chars) | `random-32-char-string`    |
| `LLM_API_KEY`  | LLM provider API key              | `sk-...`                   |
| `LLM_MODEL`    | Default model name                | `gpt-4o`                   |
| `LLM_BASE_URL` | OpenAI-compatible API endpoint    | `https://api.openai.com/v1`|

### Optional Variables

| Variable           | Description              | Default       |
|--------------------|--------------------------|---------------|
| `REDIS_HOST`       | Redis host               | `localhost`   |
| `REDIS_PORT`       | Redis port               | `6379`        |
| `REDIS_PASSWORD`   | Redis password           | *(none)*      |
| `OPENOBA_MODE`     | Operation mode           | `operator`    |
| `LOG_LEVEL`        | Logging level            | `info`        |
| `CORS_ORIGIN`      | Allowed CORS origin      | `*` (dev)     |
| `UPLOAD_MAX_MB`    | Max upload size (MB)     | `10`          |

See [Configuration Reference](./configuration.md) for full details.

## Step 4: Database Setup

```bash
mysql -u root -p -e "CREATE DATABASE openoba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npx typeorm schema:sync -d packages/backend/dist/datasource.js
```

## Step 5: Verify Installation

### Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Run Tests

```bash
npm run build:backend
npm test -w packages/backend
npm run test -w frontend
```

## Troubleshooting

### Port Conflicts

Ports `:3000` or `:5173` in use? Override in `.env`:

```ini
PORT=3001
VITE_PORT=5174
```

Find what's using a port:
```bash
lsof -i :3000              # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### MySQL Connection Failed

- Verify MySQL is running: `systemctl status mysql` (Linux) or Services (Windows)
- Confirm credentials match your `.env`
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Node.js Version Error

```
Error: Unsupported engine. Wanted node>=18
```

Upgrade: `nvm install 18 && nvm use 18`

### Build Failures

```bash
npm run lint
npm run format:check
```

Fix lint errors before building. See [Tech Stack](../architecture/tech-stack.md) for tooling details.

## Next Steps

- [Architecture Overview](../architecture/overview.md)
- [Configuration Reference](./configuration.md)
- [ERDL Protocol](../erdl/overview.md)
