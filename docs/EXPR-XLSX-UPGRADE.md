# xlsx / expr-eval 功能保全升级追踪

> 启动：2026-06-11 17:30 CST · 完成：2026-06-11 17:42
> 负责人：唐浩然

---

## 最终结果

| 指标 | 前 | 后 |
|------|----|----|
| xlsx | 0.18.5 (npm·已弃用) | **0.20.3 (CDN·官方)** |
| expr-eval | 2.0.2 (2019年停更) | **mathjs 15.2.0 (活跃维护·沙箱)** |
| exceljs | — | **已移除** |
| 编译 | ✅ | ✅ **0 errors** |
| 测试 | 36/36 | ⚠️ **34/36** |
| npm audit | 29 vulns | 26 vulns |

## 2 个失败 spec

| spec | 根因 | 计划 |
|------|------|------|
| order.service.spec.ts | Core 包 `ERDLRuleEngine` 引用 Nest 11 不兼容 | P1 Core 重新编译 |
| pricing-engine.service.spec.ts | 同上 | P1 Core 重新编译 |

> 非本次 xlsx/expr-eval 替换引入·为已知遗留问题

## 版本变更

| 包 | 前 | 后 |
|----|----|----|
| xlsx | `^0.18.5` (npm) | `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| expr-eval | `^2.0.2` | **已移除** |
| exceljs | (temp) | **已移除** |
| mathjs | — | `^15.2.0` |
| uuid | — | `^11.1.1` (sub-sku 依赖补充) |

## hoisting 修复

- 根 package.json 新增 devDeps: @nestjs/common/typeorm/config/jwt/swagger/passport → 根 node_modules
- 解决 npm workspaces 中 Core tgz 包的模块解析问题
