# Configuration Reference

All `.env` variables for OpenOBA.

## Database (Required)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MySQL hostname |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | *(none)* | MySQL password |
| `DB_NAME` | `openoba` | Database name |

## JWT (Required)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *(none)* | Signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | `24h` | Token expiry |

## LLM Provider (Required)

OpenAI-compatible Chat Completions API.

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_API_KEY` | *(none)* | API key |
| `LLM_MODEL` | `gpt-4o` | Default model |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | API endpoint |
| `LLM_TIMEOUT_MS` | `60000` | Request timeout (ms) |
| `LLM_MAX_TOKENS` | `4096` | Max response tokens |

Works with any OpenAI-compatible provider.

## Redis (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(none)* | Redis password |
| `REDIS_DB` | `0` | Database index |

## CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGIN` | `*` | Allowed origins, comma-separated |

Use specific origins in production.

## Operation Mode

| Variable | Default | Values |
|----------|---------|--------|
| `OPENOBA_MODE` | `operator` | `operator` / `developer` / `maintainer` |

- `operator` — Chat, tasks, automation.
- `developer` — API access, debug tools, ERDL editing.
- `maintainer` — Full system: logs, metrics, config.

## Logging

| Variable | Default | Values |
|----------|---------|--------|
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` / `verbose` |
| `LOG_FORMAT` | `pretty` | `pretty` / `json` |

## Uploads

| Variable | Default | Description |
|----------|---------|-------------|
| `UPLOAD_MAX_MB` | `10` | Max upload size (MB) |
| `UPLOAD_ALLOWED` | `true` | Enable uploads |

## Full Example

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

## See Also

- [Installation Guide](./installation.md)
- [Architecture Overview](../architecture/overview.md)
- [Module List](../architecture/module-list.md)
