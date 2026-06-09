# OpenOBA Starter

> AI 执行官 · 眼镜行业 ERP 系统

OpenOBA Starter 是一个完整的参考实现，包含 AI 执行引擎和眼镜行业管理系统。

| 组件 | 定位 | 许可 |
|------|------|------|
| **OpenOBA Core** | AI 执行官引擎（闭源分发） | BSL |
| **Eyewear ERP** | 眼镜行业完整管理系统（源码） | MIT |

## 系统要求

- **Node.js** >= 18
- **MySQL** >= 8.0
- **LLM API Key**（推荐 DeepSeek，新用户免费 500 万 token）

## 快速开始

### Windows
双击 `start.bat`

### Mac / Linux
```bash
cd openoba-core/backend
cp .env.example .env
npm install --production
node dist/main.js
# 浏览器打开 http://localhost:3400/wizard
```

## 初始化流程

首次启动自动进入 4 步向导：

1. **数据库连接** — 输入 MySQL 账号密码，测试连接
2. **建库建表** — 创建 128 张数据库表
3. **种子数据** — 创建管理员、角色、权限
4. **登录系统** — 默认 admin / admin123

## API Key 配置

LLM API Key 不包含在向导中。登录后，在 **ERA-Chat → 设置 → API Key** 选项卡中配置 DeepSeek/Qwen/OpenAI 的 Key。

## 默认账号

- 用户名：`admin`
- 密码：`admin123`
- ⚠️ 首次登录后请立即修改密码

## 目录结构

```
openoba-starter/
├── openoba-core/          # 引擎层（BSL）
│   ├── backend/dist/      # 编译后 NestJS
│   └── frontend/dist/     # 编译后 Vue3
├── eyewear-erp/           # 行业层（MIT 源码）
│   ├── backend/src/       # ERP 后端源码
│   ├── frontend/src/      # ERP 前端源码
│   ├── database/          # 建库 SQL
│   │   ├── init-structure.sql
│   │   └── init-seed.sql
│   └── erdl/              # ERDL 规则
├── start.bat              # Windows 一键启动
└── README.md
```
