# Quick Start

Get OpenOBA running in 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [npm](https://www.npmjs.com/) >= 9
- [MySQL](https://www.mysql.com/) >= 8.0
- Git

## 1. Clone & Install

```bash
git clone https://github.com/openoba/openoba-starter.git
cd openoba-starter
npm install
```

## 2. Configure Environment

Create a `.env` file at the project root:

```ini
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=openoba

# JWT
JWT_SECRET=change-this-to-a-random-32char-string

# LLM (OpenAI-compatible)
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1
```

See [Configuration Reference](./configuration.md) for the full list of variables.

## 3. Initialize Database

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS openoba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p openoba < database/init-structure.sql
```

## 4. Start Services

**Backend** (port `:3000`):

```bash
npm run build:backend
npm run start:backend
```

**Frontend** (port `:5173`, in a new terminal):

```bash
npm run start:frontend
```

## 5. First Interaction

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see the ERA-Chat interface. Type a message — the AI should respond within seconds via WebSocket (falls back to SSE).

### Expected Result

- Chat panel renders with no errors
- Sending a message produces an AI response
- Streaming tokens appear in real time

## Next Steps

- Read the [Architecture Overview](../architecture/overview.md) to understand the system
- Explore the [ERDL Protocol](../erdl/overview.md) for semantic interaction
- Check [Installation Guide](./installation.md) for production setup
