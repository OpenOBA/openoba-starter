# Testing Guide

> Write, run, debug tests.

---

## Test Frameworks

| Scope | Framework | Config |
|-------|-----------|--------|
| Backend unit | Jest | `packages/backend/jest.config.ts` |
| Core engine | Jest | `packages/core/jest.config.ts` |
| Frontend unit | Vitest | `frontend/vitest.config.ts` |
| E2E | Playwright | `e2e/playwright.config.ts` |

---

## Running Tests

```bash
npm test                      # All
npm test -w packages/backend  # Backend
npm run test -w frontend      # Frontend
npm run test:e2e              # E2E
npm test -w packages/backend -- --coverage
npm run test:e2e -- --headed
npm run test:e2e -- --grep "login"
```

---

## Unit Tests

### Backend (Jest)

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

### Frontend (Vitest)

```typescript
import { it, expect } from 'vitest'
import { formatCurrency } from '@/utils/format'
it('formats', () => { expect(formatCurrency(1234.56)).toBe('¥1,234.56') })
```

---

## E2E Tests (Playwright)

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

## Coverage Targets

| Package | Lines | Branches |
|---------|-------|----------|
| Backend | 70% | 60% |
| Core | 80% | 70% |
| Frontend | 60% | 50% |

CI blocks below thresholds.

---

## CI Pipeline

`npm ci → build:backend → lint → test → test:e2e → coverage gate`

---

## Debugging

```bash
npx jest --verbose path.spec.ts      # Jest verbose
npm run test -w frontend -- --ui     # Vitest UI
npm run test:e2e -- --headed         # Playwright headed
npm run test:e2e -- --trace on       # Playwright trace
```

| Issue | Fix |
|-------|-----|
| `Cannot find module` | `npm run build:backend` first |
| E2E timeout | Start backend first |

---

## Further Reading

- [Environment Setup](./environment-setup.md)
- [Coding Standards](./coding-standards.md)
