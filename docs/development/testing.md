# 测试指南

> 怎么写测试、跑测试、理解测试架构

## 测试体系总览

OpenOBA Starter 采用三层测试策略：

| 层 | 工具 | 范围 | 运行命令 |
|----|------|------|---------|
| **单元测试** | Jest（后端+Core）/ Vitest（前端） | 单个 Service / 函数 / 组件 | `npm test -w packages/backend` |
| **集成测试** | Jest | 模块间协作（Controller + Service + DB） | `npm run test:e2e -w packages/backend` |
| **E2E 测试** | Playwright | 浏览器端到端用户流 | `npm run test:e2e -w frontend` |

---

## 运行测试

### 后端测试（Jest）

```bash
# 运行所有后端测试
npm test -w packages/backend

# 监听模式（开发时推荐）
npm run test:watch -w packages/backend

# 带覆盖率
npm run test:cov -w packages/backend

# 运行单个测试文件
npm test -w packages/backend -- customer.service.spec

# 运行 E2E 测试
npm run test:e2e -w packages/backend
```

### Core 测试（Jest）

```bash
npm test -w packages/core
```

### 前端测试（Vitest）

```bash
# 运行所有前端测试
npm test -w frontend

# 监听模式
npm run test:watch -w frontend

# 带覆盖率
npm run test:coverage -w frontend
```

### E2E 测试（Playwright）

```bash
# 运行所有 E2E
npm run test:e2e -w frontend

# 带 UI 界面（推荐调试时用）
npm run test:e2e:ui -w frontend
```

### 全量测试（CI 等价）

```bash
npm run lint:all                                    # Lint
npm test -w packages/core                           # Core 单测
npm test -w packages/backend                        # 后端单测
npm test -w frontend                                # 前端单测
```

---

## 后端测试（Jest）

### 测试文件位置

测试文件与源文件同目录，命名为 `*.spec.ts`：

```
src/modules/customer/
├── customer.service.ts
├── customer.service.spec.ts        ← 单元测试
├── customer.controller.ts
└── customer.controller.spec.ts     ← 控制器测试
```

### 单元测试模板

```typescript
// customer.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerService } from './customer.service';
import { Customer } from './entity/customer.entity';

describe('CustomerService', () => {
  let service: CustomerService;
  let repo: jest.Mocked<Repository<Customer>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CustomerService);
    repo = module.get(getRepositoryToken(Customer));
  });

  describe('findAll', () => {
    it('应返回分页客户列表', async () => {
      // Arrange
      const mockCustomers = [{ id: '1', name: '张三' }];
      repo.find.mockResolvedValue(mockCustomers as any);

      // Act
      const result = await service.findAll({ page: 1, size: 10 });

      // Assert
      expect(result.list).toEqual(mockCustomers);
      expect(repo.find).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });
  });
});
```

### 测试命名规范

```typescript
describe('CustomerService', () => {          // 类名
  describe('findAll', () => {                 // 方法名
    it('应返回分页客户列表', () => {});        // 行为描述（中文）
    it('应在 page 为负数时抛出 BadRequestException', () => {});
  });
});
```

### 测试原则

1. **AAA 模式**：Arrange（准备）→ Act（执行）→ Assert（断言）
2. **一个 it 测一个行为**：不要在一个测试里断言多个无关行为
3. **Mock 外部依赖**：数据库、HTTP、第三方服务都要 mock
4. **测试名描述行为**：用"应..."而非"测试 xxx"

### 数据库集成测试

需要真实数据库的测试，用 `@nestjs/testing` 创建完整模块：

```typescript
describe('CustomerService (integration)', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: process.env.DB_HOST || 'localhost',
          // ...测试数据库配置
          database: 'openoba_starter_test',
          entities: [Customer],
          synchronize: true,  // 测试用 synchronize
        }),
        TypeOrmModule.forFeature([Customer]),
      ],
      providers: [CustomerService],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // 每个测试前清表
    const repo = module.get(getRepositoryToken(Customer));
    await repo.clear();
  });

  it('应保存客户到数据库', async () => {
    const service = module.get(CustomerService);
    const customer = await service.create({ name: '张三', phone: '13800138000' });
    expect(customer.id).toBeDefined();
  });
});
```

> ⚠️ 集成测试需要 MySQL 运行。CI 会自动启动 MySQL 容器。本地需确保测试数据库存在。

---

## 前端测试（Vitest）

### 测试文件位置

```
frontend/src/
├── __tests__/                    # 通用测试
│   ├── api-product.test.ts
│   ├── api-business.test.ts
│   └── component-logic.test.ts
├── composables/
│   └── useCustomers.ts
└── views/
    └── products/
        └── Products.vue
```

### Composable 测试模板

```typescript
// frontend/src/__tests__/useCustomers.test.ts
import { describe, it, expect, vi } from 'vitest';
import { useCustomers } from '@/composables/useCustomers';

// Mock API
vi.mock('@/api/customer', () => ({
  customerApi: {
    findAll: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  },
}));

describe('useCustomers', () => {
  it('应初始化为空列表', () => {
    const { customers, loading } = useCustomers();
    expect(customers.value).toEqual([]);
    expect(loading.value).toBe(false);
  });
});
```

### 组件测试模板

```typescript
import { mount } from '@vue/test-utils';
import CustomerDetailDrawer from '@/components/CustomerDetailDrawer.vue';

describe('CustomerDetailDrawer', () => {
  it('应显示客户姓名', () => {
    const wrapper = mount(CustomerDetailDrawer, {
      props: { customer: { id: '1', name: '张三' } },
    });
    expect(wrapper.text()).toContain('张三');
  });
});
```

---

## E2E 测试（Playwright）

### 配置

E2E 配置在 `playwright.config.ts`：

```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
```

### E2E 测试模板

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('管理员登录', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="username"]', 'admin');
  await page.fill('[data-testid="password"]', 'admin123');
  await page.click('[data-testid="login-btn"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=仪表盘')).toBeVisible();
});
```

---

## CI 中的测试

CI 配置在 `.github/workflows/ci.yml`，测试流程：

1. **Lint + TypeCheck**（lint-and-typecheck job）
   - ESLint 后端 + Core（`any` 零容忍）
   - TypeScript 类型检查（core + backend + frontend）
   - `npm audit` 安全审计

2. **测试**（test job，依赖 lint 通过）
   - 启动 MySQL 8.0 容器
   - 初始化测试数据库（执行 `database/*.sql`）
   - 运行后端测试（`npm test -w packages/backend`）
   - 运行前端测试（`npm test -w frontend`）

> ⚠️ PR 必须通过 CI 才能合并。本地提交前建议跑一遍 `npm test`。

---

## 覆盖率

### 当前状态

| 包 | 覆盖率 | 目标 |
|----|--------|------|
| packages/backend | ~9%（3/34 controller） | 50%+ |
| packages/core | 部分（ERDL 引擎 20 tests） | 70%+ |
| frontend | 部分 | 40%+ |

### 生成覆盖率报告

```bash
# 后端
npm run test:cov -w packages/backend
# 报告在 coverage/ 目录，打开 coverage/index.html

# 前端
npm run test:coverage -w frontend
```

### 覆盖率要求

- **新功能**：必须有测试，覆盖率不低于 60%
- **Bug 修复**：必须包含回归测试
- **重构**：覆盖率不下降

---

## 测试最佳实践

### 该测什么

✅ **测业务逻辑**：Service 的核心方法、计算逻辑、状态机
✅ **测边界条件**：空值、超长字符串、负数、并发
✅ **测错误路径**：异常是否正确抛出、是否正确记录日志
✅ **测安全相关**：权限校验、输入验证

### 不该测什么

❌ **测框架本身**：不要测 NestJS DI 是否工作
❌ **测第三方库**：不要测 TypeORM save 是否真的存了
❌ **测 getter/setter**：纯赋值不需要测
❌ **测样式**：颜色、间距等视觉问题

### 测试数据

- 用工厂函数生成测试数据，避免重复
- 测试间相互独立，不依赖执行顺序
- 每个测试前清理状态（`beforeEach`）

---

## 常见问题

### 测试报 "Cannot find module '@openoba/core'"

确保已编译 Core：

```bash
npm run build -w packages/core
```

### 后端测试报数据库连接错误

1. 确认 MySQL 运行
2. 确认测试数据库存在：
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS openoba_starter_test DEFAULT CHARACTER SET utf8mb4;"
   ```
3. 确认 `.env` 或环境变量中数据库配置正确

### CI 测试通过但本地失败

通常是环境差异：
- Node.js 版本不一致（CI 用 18，本地可能不同）
- MySQL 版本/配置差异
- 依赖版本不一致（删除 `node_modules` 重装）

---

## 下一步

- [开发环境搭建](./environment-setup.md)
- [编码标准](./coding-standards.md)
- [贡献指南](../../CONTRIBUTING.md)
