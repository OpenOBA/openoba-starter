# 安装指南

> 从零开始安装 OpenOBA Starter，适合首次部署和运维人员

## 前置要求

### 必需

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **Node.js** | 18 | 20 LTS | NestJS 11 要求 ≥ 18 |
| **MySQL** | 8.0 | 8.0 | 字符集需 utf8mb4 |
| **npm** | 9 | 10 | 随 Node.js 安装 |

### 可选

| 软件 | 用途 | 何时需要 |
|------|------|---------|
| Redis | 限流 / 缓存 | 生产环境或多实例部署 |
| 阿里云短信 | C 端验证码登录 | 启用客户手机登录 |
| LLM API Key | AI 数字执行官 | 推荐至少一个（DeepSeek 新用户免费 500 万 token） |

### 验证环境

```bash
node --version    # 应输出 v18.x 或更高
mysql --version   # 应输出 8.0.x
npm --version     # 应输出 9.x 或更高
```

> ⚠️ 如果 Node.js 版本低于 18，请先升级。建议用 [nvm](https://github.com/nvm-sh/nvm)（macOS/Linux）或 [nvm-windows](https://github.com/coreybutler/nvm-windows) 管理多版本。

---

## 安装步骤

### 第 1 步：获取代码

```bash
git clone <repo-url>
cd openoba-starter
```

### 第 2 步：安装依赖

```bash
npm install
```

> **提示**：项目使用 npm workspaces，根目录 `npm install` 会自动安装所有子包（backend / core / types / frontend）的依赖。

如果遇到网络问题，可使用淘宝镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

### 第 3 步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，**至少修改以下项**：

```ini
# 数据库（必填）
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=你的MySQL密码    # ← 改成实际密码
DB_DATABASE=openoba_starter

# JWT 密钥（生产环境必改）
JWT_SECRET=至少32字符的随机字符串
CUSTOMER_JWT_SECRET=另一个至少32字符的随机字符串
```

生成强随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> 📖 完整配置项说明见 [配置说明](./configuration.md)

### 第 4 步：创建数据库

在 MySQL 中创建空数据库（表结构由系统自动创建）：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS openoba_starter DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

> ⚠️ **不要**手动执行 `database/init-structure.sql`。系统首次启动时会通过初始化向导自动建表。

### 第 5 步：编译后端

```bash
npm run build:backend
```

这会先编译 `@openoba/core` 引擎包，再编译 `packages/backend`。编译产物在 `packages/backend/dist/`。

如果编译失败，检查：
- Node.js 版本是否 ≥ 18
- `npm install` 是否完整执行
- 是否有端口冲突

### 第 6 步：启动后端

```bash
npm run start:backend
```

后端默认运行在 `http://localhost:3400`。

验证启动成功：

```bash
curl http://localhost:3400/health
# 应返回 {"status":"ok",...}
```

### 第 7 步：启动前端

新开一个终端：

```bash
npm run start:frontend
```

前端开发服务器运行在 `http://localhost:5173`。

### 第 8 步：首次初始化

浏览器打开 `http://localhost:5173`，系统检测到数据库为空，自动跳转到 **初始化向导**：

1. **数据库连接** — 确认连接信息，点击"测试连接"
2. **建库建表** — 点击"开始建表"，系统执行 `init-structure.sql` 创建 128+ 张表
3. **种子数据** — 创建管理员账号、默认角色、权限点
4. **登录系统** — 使用 `admin` / `admin123` 登录

> ⚠️ **首次登录后请立即修改密码**：进入 系统 → 用户管理 → 修改 admin 密码。

### 第 9 步：配置 LLM API Key

AI 执行官需要一个 LLM API Key 才能工作：

1. 登录系统后，进入 **ERA-Chat**
2. 点击右上角 **设置** 图标
3. 切换到 **API Key** 选项卡
4. 添加你的 DeepSeek / Qwen / OpenAI API Key
5. 设置一个默认模型

> 💡 **推荐 DeepSeek**：国内访问快，新用户免费 500 万 token，足够体验。注册地址：platform.deepseek.com

---

## Windows 一键启动

Windows 用户可以直接双击 `start.bat`，脚本会：

1. 启动后端（:3400），等待健康检查通过
2. 启动前端（:5173），等待就绪
3. 自动打开浏览器

> ⚠️ `start.bat` 假设你已经完成上述第 2-5 步（安装依赖、配置 .env、编译）。首次使用仍需手动完成初始化向导。

---

## 常见安装问题

### `npm install` 失败

**症状**：依赖安装报错或卡住

**排查**：
1. 检查 Node.js 版本 `node --version`（需 ≥ 18）
2. 清除缓存重试：`npm cache clean --force && npm install`
3. 删除 `node_modules` 和 `package-lock.json` 后重装
4. 网络问题使用镜像：`npm install --registry=https://registry.npmmirror.com`

### `build:backend` 编译失败

**症状**：TypeScript 编译错误

**排查**：
1. 确认 `npm install` 完整执行（特别是 `@openoba/core` 包）
2. 检查 `packages/core/dist/` 目录是否存在（Core 需要先编译）
3. 单独编译 Core：`npm run build -w packages/core`

### 后端启动后 `/health` 无响应

**症状**：`curl http://localhost:3400/health` 超时

**排查**：
1. 检查 `.env` 中 `APP_PORT` 是否被占用
2. 检查 MySQL 是否启动：`mysql -u root -p -e "SELECT 1"`
3. 查看后端控制台日志，确认数据库连接是否成功
4. 确认 `.env` 的 `DB_PASSWORD` 正确

### 初始化向导"测试连接"失败

**症状**：向导第一步报数据库连接错误

**排查**：
1. 确认 MySQL 服务已启动
2. 确认 `.env` 中数据库配置正确（host/port/username/password）
3. 确认 MySQL 用户有创建数据库权限
4. 检查 MySQL 是否允许远程连接（如果 MySQL 不在本机）
5. MySQL 8.0 认证插件问题：确认用户使用 `mysql_native_password` 或 `caching_sha2_password`

### 前端页面空白

**症状**：浏览器打开 5173 端口但页面空白

**排查**：
1. 打开浏览器开发者工具，查看 Console 错误
2. 确认后端已启动（前端依赖后端 API）
3. 检查 `.env` 的 `CORS_ORIGIN` 是否包含 `http://localhost:5173`
4. 查看前端控制台是否有 Vite 编译错误

---

## 下一步

- 📖 [快速开始](./quick-start.md) — 5 分钟体验核心功能
- 📖 [配置说明](./configuration.md) — 了解所有环境变量
- 📖 [架构总览](../architecture/overview.md) — 理解系统设计
- 📖 [生产部署](../deployment/production.md) — 部署到生产环境
