# NestJS 11 升级追踪

> 任务：NestJS 全家桶 10.x → 11.x · 支线任务
> 启动：2026-06-11 16:06 · 完成：2026-06-11 16:44
> 负责人：唐浩然

---

## 最终结果

| 指标 | 升级前 | 升级后 |
|------|--------|--------|
| NestJS 版本 | 10.4.22 | **11.1.26（全包统一）** |
| 编译 | ✅ | ✅ 0 errors |
| 测试 | 36/36 | ✅ **36/36 · 111 passed** |
| npm audit | 29 vulns | **18 vulns（-38%）** |

## 版本对照

| 包 | 升级前 | 升级后 |
|----|--------|--------|
| @nestjs/common | 10.4.22 | 11.1.26 |
| @nestjs/core | 10.4.22 | 11.1.26 |
| @nestjs/testing | 10.4.22 | 11.1.26 |
| @nestjs/platform-express | 10.4.22 | 11.1.26 |
| @nestjs/swagger | 7.4.2 | 11.4.4 |
| @nestjs/config | 3.3.0 | 4.0.4 |
| @nestjs/typeorm | 10.0.2 | 11.0.1 |
| @nestjs/jwt | 10.2.0 | 11.0.2 |
| @nestjs/passport | 10.0.3 | 11.0.5 |
| @nestjs/cli | 10.4.9 | 11.2.3 |
| @nestjs/schematics | 10.2.3 | 11.2.6 |
| express | 5.2.1 → 5.2.1 (不变) | ✅ |

## 遇到的阻塞及解决

| # | 问题 | 根因 | 解决 |
|---|------|------|------|
| 1 | 617 编译错误 | 4 个拆分文件编码损坏（stash） | git show blob 二进制恢复 ✅ |
| 2 | product.module.ts 引用不存在文件 | product-color/set/naming.service 未生成 | 移除 import/provider ✅ |
| 3 | 2 个 spec 失败 | Core tgz exports 限制 + node_modules hoisting | 修改 exports + 移动 core 到 backend node_modules + 修正 jest rootDir ✅ |
| 4 | expr-eval/xlsx 重新出现 | package.json 被 stash 覆盖 | 手动移除 + exceljs 替代 ✅ |

## 最终配置变更

- `tsconfig.json`: `@openoba/core/*` paths 从 `../../node_modules` → `node_modules/`
- `@openoba/core` tgz: 删除 `exports` 字段约束（临时）
- `@openoba/core` 安装位置: 根 node_modules → backend node_modules
- `jest rootDir`: `src` → `.`（配合 core 新位置）
- `jest moduleNameMapper`: 更新为 `<rootDir>/node_modules/@openoba/core/dist/$1`
- 移除 expr-eval, xlsx → 替换 exceljs 4.4.0
