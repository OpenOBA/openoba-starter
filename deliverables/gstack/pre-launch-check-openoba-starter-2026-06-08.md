# OpenOBA Starter 上线前全检报告

**日期**：2026-06-08
**场景**：上线前全检（代码审查 + 安全审计 + QA测试）
**参与成员**：产品官 + 安全卫士 + 质量门神

---

## 📌 TL;DR（执行摘要）

- 整体结论：🔴 **No-Go** — 当前状态不可直接上线，存在 5 个上线阻断项
- 阻塞项数量：5 个 Critical/P0 级别（3 安全 + 2 部署）
- 高危项数量：9 个 High/P1 级别（6 安全越权 + 3 代码/质量）
- 安全评级：**D**（高危）| QA 健康度：**52/100**
- 下一步：修复全部 P0 阻断项 + 关键 P1 后，可条件上线

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🔴 No-Go |
| 严重度分布 | 🔴 5 / 🟠 9 / 🟡 12 / 🟢 8 |
| 关键行动项 | 14 条 |
| 建议负责人 | 后端开发 × 1（安全修复）+ 运维 × 1（部署配置） |

---

## 1. 各成员核心结论

### 🔍 产品官（代码审查）
- 核心判断：代码架构基本合理（事务管理扎实、状态机清晰、统一响应格式），但存在字典控制器 SQL 注入风险、订单状态 DTO 缺枚举校验、前端 `any` 类型崩溃等上线阻断项
- 关键建议：修复 P0-1 字典控制器动态列名注入、P0-2 订单状态枚举校验、补充嵌套 DTO 验证

### 🛡️ 安全卫士（OWASP+STRIDE 审计）
- 核心判断：安全评级 D，3 个 Critical 级漏洞均可被远程利用。Wizard 未认证端点暴露数据库操作能力、Deployment 存在 execSync 命令注入、CustomerAuthAdmin 缺角色限制可越权重置客户密码
- 关键建议：立即禁用/加固 Wizard 端点、替换 execSync 为 execFileSync、全面补齐控制器 @Roles 装饰器

### ✅ 质量门神（QA测试与发布）
- 核心判断：QA 健康度 52/100。后端编译通过、前端 Vite 构建通过、前端 93 项测试全部通过；但 `start:prod` 入口路径错误导致生产无法启动、init-structure.sql 含 128 个 DROP TABLE 可摧毁生产数据、后端 2/3 测试套件失败
- 关键建议：修复 start:prod 路径、改造 init-structure.sql 为 CREATE TABLE IF NOT EXISTS、添加 .gitignore 和 .env.example

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 修复建议 | 来源成员 |
|---|--------|------|------|---------|---------|---------|
| 1 | 🔴 | 安全-命令注入 | `deployment.service.ts:492-507` | `gitExec()` 用 `execSync` 模板字符串拼接用户输入，summary 可注入 shell 命令；`runMigration()` 将 DB 密码拼入命令行 | 改用 `execFileSync('git', [...args])` 传参；DB 密码用 `--defaults-extra-file` | 安全卫士 |
| 2 | 🔴 | 安全-未认证端点 | `wizard.controller.ts:7-34` | Wizard 整体 `@Public()` 无需认证，暴露数据库凭据注入、建表、种子操作，可被 SSRF 利用 | 初始化后禁用 + IP 白名单 + 移除 `@Public()` + 服务端预配置凭据 | 安全卫士 |
| 3 | 🔴 | 安全-越权 | `customer-auth-admin.controller.ts:8-9` | 缺少 `@Roles()` 限制，任意认证用户可重置客户密码、冻结账户 | 添加 `@Roles('super_admin', 'admin')` | 安全卫士 |
| 4 | 🔴 | 部署-启动失败 | `packages/backend/package.json` | `start:prod` 路径为 `dist/src/main`（不存在），应为 `dist/main` | 修正为 `node dist/main` | 质量门神 |
| 5 | 🔴 | 部署-数据摧毁 | `database/init-structure.sql` | 128 个 `DROP TABLE IF EXISTS`，误在生产库执行将摧毁全部数据 | 改为 `CREATE TABLE IF NOT EXISTS` + 顶部警告 + 新增增量迁移脚本 | 质量门神 |
| 6 | 🟠 | 安全-越权 | `order.controller.ts` | 缺少 `@Roles()`，任意认证用户可操作订单全生命周期 | 添加 `@Roles('super_admin', 'admin', 'operator')`，敏感操作限 admin | 安全卫士 |
| 7 | 🟠 | 安全-越权 | `inventory.controller.ts` | 缺少 `@Roles()`，任意认证用户可操作库存及清理历史 | 添加 `@Roles('super_admin', 'admin', 'operator')`，cleanOld 限 admin | 安全卫士 |
| 8 | 🟠 | 安全-越权 | `after-sales.controller.ts` | 缺少 `@Roles()`，任意认证用户可审核退款 | 添加 `@Roles`，review/process 限 admin | 安全卫士 |
| 9 | 🟠 | 安全-越权 | `draft-pool.controller.ts` + `draft.controller.ts` | 缺少 `@Roles()`，任意认证用户可发布/审批商品 | 添加 `@Roles`，审批/发布限 admin | 安全卫士 |
| 10 | 🟠 | 安全-越权+上传 | `upload.controller.ts` | 缺少 `@Roles()` + 无 MIME 校验 + 允许 SVG 上传（XSS 向量） | 添加 `@Roles` + MIME 校验 + 移除 SVG 或 sanitize | 安全卫士 |
| 11 | 🟠 | 安全-弱密钥 | `packages/backend/.env` | `JWT_SECRET=temp` + 无 `.gitignore` 保护 | 创建 `.gitignore` + 启动时检查 JWT_SECRET 强度 + `.env.example` 模板 | 安全卫士+质量门神 |
| 12 | 🟠 | 代码-SQL注入 | `dict.controller.ts:307-376` | 动态列名拼接入 SQL 未做反引号包裹，body key 可注入 | 列名用反引号包裹 + body key 白名单校验 | 产品官 |
| 13 | 🟠 | 代码-DTO缺失 | `order.dto.ts:77-78` | `UpdateOrderStatusDto.status` 用 `@IsString()` 无枚举校验，可注入非法状态 | 添加 `@IsEnum(ORDER_STATUS)` 或 `@IsIn([...])` | 产品官 |
| 14 | 🟠 | 代码-类型崩溃 | `frontend/src/stores/user.ts:6` | `JSON.parse` 无 try-catch + `any` 类型，非法值导致 store 崩溃 | try-catch 包裹 + 定义 UserInfo 接口 + 失败清 localStorage | 产品官 |
| 15 | 🟡 | 代码-并发 | `order.service.ts:212-213` | 订单号用 COUNT+1 生成，并发时会重复 | 改用 Redis 自增或 UUID 前缀方案 | 产品官 |
| 16 | 🟡 | 代码-冗余 | `customer.service.ts:144-154` | 手动赋值后 `Object.assign` 覆盖，逻辑冲突 | 去掉 Object.assign 或映射前从 dto 删除字段 | 产品官 |
| 17 | 🟡 | 代码-循环依赖 | `after-sales.service.ts:27` | 使用 `forwardRef` 注入 InventoryService | 引入事件驱动/领域事件模式 | 产品官 |
| 18 | 🟡 | 代码-验证缺失 | `order.dto.ts:52` | `items: OrderItemDto[]` 缺少 `@ValidateNested` + `@Type`，嵌套校验被跳过 | 添加 `@ValidateNested({ each: true })` + `@Type(() => OrderItemDto)` | 产品官 |
| 19 | 🟡 | 代码-不安全UUID | `dict.controller.ts:428-432` | `generateUUID()` 用 `Math.random()` 非密码学安全 | 替换为 `crypto.randomUUID()` | 产品官 |
| 20 | 🟡 | 代码-LIKE注入 | `customer.service.ts:92` | keyword 未转义 LIKE 通配符（`%`、`_`） | 统一使用 `keyword.replace(/[%_]/g, '\\$&')` 转义 | 产品官 |
| 21 | 🟡 | 安全-Token存储 | `frontend/src/stores/user.ts` | JWT 存 localStorage，XSS 可窃取 | 迁移至 httpOnly + Secure + SameSite Cookie | 安全卫士 |
| 22 | 🟡 | 安全-无刷新Token | `auth.module.ts` | 7 天长效 access_token 无 refresh_token，泄露后不可撤销 | 缩短至 15-30 分钟 + 引入 refresh_token + 黑名单 | 安全卫士 |
| 23 | 🟡 | 安全-内存限流 | `auth.controller.ts` + `customer-auth.controller.ts` | 暴力破解防护用内存 Map，多实例部署失效（TODO-PROD 未实施） | 迁移至 Redis INCR + EXPIRE | 产品官+安全卫士 |
| 24 | 🟡 | 安全-SMS暴力破解 | `sms.service.ts:104-137` | 验证码失败计数逻辑错误（统计发送次数非失败次数），6 位 PIN 可无限尝试 | 独立失败计数器 + 3 次失败标记无效 + IP 速率限制 | 安全卫士 |
| 25 | 🟡 | 安全-SQL注入绕过 | `deployment.service.ts:545-567` | 迁移端点按 `;` 分割执行，子语句绕过整体验证；`DROP` 可用注释绕过 | 每条子语句独立校验 + AST 级 SQL 解析 | 安全卫士 |
| 26 | 🟡 | QA-TypeScript | `frontend/src/` | 689+ TypeScript 类型错误，Customer 接口不一致、AxiosResponse 未解包 | 统一类型定义 + request.ts 拦截器正确解包 | 质量门神 |
| 27 | 🟡 | QA-测试失败 | `inventory.service.spec.ts` + `order.service.spec.ts` | 2/3 后端测试套件失败，依赖注入 mock 不完整 | 补齐 InventoryDocument/CustomerService/DataSource mock | 质量门神 |
| 28 | 🟢 | QA-配置缺失 | 项目根目录 | 缺少 `.gitignore` 和 `.env.example` | 创建两个文件 | 安全卫士+质量门神 |
| 29 | 🟢 | QA-bundle过大 | `request-CQ4SdxJJ.js` | 895KB (gzip 287KB)，element-plus 全量引入 | 改为按需引入 + vendor chunk 拆分 | 质量门神 |
| 30 | 🟢 | 代码-any滥用 | 后端 30+ 处 + 前端全 `Record<string,unknown>` | ProductService 全 `any`，订单 API 全 `Record<string,unknown>` | Service 签名用 DTO 类型 + 前端定义请求/响应类型 | 产品官 |
| 31 | 🟢 | 代码-备份残留 | `frontend/src/api/*.bak*` 等 10 个 | .bak 文件随发布增加体积、泄露版本信息 | 删除 + `.gitignore` 添加 `*.bak*` | 产品官+质量门神 |
| 32 | 🟢 | QA-启动脚本 | `start.bat` | 硬编码 15 秒等待后端启动 | 改为轮询 `/health` 端点 | 质量门神 |
| 33 | 🟢 | 安全-CORS | `main.ts:40-45` | CORS 默认 localhost:5173，生产需手动配置 | 启动时检查 NODE_ENV=production 下 CORS_ORIGIN 不可为 localhost 或 * | 安全卫士 |
| 34 | 🟢 | 安全-审计日志 | `audit-log.controller.ts` | 缺少 `@Roles()` 限制，任意认证用户可查看审计日志 | 添加 `@Roles('super_admin', 'admin')` | 安全卫士 |

---

## 3. 上线阻断项清单（必须修复）

| # | 编号 | 问题 | 影响 | 修复方案 | 预估工时 |
|---|------|------|------|---------|---------|
| 1 | #1 | Deployment 命令注入 (execSync) | 攻击者可执行任意 shell 命令，接管服务器 | execSync → execFileSync + 输入白名单 + DB密码用 --defaults-extra-file | 4h |
| 2 | #2 | Wizard 未认证端点 | 可 SSRF 探测内网、注入数据库凭据、执行建表 | 初始化后禁用 + IP白名单 + 移除 @Public | 2h |
| 3 | #3 | CustomerAuthAdmin 越权 | 任意用户可重置客户密码、接管客户账户 | 添加 @Roles('super_admin', 'admin') | 0.5h |
| 4 | #4 | start:prod 路径错误 | 生产环境无法启动 | 修正路径为 node dist/main | 0.1h |
| 5 | #5 | init-structure.sql DROP TABLE | 误执行可摧毁全部生产数据 | 改 CREATE TABLE IF NOT EXISTS + 警告头 | 1h |

---

## 4. 回滚预案

| 场景 | 预案 |
|------|------|
| 修复引入新 bug | 每个修复独立提交，可 cherry-pick 回滚单个修复 |
| 生产数据库被 DROP | **无法回滚**（这正是 #5 的危险性）→ 修复后此场景不再可能 |
| 修复后服务启动失败 | 保留旧版 start:prod 命令行作为备份入口 |
| JWT_SECRET 变更导致已登录用户失效 | 可接受——上线首日用户量极少，发公告说明即可 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 修复 Deployment execSync 命令注入 | 后端开发 | P0 | 上线前 |
| 2 | 加固 Wizard 端点（初始化后禁用+IP白名单） | 后端开发 | P0 | 上线前 |
| 3 | CustomerAuthAdmin 添加 @Roles('super_admin','admin') | 后端开发 | P0 | 上线前 |
| 4 | 修正 start:prod 入口路径 | 后端开发 | P0 | 上线前 |
| 5 | init-structure.sql 改为 CREATE TABLE IF NOT EXISTS | 后端开发 | P0 | 上线前 |
| 6 | 字典控制器动态列名反引号包裹+白名单 | 后端开发 | P1 | 上线前 |
| 7 | UpdateOrderStatusDto.status 添加 @IsEnum | 后端开发 | P1 | 上线前 |
| 8 | 前端 user store JSON.parse 加 try-catch | 前端开发 | P1 | 上线前 |
| 9 | Order/Inventory/AfterSales/DraftPool/Upload 控制器添加 @Roles | 后端开发 | P1 | 上线后首轮 |
| 10 | 创建 .gitignore + .env.example | 运维 | P1 | 上线前 |
| 11 | JWT_SECRET 启动强度检查 | 后端开发 | P1 | 上线前 |
| 12 | 修复后端 inventory/order spec 测试 | 后端开发 | P1 | 上线后首轮 |
| 13 | Deployment 迁移端点子语句独立校验 | 后端开发 | P2 | 上线后首轮 |
| 14 | 暴力破解防护迁移 Redis + SMS 验证码独立失败计数 | 后端开发 | P2 | 上线后第二轮 |

---

## ⚠️ 待完善 / 已知局限

- 前端 689+ TypeScript 类型错误短期无法全修，建议上线后分批处理
- 后端测试覆盖率仅 ~9%（3/34 controller），核心业务模块无有效测试
- Refresh Token 机制、httpOnly Cookie 迁移涉及前后端联动改造，建议上线后专项推进
- openoba-core 为 BSL 闭源编译产物，本次审查仅基于 .d.ts 类型声明推断，无法深入审查实现
- element-plus 全量引入导致 bundle 过大，需前端架构调整

---

## 🏗️ 架构亮点（值得肯定）

1. ✅ 事务管理扎实：订单创建/支付/发货/取消全部用 QueryRunner + 悲观锁
2. ✅ 订单状态机矩阵（VALID_TRANSITIONS）设计清晰
3. ✅ 统一响应格式（TransformInterceptor）+ 异常过滤器完善
4. ✅ 数据脱敏工具（data-mask.util.ts）覆盖手机/邮箱/身份证/地址/姓名
5. ✅ 全局 JwtAuthGuard + RolesGuard 作为 APP_GUARD，默认需认证
6. ✅ ValidationPipe(whitelist: true, forbidNonWhitelisted: true) 全局开启
7. ✅ 价格引擎服务端计算，客户端提交价格不被信任
8. ✅ Helmet 安全头、生产环境 Swagger 禁用
9. ✅ bcrypt 密码哈希 + 独立客户 JWT 密钥
10. ✅ SMS 发送频率限制（60s 冷却、每日 10 条/IP 20 条）

---

## 📚 成员产出索引

- gstack-product-reviewer（产品官）原始产出：代码审查 4 P0 + 7 P1 + 7 P2，架构亮点 5 项
- gstack-security-officer（安全卫士）原始产出：OWASP+STRIDE 审计 3 Critical + 6 High + 5 Medium + 3 Low，STRIDE 威胁模型 8 项，安全评级 D
- gstack-qa-lead（质量门神）原始产出：QA 测试 2 P0 + 3 P1 + 7 P2 + 7 P3，健康度 52/100，后端编译通过/前端 93 测试通过/后端 2/3 spec 失败

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
