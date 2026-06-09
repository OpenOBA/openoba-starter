# OpenOBA Starter 项目记忆

## 项目概况
- **项目名**: OpenOBA Starter — AI 执行官 · 眼镜行业 ERP 系统
- **技术栈**: NestJS 后端 + Vue3 前端 + MySQL + TypeORM
- **架构**: Monorepo（packages/backend + frontend + openoba-core BSL闭源引擎层）
- **版本**: 1.0.0
- **许可**: 行业层 MIT, 引擎层 BSL

## 安全审计历史
- 已完成 9 轮安全审计迭代修复
- 第 10 轮（上线前全检）于 2026-06-08 完成，发现 5 P0 + 9 P1 + 12 P2 + 8 P3
- 安全评级 D，QA 健康度 52/100
- 关键 P0: Deployment 命令注入、Wizard 未认证端点、CustomerAuthAdmin 越权、start:prod 路径错误、init-structure.sql DROP TABLE
- 完整报告: deliverables/gstack/pre-launch-check-openoba-starter-2026-06-08.md

## 已知技术债务
- 前端 689+ TypeScript 类型错误
- 后端测试覆盖率 ~9%（3/34 controller）
- 暴力破解防护用内存 Map（需迁移 Redis）
- 前端 bundle 895KB（element-plus 全量引入）
- 10 个 .bak 备份文件残留
- 缺少 .gitignore 和 .env.example

## 代码质量专业审计（2026-06-08）
- 增量于安全全检：聚焦架构健康度 + 测试覆盖 + 工程化建设 + 审查机制
- 报告: deliverables/audit/code-quality-audit-report-2026-06-08.md
- 整体评分 65/100：ERP C+ (62)、CORE B+ (78) [黑盒]、前端 C- (55)
- 关键增量发现：
  - 8 个 service > 500 行（最大 website.service 807 行）
  - 6 个 Vue 组件 > 800 行（最大 Customers.vue 1356 行）
  - 234 后端 + 241 前端 any 滥用
  - 24 处静默 catch 块（吞错灾难）
  - 13 个 .bak 残留（gitignore 后生成）
  - 无 .git 仓库、无 ESLint/Prettier/Husky/CI/Docker
- 三大核心建议：架构解耦（拆分超长 Service）、测试打底（覆盖率 50%+）、工程化建设（Lint+CI）
- 已交付审查机制：ERP 24 项 + CORE 6 项 + 前端 20 项 Checklist + PR 流程 + RACI 矩阵
