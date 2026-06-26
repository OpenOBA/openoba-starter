# Environment Setup

> Configure your local OpenOBA dev environment.

---

## Prerequisites

| Component | Min | Rec |
|-----------|-----|-----|
| Node.js | 18 | 20 LTS |
| npm | 9 | 10 |
| MySQL | 8.0 | 8.0 |
| Git | 2.30 | latest |

Redis 7.x is optional. Node.js 16+ unsupported (NestJS 11 ≥ 18). See [Tech Stack](../architecture/tech-stack.md).

---

## Clone & Install

```bash
git clone https://github.com/openoba/openoba-starter.git
cd openoba-starter
npm install
```

Installs deps for all workspaces: `packages/backend`, `packages/core`, `packages/types`, `frontend/`. See [Architecture](../architecture/overview.md).

---

## IDE: VS Code

Extensions: `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `Vue.volar`, `mtxr.sqltools`.

**`.vscode/settings.json`**:
```json
{"editor.formatOnSave":true,"editor.defaultFormatter":"esbenp.prettier-vscode","editor.codeActionsOnSave":{"source.fixAll.eslint":"explicit"}}
```

---

## .env Setup

```ini
OPENOBA_MODE=developer
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=openoba
JWT_SECRET=change-this-to-a-random-32char-string
CUSTOMER_JWT_SECRET=another-random-string
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1
REDIS_HOST=localhost
REDIS_PORT=6379
ERDL_ACTION_GUARD=true
ERDL_HOT_RELOAD=true
```

Full list in [Configuration](../getting-started/configuration.md).

---

## Initialize Database

```bash
mysql -u root -p -e "CREATE DATABASE openoba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npx typeorm schema:sync -d packages/backend/dist/datasource.js
```

> `npm run build:backend` first if `dist/` missing.

---

## Start Dev Servers

**Backend** (watch, `:3000`): `npm run start:backend`
- Swagger: `:3000/api` · Health: `:3000/health`

**Frontend** (Vite HMR, `:5173`): `npm run start:frontend`

**Both**: `npm run dev`

---

## Verify

1. `curl http://localhost:3000/health` → `200 OK`
2. Edit backend `.ts` → auto-restart
3. Edit `.vue` → browser updates without reload
4. ERA-Chat on `:5173` → streaming response confirms Socket.IO

---

## Debugging

**VS Code** `.vscode/launch.json`:
```json
{"type":"node","request":"launch","name":"Debug Backend","skipFiles":["<node_internals>/**"],"program":"${workspaceFolder}/packages/backend/src/main.ts","outFiles":["${workspaceFolder}/packages/backend/dist/**/*.js"]}
```

Backend logs: `start:backend` terminal. Frontend: browser DevTools Console.

---

## Git Hooks

**Husky + lint-staged**: ESLint auto-fix, Prettier format, TS compile check.

Bypass: `git commit --no-verify`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ECONNREFUSED` :3000 | Start backend/MySQL |
| TS errors | `npm run build:backend` |
| WS disconnects | Check Socket.IO v4 |
| ERDL not reloading | `ERDL_HOT_RELOAD=true` |
