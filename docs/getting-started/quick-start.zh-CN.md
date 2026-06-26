# 快速开始

5 分钟内启动 OpenOBA。

## 前置条件

- [Node.js](https://nodejs.org/) >= 18
- [npm](https://www.npmjs.com/) >= 9
- [MySQL](https://www.mysql.com/) >= 8.0
- Git

## 1. 克隆与安装

```bash
git clone https://github.com/openoba/openoba-starter.git
cd openoba-starter
npm install
```

## 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```ini
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=openoba

# JWT
JWT_SECRET=改成一个随机的32位字符串

# LLM（OpenAI 兼容接口）
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1
```

完整变量列表参见 [配置参考](./configuration.zh-CN.md)。

## 3. 初始化数据库

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS openoba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p openoba < database/init-structure.sql
```

## 4. 启动服务

**后端**（端口 `:3000`）：

```bash
npm run build:backend
npm run start:backend
```

**前端**（端口 `:5173`，新终端窗口）：

```bash
npm run start:frontend
```

## 5. 首次交互

在浏览器中打开 [http://localhost:5173](http://localhost:5173)。你应该能看到 ERA-Chat 界面。发送一条消息 —— AI 会在几秒内通过 WebSocket 响应（降级到 SSE）。

### 预期结果

- 聊天面板正常渲染，无报错
- 发送消息后收到 AI 回复
- 流式 token 实时显示

## 下一步

- 阅读 [架构概览](../architecture/overview.md) 了解系统设计
- 探索 [ERDL 协议](../erdl/overview.md) 了解语义交互
- 查看 [安装指南](./installation.zh-CN.md) 进行生产环境部署
