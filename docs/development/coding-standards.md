# 编码标准

> OpenOBA Starter 的代码风格、命名规范、提交规范

## 核心原则

1. **可读性优先**：代码是写给人看的，顺便能跑
2. **类型安全**：拒绝 `any`，后端和 Core 实行 `any` 零容忍
3. **单一职责**：一个函数/类/模块只做一件事
4. **防御性编程**：不信任外部输入，校验一切
5. **安全第一**：用 `crypto` 而非 `Math.random`，参数化查询，转义 LIKE

---

## TypeScript 规范

### 类型声明

✅ **正确**：
```typescript
interface CustomerDto {
  name: string;
  phone: string;
  memberLevel: MemberLevel;
}

enum MemberLevel {
  Normal = 'normal',
  Silver = 'silver',
  Gold = 'gold',
}
```

❌ **错误**：
```typescript
interface CustomerDto {
  name: any;        // 禁止 any
  phone: any;
  data: object;     // 用具体接口替代 object
}
```

### `any` 零容忍（后端 + Core）

后端和 Core 的 ESLint 配置已启用 `@typescript-eslint/no-explicit-any` 为 `error`。CI 会拦截。

如果确实需要未知类型，用 `unknown` 并配合类型守卫：

```typescript
// ✅ 正确
function parse(input: unknown): Customer {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid input');
  }
  // ...
}

// ❌ 错误
function parse(input: any): Customer {
  return input;  // 危险
}
```

### 前端 `any` 政策

前端有历史债务（689+ any），CI 暂未强制。但：
- **新代码禁止 `any`**
- **修改文件时顺手清理周边 `any`**

---

## 命名规范

### 变量 / 函数

| 项 | 规范 | 示例 |
|----|------|------|
| 变量 | camelCase | `customerName`、`orderList` |
| 函数 | camelCase，动词开头 | `getCustomer()`、`createOrder()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`、`DEFAULT_PAGE_SIZE` |
| 布尔 | is/has/can/should 前缀 | `isActive`、`hasPermission` |

### 类 / 接口 / 类型

| 项 | 规范 | 示例 |
|----|------|------|
| 类 | PascalCase | `CustomerService`、`OrderController` |
| 接口 | PascalCase（不加 I 前缀） | `Customer`、`Repository`（不是 `ICustomer`） |
| 类型别名 | PascalCase | `OrderStatus`、`MemberLevel` |
| 枚举 | PascalCase + PascalCase 成员 | `enum OrderStatus { Pending, Paid }` |

> ⚠️ v1.4.0 已将 `IRateLimiter` 等接口去掉 `I` 前缀，统一规范。

### 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| NestJS 文件 | kebab-case | `customer.service.ts`、`order.controller.ts` |
| Vue 组件 | PascalCase | `CustomerDetailDrawer.vue`、`SetDialog.vue` |
| Composable | camelCase + use 前缀 | `useCustomers.ts`、`useProductSku.ts` |
| 类型文件 | kebab-case | `api-types.ts`、`index.ts` |
| 测试文件 | 源文件名 + `.spec` | `customer.service.spec.ts` |

### 数据库命名

| 项 | 规范 | 示例 |
|----|------|------|
| 表名 | snake_case，业务表无前缀，系统表 `sys_` 前缀 | `product_spu`、`sys_user` |
| 字段名 | snake_case | `created_at`、`member_level` |
| 主键 | `id`（UUID varchar(36)） | `id varchar(36)` |
| 外键 | `关联表_字段` | `customer_id`、`order_id` |
| 时间戳 | `created_at` / `updated_at` | - |
| 布尔 | `is_` 前缀 | `is_active`、`is_deleted` |

---

## NestJS 后端规范

### 模块组织

```
src/modules/product/
├── product.module.ts          # @Module 定义
├── product.controller.ts      # @Controller 路由
├── product.service.ts         # @Injectable 业务逻辑
├── product.service.spec.ts    # 单元测试
├── product.constants.ts       # 常量/枚举
├── dto/
│   ├── create-product.dto.ts  # 创建 DTO
│   └── update-product.dto.ts  # 更新 DTO
├── entity/
│   └── product.entity.ts      # @Entity TypeORM 实体
└── utils/
    └── barcode.generator.ts   # 模块专用工具
```

### Controller 规范

```typescript
@ApiTags('商品')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: '分页查询商品' })
  async findAll(@Query() query: QueryProductDto): Promise<PageResult<Product>> {
    return this.productService.findAll(query);
  }

  @Post()
  @Roles('admin', 'operator')
  @ApiOperation({ summary: '创建商品' })
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.create(dto);
  }
}
```

**要点**：
- 用 `@ApiTags` / `@ApiOperation` 补充 Swagger 注解
- 用 `@Roles` 装饰器控制权限
- DTO 用 `class-validator` 装饰器校验
- 返回具体类型，不用 `any`

### Service 规范

```typescript
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(query: QueryProductDto): Promise<PageResult<Product>> {
    // 业务逻辑
  }
}
```

**要点**：
- 用 NestJS `Logger`，**禁止 `console.log/warn/error`**
- 错误必须捕获并记录，**禁止空 catch**（静默吞错）
- 事务用 `queryRunner` 或 `DataSource.transaction()`

### 错误处理规范

✅ **正确**：
```typescript
try {
  await this.riskyOperation();
} catch (error) {
  this.logger.warn(`Operation failed: ${error.message}`, error.stack);
  throw new BadRequestException('操作失败，请重试');
}
```

❌ **错误**（静默吞错）：
```typescript
try {
  await this.riskyOperation();
} catch (e) {
  // 啥也不做 —— 灾难
}
```

> v1.4.0 已清理 22 处静默 catch，全部补齐 `logger.warn/debug`。

### 安全编码

| 场景 | 正确做法 | 错误做法 |
|------|---------|---------|
| 随机数 | `crypto.randomUUID()` / `crypto.randomInt()` | `Math.random()` |
| SQL 查询 | TypeORM 参数化 / QueryBuilder | 字符串拼接 SQL |
| LIKE 查询 | 转义 `%` `_` `\` | 直接拼接用户输入 |
| 文件路径 | `resolve()` + `startsWith(root)` 校验 | 直接用用户输入的路径 |
| 命令执行 | `execFileSync`（参数分离） | `execSync`（字符串拼接） |
| 密码存储 | bcrypt 加盐 | 明文 / MD5 |
| 密钥派生 | PBKDF2 10万轮 + salt | 单轮 SHA256 |

> v1.4.0 已修复所有 `Math.random()` 安全用法（36 处 → 0）。

---

## Vue 前端规范

### 组件结构

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomers } from '@/composables/useCustomers';

// Props
const props = defineProps<{
  customerId: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'saved', customer: Customer): void;
}>();

// Composables
const { customers, loading, fetchCustomers } = useCustomers();

// 响应式状态
const form = ref<CustomerForm>({ name: '', phone: '' });

// 计算属性
const isValid = computed(() => form.value.name && form.value.phone);

// 方法
function handleSubmit() {
  if (!isValid.value) return;
  emit('saved', form.value);
}

// 生命周期
onMounted(() => {
  fetchCustomers();
});
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 样式 */
</style>
```

### 组件大小限制

| 类型 | 建议行数 | 硬限制 |
|------|---------|--------|
| 页面视图（views） | < 400 行 | 800 行 |
| 通用组件 | < 300 行 | 600 行 |
| Composable | < 200 行 | 400 行 |

> 超过限制必须拆分。v1.4.0 已拆分 4 个超 800 行的 Vue 文件（Customers.vue 1356→410）。

### API 封装规范

```typescript
// frontend/src/api/customer.ts
import { request } from './request';
import type { Customer, QueryCustomerDto } from './api-types';

export const customerApi = {
  findAll: (params: QueryCustomerDto) =>
    request.get<PageResult<Customer>>('/customers', { params }),

  create: (data: CreateCustomerDto) =>
    request.post<Customer>('/customers', data),
};
```

---

## Git 提交规范

### Conventional Commits

```
<type>(<scope>): <description>
```

| 类型 | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档 |
| `refactor` | 重构（不改功能） |
| `test` | 测试 |
| `chore` | 构建/工具/依赖 |
| `perf` | 性能优化 |
| `style` | 格式（不改逻辑） |
| `ci` | CI 配置 |

**示例**：
```
feat(inventory): add low-stock alert rule

- Add ERDL rule for stock < threshold
- Trigger alert via WebSocket to admin
- Closes #456
```

### 提交粒度

- **一个 commit 一个逻辑变更**：不要把无关改动塞进一个 commit
- **小步提交**：宁可多几个 commit，也不要一个巨大的 commit
- **测试和代码可以同一个 commit**：推荐 `feat` + 对应测试一起提交

---

## 代码审查清单

PR 提交前自检：

- [ ] 代码通过 `npm run lint:all`
- [ ] 后端/Core 无 `any`（CI 会拦截）
- [ ] 测试通过 `npm test`
- [ ] 新功能有测试覆盖
- [ ] 无 `console.log`（用 NestJS `Logger`）
- [ ] 无静默 catch
- [ ] 无 `Math.random()` 用于安全场景
- [ ] SQL 查询参数化
- [ ] LIKE 查询已转义
- [ ] 文件路径有边界校验
- [ ] Swagger 注解完整（新 API）
- [ ] 文档已更新（架构变更时）

## 延伸阅读

- [开发环境搭建](./environment-setup.md)
- [测试指南](./testing.md)
- [贡献指南](../../CONTRIBUTING.md)
- [安全架构](../security/security-architecture.md)
