# Coding Standards

> Code quality rules for the OpenOBA monorepo.

---

## TypeScript

All `tsconfig.json` enforce `strict: true`:

- **0 `any`** — use typed alternatives
- **No `@ts-ignore`** — fix the root cause
- Nullable uses `\| undefined`
- Shared types in `@openoba/types`

---

## File Naming

| Type | Example |
|------|---------|
| Service | `customer.service.ts` |
| Controller | `order.controller.ts` |
| Entity | `product-sku.entity.ts` |
| DTO | `create-order.dto.ts` |
| Vue | `CustomerDetail.vue` |
| Composable | `useWsClient.ts` |
| ERDL | `inventory.erdl.yaml` |
| Test | `*.spec.ts` |

---

## Import Order

```typescript
// 1. Node built-ins
import { join } from 'path';
// 2. External packages
import { Module } from '@nestjs/common';
// 3. @openoba packages
import { ERDLRuleEngine } from '@openoba/core';
// 4. Absolute imports
import { RolesGuard } from 'src/common/roles.guard';
// 5. Relative imports
import { CustomerEntity } from './customer.entity';
```

Blank line between groups. Enforced by ESLint.

---

## Vue 3 Components

All use `<script setup lang="ts">`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Customer } from '@openoba/types'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ update: [data: Customer] }>()
const customer = ref<Customer | null>(null)
</script>
```

Props/emits always typed. Keep components < 300 lines. Extract logic to composables.

---

## NestJS Services

- Constructor injection only
- One service per domain
- Controllers return DTOs, services return entities
- `@Transaction()` for multi-entity writes
- Never leak TypeORM exceptions — map to typed errors:

```typescript
try {
  await this.repo.save(dto)
} catch (err) {
  if (err instanceof QueryFailedError)
    throw new ConflictException('Constraint violation')
  throw new InternalServerErrorException()
}
```

---

## Conventional Commits

```
<type>(<scope>): <subject>
```

`feat` | `fix` | `refactor` | `test` | `docs` | `chore`

Example: `fix(inventory): correct stock transfer quantity`

---

## Git Workflow

1. `git checkout -b feat/name` from `main`
2. One commit per logical change
3. PR → `main`, CI must pass
4. ≥ 1 approval, squash merge

---

## Code Review Checklist

- [ ] No `any` or `@ts-ignore`
- [ ] Typed error handling
- [ ] Imports in order
- [ ] Naming conventions
- [ ] Tests included
- [ ] Conventional Commits
- [ ] `npm run lint` passes

---

## Further Reading

- [Environment Setup](./environment-setup.md)
- [Testing Guide](./testing.md)
