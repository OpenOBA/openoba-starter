# 编码规范

> OpenOBA Monorepo 代码质量规则。

---

## TypeScript

所有 `tsconfig.json` 强制 `strict: true`：

- **0 `any`** — 使用类型化替代方案
- **禁止 `@ts-ignore`** — 修复根本原因
- 可空类型使用 `\| undefined`
- 共享类型放在 `@openoba/types`

---

## 文件命名

| 类型 | 示例 |
|------|------|
| Service | `customer.service.ts` |
| Controller | `order.controller.ts` |
| Entity | `product-sku.entity.ts` |
| DTO | `create-order.dto.ts` |
| Vue | `CustomerDetail.vue` |
| Composable | `useWsClient.ts` |
| ERDL | `inventory.erdl.yaml` |
| 测试 | `*.spec.ts` |

---

## 导入顺序

```typescript
// 1. Node 内置
import { join } from 'path';
// 2. 外部包
import { Module } from '@nestjs/common';
// 3. @openoba 包
import { ERDLRuleEngine } from '@openoba/core';
// 4. 绝对导入
import { RolesGuard } from 'src/common/roles.guard';
// 5. 相对导入
import { CustomerEntity } from './customer.entity';
```

组间空一行。ESLint 强制执行。

---

## Vue 3 组件

全部使用 `<script setup lang="ts">`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Customer } from '@openoba/types'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ update: [data: Customer] }>()
const customer = ref<Customer | null>(null)
</script>
```

Props/emits 始终类型化。组件 < 300 行。逻辑提取到组合式函数。

---

## NestJS 服务

- 仅构造函数注入
- 每个领域一个服务
- 控制器返回 DTO，服务返回实体
- 多实体写操作使用 `@Transaction()`
- 不泄露 TypeORM 异常 — 映射为类型化错误：

```typescript
try {
  await this.repo.save(dto)
} catch (err) {
  if (err instanceof QueryFailedError)
    throw new ConflictException('约束违反')
  throw new InternalServerErrorException()
}
```

---

## Conventional Commits

```
<type>(<scope>): <subject>
```

`feat` | `fix` | `refactor` | `test` | `docs` | `chore`

示例：`fix(inventory): correct stock transfer quantity`

---

## Git 工作流

1. 从 `main` 拉分支：`git checkout -b feat/name`
2. 一个逻辑一个提交
3. PR → `main`，CI 必须通过
4. ≥ 1 人批准，squash 合并

---

## 代码审查清单

- [ ] 无 `any` 或 `@ts-ignore`
- [ ] 类型化错误处理
- [ ] 导入按顺序
- [ ] 命名符合规范
- [ ] 附带测试
- [ ] Conventional Commits 格式
- [ ] `npm run lint` 通过

---

## 延伸阅读

- [环境配置](./environment-setup.zh-CN.md)
- [测试指南](./testing.zh-CN.md)
