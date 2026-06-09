# OpenOBA 版本管理规范 V1.0

> 创建：2026-06-09 ｜ 生效：立即
> 适用：openoba-starter、openoba-core 两个仓库

---

## 一、仓库结构

```
github.com/openoba/
├── openoba-core/          ← 核心引擎（闭源）
│   ├── backend/           ← NestJS 引擎源码
│   │   └── src/modules/   ← auth/erdl/eros/meta-mirror/system/soul
│   └── frontend/          ← 管理前端
│
└── openoba-starter/       ← 标准发行版（开源）
    ├── packages/
    │   ├── backend/       ← NestJS ERP 参考实现
    │   └── types/         ← @openoba/types 共享类型
    ├── frontend/          ← Vue 3 前端
    ├── database/          ← SQL 脚本
    ├── docs/              ← 文档
    ├── skills/            ← Agent Skills
    └── deliverables/      ← 审计报告
```

---

## 二、分支策略

| 分支 | 用途 | 保护 |
|------|------|------|
| `master` | 稳定发布分支 | 🔒 需 PR + 审核 |
| `develop` | 日常开发分支 | 需 CI 通过 |
| `feature/*` | 功能分支 | 临时 |
| `hotfix/*` | 紧急修复 | 临时 |

---

## 三、Commit 规范

**格式**：`<type>: <subject>`

| type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不改业务逻辑） |
| `test` | 测试 |
| `docs` | 文档 |
| `chore` | 工程配置（lint/build/deps） |
| `sec` | 安全修复 |

**示例**：
```
feat: orderNo 改为 OBA-前缀 + crypto.randomUUID
fix: pricing-engine import 路径含双 dist 致测试阻断
sec: execSync → execFileSync 防命令注入
test: 新增 customer-auth.service.spec（5/6 passed）
```

---

## 四、版本号规则

**格式**：`v<MAJOR>.<MINOR>.<PATCH>`

| 级别 | 何时递增 | 示例 |
|------|---------|------|
| MAJOR | 架构重大变更、不兼容 API | v2.0.0 |
| MINOR | 新功能、新模块 | v1.4.0 |
| PATCH | Bug 修复、安全补丁 | v1.4.1 |

**当前版本**：
- openoba-starter: **v1.3.0**（下次发版 v1.4.0）
- openoba-core: **v1.3.0**

---

## 五、Tag 规范

```bash
# 发版时打 tag
git tag -a v1.4.0 -m "V1.4.0: ERP/CORE 解耦 + Redis限流 + 测试覆盖率30%"
git push origin v1.4.0
```

---

## 六、发版流程

1. `develop` → 所有 feature 合入 → CI 全绿
2. `develop` → PR → `master`
3. `master` 上打 tag → 触发 CI release job
4. 更新 CHANGELOG.md

---

## 七、禁止事项

| 🚫 禁止 | 说明 |
|---------|------|
| 直接 push master | 必须走 PR |
| 提交 node_modules | .gitignore 已配置 |
| 提交 .env | .gitignore 已配置 |
| 提交 .tgz / .zip | .gitignore 已配置 |
| 提交 knowledge/ | 元镜自动生成 |
| force push | 除非 hotfix 且团队确认 |
