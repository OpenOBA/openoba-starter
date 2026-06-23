# OpenOBA Starter 项目记忆

## 项目概况
- **项目名**: OpenOBA Starter — AI 执行官 · 眼镜行业 ERP 系统
- **技术栈**: NestJS 后端 + Vue3 前端 + MySQL + TypeORM
- **架构**: Monorepo（packages/backend + frontend + openoba-core BSL闭源引擎层）
- **版本**: 1.4.0-alpha9（README 显示，CHANGELOG 对齐）
- **许可**: 行业层 MIT, 引擎层 BSL-1.1（Change Date: 2030-06-09）

## ⭐ 核心差异化定位（2026-06-23 提炼，v3 专利级）
- OpenOBA 最不一样的地方：**AI 执行官住在 ERA-Chat 里，能自己开发自己、自己运营自己**
- 这区别于所有其他开源 ERP 的"二开"方式（clone → 装环境 → 读源码 → 提 PR）
- 建立在 **7 项发明专利**之上的七层架构：
  - **L1 ERDL**（P01+P04）：五层语义模型 + 零停机热替换 + 13 项语义校验 + 三向翻译 + **编译验证闭环** + DTO 5 态审计 + 精准上下文注入（节省 90% Token）
  - **L2 Action Guard**（P02）：四格式自适应解析（FC>JSON>XML>文本）+ 三级校验 + 输出清洁 + 一键回退 + "软输入硬校验"
  - **L3 ReAct 单工具决策**（P03）：每轮只执行 actions[0] + 三层思考事件 + 五类SSE + 四层防线
  - **L4 SOUL**：人格系统，securityClearance + canEditCode + 铁律三层约束
  - **L5 Meta-Mirror**：自动扫描 Entity/API/DTO/规则/约定，注入 Agent 上下文
  - **L6 Agent Memory**（P06）：错误→记忆转化链 + 按作用域精准注入 ≤8 条 + 版本化生命周期
  - **L7 六引擎协同**（P07）：商品/上架/销售/履约/客服/分析 — 单 Agent 全业务闭环
- 关键 skill：file-edit（allowPatterns: src/skills/erdl/packages）、tsc-check、git-diff、erdl-crud（forbidden: user/role/permission/cognitive_log/agent_task）
- 五道安全防线：SOUL 铁律 + Skill 权限白名单 + 编译验证闭环 + 三重数据库校验 + Deliverable 审批流
- ERA-Chat 前端路由 /chat，组件 ChatShell.vue + AgentChat.vue
- AgentExecutorService 含 chatExecute/executeFileEdit/executeTscCheck/executeGitDiff/executeErdlCrud
- 专利文件位置：C:\Users\99tan\openoba\发明专利\（7 项 P01-P07，P05 为美学校验）

## 文档体系（2026-06-23 完成，21 份）
- 清单总览：deliverables/docs-manifest.md
- 根级：README.md（突出自开发自运营）、.env.example（已修复乱码）
- docs/era-chat/：README.md（总览）、development-guide.md（开发指南）、operations-guide.md（运营指南）⭐ 核心
- docs/architecture/：overview / tech-stack / module-list
- docs/getting-started/：installation / quick-start / configuration
- docs/development/：environment-setup / coding-standards / testing
- docs/api/、docs/database/、docs/deployment/、docs/security/ 各一份
- .github/：ISSUE_TEMPLATE/config.yml + FUNDING.yml

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
- 缺少 .gitignore 和 .env.example（.env.example 已于 2026-06-23 修复）

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
