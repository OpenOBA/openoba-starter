# 测试指南

> 编写、运行、调试测试。

---

## 测试框架

| 范围 | 框架 | 配置 |
|------|------|------|
| 后端单元 | Jest | `packages/backend/jest.config.ts` |
| Core 引擎 | Jest | `packages/core/jest.config.ts` |
| 前端单元 | Vitest | `frontend/vitest.config.ts` |
| E2E | Playwright | `e2e/playwright.config.ts` |

---

## 运行测试

```bash
npm test                      # 全部
npm test -w packages/backend  # 后端
npm run test -w frontend      # 前端
npm run test:e2e              # E2E
npm test -w packages/backend -- --coverage
npm run test:e2e -- --headed
npm run test:e2e -- --grep "login"
```

---

## 单元测试

### 后端（Jest）

```typescript
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

describe('CustomerService', () => {
  let service: CustomerService, repo: jest.Mocked<Repository<CustomerEntity>>
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [CustomerService, {
        provide: getRepositoryToken(CustomerEntity),
        useValue: { findOne: jest.fn() },
      }],
    }).compile()
    service = m.get(CustomerService)
    repo = m.get(getRepositoryToken(CustomerEntity))
  })
  it('finds by id', async () => {
    repo.findOne.mockResolvedValue({ id: 'u1', name: 'Test' } as CustomerEntity)
    expect((await service.findById('u1')).name).toBe('Test')
  })
  it('throws on missing', async () => {
    repo.findOne.mockResolvedValue(null)
    await expect(service.findById('x')).rejects.toThrow(NotFoundException)
  })
})
```

### 前端（Vitest）

```typescript
import { it, expect } from 'vitest'
import { formatCurrency } from '@/utils/format'
it('formats', () => { expect(formatCurrency(1234.56)).toBe('¥1,234.56') })
```

---

## E2E 测试（Playwright）

```typescript
import { test, expect } from '@playwright/test'
test('ERA-Chat responds', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await expect(page.locator('.era-chat')).toBeVisible()
  await page.locator('.chat-input').fill('Hello')
  await page.locator('.chat-send').click()
  await expect(page.locator('.chat-message.ai')).toBeVisible({ timeout: 15000 })
})
```

---

## 覆盖率目标

| 包 | 行 | 分支 |
|----|----|------|
| Backend | 70% | 60% |
| Core | 80% | 70% |
| Frontend | 60% | 50% |

CI 低于阈值则阻止合并。

---

## CI 流水线

PR → `main`：`npm ci → build:backend → lint → test → test:e2e → coverage gate`

---

## 调试

```bash
npx jest --verbose path.spec.ts      # Jest 详细
npm run test -w frontend -- --ui     # Vitest UI
npm run test:e2e -- --headed         # Playwright headed
npm run test:e2e -- --trace on       # Playwright trace
```

| 问题 | 修复 |
|------|------|
| `Cannot find module` | 先 `npm run build:backend` |
| E2E 超时 | 先启动后端 |

---

## 延伸阅读

- [环境配置](./environment-setup.zh-CN.md)
- [编码规范](./coding-standards.zh-CN.md)
