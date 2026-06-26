# 开发环境配置

> 配置 OpenOBA 本地开发环境。

---

## 前置要求

| 组件 | 最低 | 推荐 |
|------|------|------|
| Node.js | 18 | 20 LTS |
| npm | 9 | 10 |
| MySQL | 8.0 | 8.0 |
| Git | 2.30 | 最新 |

Redis 7.x 可选。Node.js 16+ 不支持（NestJS 11 ≥ 18）。见[技术栈](../architecture/tech-stack.zh-CN.md)。

---

## 克隆与安装

```bash
git clone https://github.com/openoba/openoba-starter.git
cd openoba-starter
npm install
```

安装所有工作区：`packages/backend`、`packages/core`、`packages/types`、`frontend/`。见[架构](../architecture/overview.zh-CN.md)。

---

## IDE：VS Code

扩展：`dbaeumer.vscode-eslint`、`esbenp.prettier-vscode`、`Vue.volar`、`mtxr.sqltools`。

**`.vscode/settings.json`**：
```json
{"editor.formatOnSave":true,"editor.defaultFormatter":"esbenp.prettier-vscode","editor.codeActionsOnSave":{"source.fixAll.eslint":"explicit"}}
```

---

## .env 配置

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

完整列表见[配置](../getting-started/configuration.zh-CN.md)。

---

## 初始化数据库

```bash
mysql -u root -p -e "CREATE DATABASE openoba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npx typeorm schema:sync -d packages/backend/dist/datasource.js
```

> 先运行 `npm run build:backend` 如果 `dist/` 不存在。

---

## 启动服务器

**后端**（watch，`:3000`）：`npm run start:backend`
- Swagger：`:3000/api` · 健康检查：`:3000/health`

**前端**（Vite HMR，`:5173`）：`npm run start:frontend`

**同时**：`npm run dev`

---

## 验证

1. `curl http://localhost:3000/health` → `200 OK`
2. 编辑后端 `.ts` → 自动重启
3. 编辑 `.vue` → 无刷新更新
4. `:5173` ERA-Chat → 流式响应确认 Socket.IO

---

## 调试

**VS Code** `.vscode/launch.json`：
```json
{"type":"node","request":"launch","name":"调试后端","skipFiles":["<node_internals>/**"],"program":"${workspaceFolder}/packages/backend/src/main.ts","outFiles":["${workspaceFolder}/packages/backend/dist/**/*.js"]}
```

后端日志：`start:backend` 终端。前端：浏览器 DevTools 控制台。

---

## Git Hooks

**Husky + lint-staged**：ESLint 修复、Prettier 格式化、TS 编译检查。

跳过：`git commit --no-verify`

---

## 故障排查

| 问题 | 修复 |
|------|------|
| `ECONNREFUSED` :3000 | 启动后端/MySQL |
| TS 报错 | `npm run build:backend` |
| WS 断开 | 检查 Socket.IO v4 |
| ERDL 未重载 | `ERDL_HOT_RELOAD=true` |
