# 安装指南

从源码安装 OpenOBA 的详细指南。

## 系统要求

| 组件        | 要求                              |
|------------|-----------------------------------|
| OS         | Linux, macOS, 或 Windows 10+      |
| Node.js    | >= 18 (推荐 LTS)                  |
| npm        | >= 9                              |
| MySQL      | >= 8.0                            |
| Redis      | >= 6.0 (可选，用于缓存)            |
| 磁盘空间   | ~500 MB (源码 + node_modules)     |

## 第一步：克隆仓库

```bash
git clone https://github.com/openoba/openoba-starter.git
cd openoba-starter
```

## 第二步：安装依赖

```bash
npm install
```

这会安装所有 workspace 包的依赖：
- `packages/backend` (MIT) — NestJS API 服务
- `packages/core` (BSL 1.1) — 执行引擎
- `packages/types` (MIT) — 共享 TypeScript 类型
- `frontend/` (MIT) — Vue 3 SPA

## 第三步：配置环境变量

复制示例配置文件并编辑：

```bash
cp .env.example .env
```

### 必需变量

| 变量             | 描述                              | 示例                             |
|-----------------|-----------------------------------|----------------------------------|
| `DB_HOST`       | MySQL 主机地址                    | `localhost`                      |
| `DB_PORT`       | MySQL 端口                        | `3306`                           |
| `DB_USER`       | MySQL 用户名                      | `root`                           |
| `DB_PASSWORD`   | MySQL 密码                        | `your_password`                  |
| `DB_NAME`       | 数据库名称                        | `openoba`                        |
| `JWT_SECRET`    | JWT 签名密钥（至少 32 字符）      | `random-secret-key-here...`      |
| `LLM_API_KEY`   | LLM 提供商 API 密钥               | `sk-...`                         |
| `LLM_MODEL`     | 默认模型名称                      | `gpt-4o`                         |
| `LLM_BASE_URL`  | OpenAI 兼容 API 端点              | `https://api.openai.com/v1`     |

### 可选变量

| 变量              | 描述                           | 默认值           |
|------------------|--------------------------------|------------------|
| `REDIS_HOST`     | Redis 主机地址                 | `localhost`      |
| `REDIS_PORT`     | Redis 端口                     | `6379`           |
| `REDIS_PASSWORD` | Redis 密码                     | *(无)*           |
| `OPENOBA_MODE`   | 运行模式                       | `operator`       |
| `LOG_LEVEL`      | 日志级别                       | `info`           |
| `CORS_ORIGIN`    | 允许的 CORS 源                 | `*`（仅开发环境） |
| `UPLOAD_MAX_MB`  | 最大上传大小 (MB)              | `10`             |

完整变量列表参见 [配置参考](./configuration.zh-CN.md)。

## 第四步：数据库设置

创建数据库：

```bash
mysql -u root -p -e "CREATE DATABASE openoba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

同步 TypeORM 数据模型：

```bash
npx typeorm schema:sync -d packages/backend/dist/datasource.js
```

## 第五步：验证安装

### 健康检查

```bash
curl http://localhost:3000/health
# 预期: {"status":"ok","timestamp":"..."}
```

### 运行测试

```bash
npm run build:backend
npm test -w packages/backend
npm run test -w frontend
```

所有测试应当通过。如有失败，请参阅下方 [故障排查](#故障排查)。

## 故障排查

### 端口冲突

如果端口 `:3000` 或 `:5173` 已被占用：

```bash
# 查看占用端口的进程
lsof -i :3000               # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 或在 .env 中覆盖
PORT=3001
VITE_PORT=5174
```

### MySQL 连接失败

- 确认 MySQL 正在运行：`systemctl status mysql` (Linux) 或检查服务管理器 (Windows)
- 确认 `.env` 中的凭据与你的 MySQL 配置一致
- 确认数据库已创建：`mysql -u root -p -e "SHOW DATABASES;"`

### Node.js 版本错误

```
Error: Unsupported engine. Wanted node>=18
```

升级 Node.js：

```bash
nvm install 18
nvm use 18
```

### TypeScript 构建失败

```bash
npm run lint
npm run format:check
```

修复 lint 错误后再构建。工具链详情请参见 [技术栈](../architecture/tech-stack.md)。

## 下一步

- [架构概览](../architecture/overview.md)
- [配置参考](./configuration.zh-CN.md)
- [ERDL 协议](../erdl/overview.md)
