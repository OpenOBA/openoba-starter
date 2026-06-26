# 配置参考

OpenOBA 所有 `.env` 变量的完整参考。

## 数据库（必需）

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `DB_HOST` | `localhost` | MySQL 主机地址 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `root` | MySQL 用户名 |
| `DB_PASSWORD` | *(无)* | MySQL 密码 |
| `DB_NAME` | `openoba` | 数据库名称 |

## JWT 认证（必需）

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `JWT_SECRET` | *(无)* | 签名密钥（至少 32 字符） |
| `JWT_EXPIRES_IN` | `24h` | Token 有效期 |

## LLM 提供商（必需）

OpenAI 兼容的 Chat Completions API。

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `LLM_API_KEY` | *(无)* | API 密钥 |
| `LLM_MODEL` | `gpt-4o` | 默认模型 |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | API 端点 |
| `LLM_TIMEOUT_MS` | `60000` | 请求超时 (ms) |
| `LLM_MAX_TOKENS` | `4096` | 最大回复 token 数 |

兼容任何 OpenAI 兼容接口（OpenAI、Anthropic 代理、Ollama 等）。

## Redis（可选）

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `REDIS_HOST` | `localhost` | Redis 主机地址 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | *(无)* | Redis 密码 |
| `REDIS_DB` | `0` | 数据库编号 |

## CORS

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `CORS_ORIGIN` | `*` | 允许的源，逗号分隔 |

生产环境请设置具体源地址。

## 运行模式

| 变量 | 默认值 | 可选值 |
|------|--------|--------|
| `OPENOBA_MODE` | `operator` | `operator` / `developer` / `maintainer` |

- **operator** — 聊天、任务、自动化。
- **developer** — 额外开放 API 访问、调试工具、ERDL 编辑。
- **maintainer** — 完整系统权限：日志、指标、配置管理。

## 日志

| 变量 | 默认值 | 可选值 |
|------|--------|--------|
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` / `verbose` |
| `LOG_FORMAT` | `pretty` | `pretty`（控制台）/ `json`（生产环境） |

## 文件上传

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `UPLOAD_MAX_MB` | `10` | 最大上传大小 (MB) |
| `UPLOAD_ALLOWED` | `true` | 启用/禁用文件上传 |

## 完整示例

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=openoba
JWT_SECRET=replace-with-random-hex
JWT_EXPIRES_IN=24h
LLM_API_KEY=sk-your-key
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1
REDIS_HOST=localhost
CORS_ORIGIN=http://localhost:5173
OPENOBA_MODE=operator
LOG_LEVEL=info
UPLOAD_MAX_MB=10
```

## 参见

- [安装指南](./installation.zh-CN.md)
- [架构概览](../architecture/overview.md)
- [模块列表](../architecture/module-list.md)
