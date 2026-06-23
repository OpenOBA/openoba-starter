# 🛡️ OpenOBA 五层质量门禁体系

> 确立于 2026-06-24 · 唐浩然 · 未经 Henry 批准，不得降低任何标准

---

## 总纲

每一行代码变更在进入 master 之前，必须通过五层门禁。**顺序不可跳，层级不可降。** 任何一层失败 = 不允许提交。

```
┌─────────────────────────────────────────────────────────┐
│  第一层  基线门    Git + Build                          │
│  第二层  类型门    0 any + 0 tsc errors                 │
│  第三层  测试门    全部 test suites 通过                 │
│  第四层  规范门    ESLint 0 errors + 0 warnings         │
│  第五层  审查门    架构合规 + 命名一致 + 无硬编码 + 文档 │
└─────────────────────────────────────────────────────────┘
```

---

## 第一层：基线门（Git + Build）

### 检查项
1. `git status` 必须 clean（允许 untracked 非代码文件）
2. `npm run build:backend` → **0 errors**
3. 后端 build = `tsc -p packages/core/tsconfig.json` + `nest build`

### 执行命令
```powershell
cd <project-root>
git status
npm run build:backend
```

### 红线
- ❌ 有未提交的代码变更
- ❌ Build 失败或报 warning 视为不通过
- ❌ 任何 error 级别的 tsc 输出

---

## 第二层：类型门（0 any + 0 tsc）

### 检查项
1. **前端 `any` 关键词 = 0**（含 .ts / .vue，含测试文件）
2. **后端 `any` 关键词 = 0**（含 .ts，排除 eslint-disable 注释）
3. **vue-tsc 0 errors**
4. **tsc --noEmit 0 errors**

### 执行命令
```powershell
# 前端 any 审计
Select-String -Path (Get-ChildItem frontend\src -Recurse -Include *.ts,*.vue).FullName -Pattern '\bany\b' | Measure-Object
# 预期输出：Count = 0

# 后端 any 审计
Select-String -Path (Get-ChildItem packages\backend\src -Recurse -Include *.ts -Exclude *.spec.ts).FullName -Pattern '\bany\b' | Where-Object { $_.Line -notmatch 'eslint-disable' } | Measure-Object
# 预期输出：Count = 0

# 前端类型
cd frontend; npx vue-tsc -b
# 预期输出：Exit code 0

# 后端类型
cd packages\backend; npx tsc -p tsconfig.json --noEmit
# 预期输出：Exit code 0
```

### 红线
- ❌ 产品代码中出现任何 `any` 关键词
- ❌ `as any` 强制类型断言
- ❌ `@ts-ignore` 注释
- ❌ `catch (e: any)` 模式（只允许 `catch (e: unknown)`）
- ❌ 测试文件中 `Record<string, any>`（应使用 `Record<string, unknown>`）

---

## 第三层：测试门（All Tests Pass）

### 检查项
1. **后端 test**：35 suites / 104+ tests → 0 failures
2. **前端 vitest**：7 suites / 93 tests → 0 failures

### 执行命令
```powershell
cd packages\backend; npm test
cd frontend; npx vitest run
```

### 红线
- ❌ 任何测试失败
- ❌ 测试超时或卡住
- ❌ Skipped tests 仅允许已知的 baseline（当前 7 skipped）

---

## 第四层：规范门（ESLint 0 errors）

### 检查项
1. **前端 ESLint errors = 0**
2. **前端 ESLint warnings 允许 baseline（当前 83 warnings）**
3. **Prettier auto-fix 在 pre-commit hook 中执行**

### 执行命令
```powershell
npx eslint frontend/src --ext .ts,.vue --quiet
# 预期输出：无（Exit code 0）
```

### 红线
- ❌ 任何 ESLint error
- ❌ 新增 ESLint warnings 超过 baseline
- ❌ 绕过 pre-commit hook 提交（禁止 `--no-verify`）

---

## 第五层：审查门（架构 + 规范 + 文档）

### 检查项
1. **架构合规**：变更不破坏三层架构（ERDL / Agent 引擎 / 审计日志）
2. **命名一致**：Entity / DTO / Service / Component 命名遵循项目规范
3. **路径不写死**：无硬编码绝对路径，兼容多次分发
4. **无 hack / workaround**：每个问题需要根因修复
5. **文档同步**：涉及 API 变更时同步更新 docs/
6. **CHANGELOG**：重大变更需记录

### 红线
- ❌ 架构层面的临时方案（hack）
- ❌ 命名不一致（如新旧名称混用）
- ❌ 硬编码路径或环境依赖
- ❌ 无注释的复杂逻辑
- ❌ 安全敏感操作未记录

---

## 质量门禁流程（每次 commit 必须执行）

```
修改代码
  → L1 基线门（git status clean + build pass）
  → L2 类型门（0 any + tsc 0 errors）
  → L3 测试门（全 tests pass）
  → L4 规范门（ESLint 0 errors）
  → L5 审查门（Henry review）
  → 提交到 master
```

**门禁失败处理：**
- 前 4 层失败 → 退回修改，不得提交
- 第 5 层失败 → 退回修改 + 记录问题到 docs/schema-tracker/

---

## 当前基线快照（2026-06-24）

| 层级 | 门禁 | 状态 | 基线值 |
|------|------|------|--------|
| L1 | Git Clean | ✅ | 0 uncommitted |
| L1 | Build | ✅ | 0 errors |
| L2 | Frontend any | ✅ | 0 |
| L2 | Backend any | ✅ | 0 |
| L2 | vue-tsc | ✅ | 0 errors |
| L2 | tsc --noEmit | ✅ | 0 errors |
| L3 | Backend test | ✅ | 35 suites / 104 passed / 7 skipped |
| L3 | Frontend vitest | ✅ | 7 suites / 93 passed |
| L4 | ESLint errors | ✅ | 0 errors |
| L4 | ESLint warnings | 🟡 | 83 warnings (baseline) |

---

> 💡 五层门禁是 OpenOBA 代码质量不可商议的底线。
> 未经 Henry 明确批准，任何质量门禁不得放宽、跳过或降级。
