# OpenOBA CORE 包 any 深度清理方案

> 审计：2026-06-22 | 唐浩然  
> 目标：CORE 包 57 any → 0  
> 原则：逐文件攻，不批量；每个方案需 Henry 审查后执行

---

## 一、全景

| 难度 | 数量 | 策略 |
|------|------|------|
| **Easy（33）** | 可直接替换类型名字 | 第一梯队，30 分钟全清 |
| **Medium（13）** | 需定义接口/类型 | 第二梯队，1-2 小时 |
| **Hard（11）** | 需架构级重构 | 第三梯队，逐个评审 |

---

## 二、第一梯队：Easy（33 any）— 直接替换

### 1. `common/filters/http-exception.filter.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L29 | `(message as any).message` | `(message as Record<string, unknown>).message as string` |

### 2. `common/data-mask.util.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L69 | `config.mask as any` | `config.mask as (match: string) => string` |

### 3. `modules/auth/auth.controller.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L45 | `req: any` | `req: Request`（import from express） |

### 4. `modules/system/deployment.controller.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L145 | `body.status as any` | `body.status as unknown as DeltaChange['status']`（需 import DeltaChange type） |
| L178 | `catch (e: any)` | `catch (_e: unknown) + type guard` |

### 5. `modules/system/menu/menu.service.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L41 | `where: { isDeleted: false } as any` | 直接去掉 `as any` |
| L101 | `{ sortOrder: ... } as any` | `as Partial<Menu>` |

### 6. `modules/system/version.controller.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L60 | `Promise<any>` | `Promise<Record<string, unknown>>` |
| L93 | `Promise<any>` | `Promise<Record<string, unknown>>` |

### 7. `modules/draft-pool/draft.service.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L17 | `Record<string, any>` | `Record<string, unknown>` |
| L44 | `Record<string, any>` | `Record<string, unknown>` |

### 8. `modules/draft-pool/draft-pool.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L82 | `Record<string, any>` | `Record<string, unknown>` |

### 9. `modules/eros/stream/sse-safe-writer.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L70 | `(this.res as any).socket` | `(this.res as unknown as { socket: Socket }).socket` |
| L136 | `catch (err: any)` | `catch (_err: unknown) + type guard` |

### 10. `modules/eros/task/agent-security-guard.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L48 | `catch (e: any)` | `catch (_e: unknown) + type guard` |

### 11. `modules/eros/task/knowledge.controller.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L48 | `body as any` | `body as unknown as CreateKnowledgeDto` |
| L72 | `body as any` | `body as unknown as UpdateKnowledgeDto` |

### 12. `modules/eros/deliverable/deliverable.controller.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L54 | `body.status as any` | `body.status as unknown as DeliverableStatus` |

### 13. `modules/eros/deliverable/deliverable.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L111 | `userType as any` | `userType as unknown as Deliverable['userType']` |

### 14. `modules/eros/task/hotword.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L166 | `log.content as any` | `log.content as unknown as Record<string, unknown>` |

### 15. `modules/meta-mirror/generators/depgraph.generator.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L83 | `r.type as any` | `r.type as unknown as DepNodeType` |

### 16. `modules/meta-mirror/meta-mirror.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L106 | `enhancedRules as any` | `enhancedRules as unknown as EnhancedRuleInfo[]` |

### 17. `modules/soul/org-info.builder.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L61 | `catch (e: any)` | `catch (_e: unknown) + type guard` |

### 18. `modules/system/entity-sync.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L91 | `catch (e: any)` | `catch (_e: unknown) + type guard` |

### 19. `modules/system/migration-runner.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L90 | `catch (e: any)` | `catch (_e: unknown) + type guard` |

### 20. `modules/tool-registry/tool-error-mapper.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L34 | `(resp as any)?.message` | `(resp as Record<string, unknown>)?.message as string` |

### 21. `modules/erdl/erdl.controller.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L91 | `(this.registry as any).getFiles()` | `(this.registry as unknown as { getFiles?: () => string[] }).getFiles?.() ?? []` |

### 22. `modules/eros/task/dto/agent-chat.dto.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L57 | `(req as any).user?.id` | `(req as unknown as { user?: { id?: string; sub?: string } }).user?.id` |

### 23. `modules/eros/task/agent-task.service.ts`（1 any, L674）

| 行 | 当前 | 方案 |
|----|------|------|
| L674 | `LessThan(staleTime) as any` | `LessThan(staleTime) as FindOperator<Date>`（TypeORM 原生类型） |

### 24. `modules/llm/llm-sse-handler.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L232 | `catch (err: any)` | `catch (_err: unknown) + type guard` |

---

## 三、第二梯队：Medium（13 any）— 需定义接口

### 25. `modules/eros/task/agent-task.service.ts`（1 any, L577）

| 行 | 当前 | 方案 |
|----|------|------|
| L577 | `const where: any = {}` | 定义 `TaskWhereClause` 接口，包含 `reportTo?: string; status?: AgentTaskStatus` |

### 26. `modules/eros/task/tool-registry-bridge.service.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L31 | `Record<string, any>` | `Record<string, unknown>` |
| L36 | `(props as any)[key]` | `(props as Record<string, JsonSchemaProp>)[key]` — 需从 inputSchema 接口导出 JsonSchemaProp 类型 |

### 27. `modules/system/agent/agent-manifest.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L69 | `Promise<any[]>` | `Promise<AgentManifest[]>`（已有 Entity） |

### 28. `modules/eros/skill/skill-loader.service.ts`（4 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L198 | `value: any` | `value: SkillYaml`（已有类型） |
| L199 | `result: any` | `result: Record<string, unknown>` |
| L203 | `listItems: any[]` | `listItems: Array<Record<string, unknown>>` |
| L296 | `const where: any = {}` | `const where: Pick<SkillRegistry, 'category'> = {}` |

### 29. `modules/erdl/core/entity-proxy.service.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L109 | `(raw as Record<string, any>)` | `(raw as Record<string, unknown>)` |

### 30. `modules/eros/deliverable/deliverable-manifest.entity.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L52 | `Record<string, any>` | `Record<string, unknown>` — 此为 `@Column('json')` 列，TypeORM 原生支持 `Record<string, unknown>` |

### 31. `common/interceptors/transform.interceptor.ts`（1 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L14 | `Observable<any>` | `Observable<unknown>` — NestJS NestInterceptor 接口签名要求 `Observable<unknown>`，完全兼容 |

### 32. `common/rate-limiter/redis-rate-limiter.ts`（1 any, L10）

| 行 | 当前 | 方案 |
|----|------|------|
| L10 | `private redis: any` | `private redis: Redis` — 需 `npm i ioredis`（`@types/ioredis` 已内置），用 `import type Redis from 'ioredis'` |

### 33. `modules/meta-mirror/scanners/erdl-audit.scanner.ts`（2 any）

| 行 | 当前 | 方案 |
|----|------|------|
| L218 | `dtoField: any` | 定义 `DtoFieldInfo` 接口（min/max/isEnum/enumValues 等） |
| L242 | `return 'CODE_LOOSER' as any` | `return 'CODE_LOOSER' as AuditStatus` |

---

## 四、第三梯队：Hard（11 any）— 架构级重构

### 34. `modules/erdl/core/entity-data-bridge.ts`（3 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L3 | `registry?: any` | EntityDataBridge 是**占位类**（所有方法返回空），尚未实现 | **方案 A**：补充实现，同步定义 IEntityDataRegistry 接口 |
| L6 | `data: any[], mapping: any` | 同上 | **方案 B**：暂用 `unknown` 替代，标记 `@deprecated TODO(#entity-bridge)` |
| L7 | `entities: any[]` | 同上 | 同 B |

**推荐**：方案 B — 占位类暂用 `unknown` 替代，加 `@deprecated` JSDoc。不阻塞其余清理。

### 35. `modules/erdl/parser/erdl-parser.ts`（3 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L27/L151 | `z.any().optional()` | Zod schema 中的动态属性值。`PropertySchema.default` 和 `ActionParamSchema.default` 可以是任意类型 | 定义 `ERDLDefaultValue = string \| number \| boolean \| null \| Record<string, unknown>`，用 `z.union([...])` 替代 `z.any()` |
| L58 | `z.record(z.string(), z.any())` | RuleAction.params 的值可以是任意类型 | 定义 `ERDLParamValue = z.union([z.string(), z.number(), z.boolean(), z.record(z.string(), z.unknown())])` |

**风险**：Zod 的 `z.any()` 替换为具体 union 后，现有 YAML 文件可能解析失败（如果 default 值不是预期类型）。需要**全量测试所有 .erdl.yml 文件**。

### 36. `modules/erdl/core/erdl-action-guard.ts`（1 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L72 | `rawChoices: any[]` | LLM 返回的 choices 是动态 JSON | 定义 `LLMChoice = { message?: { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }` 接口 |

**风险**：LLM 返回格式不稳定，接口需要覆盖所有可能字段组合。需要**对照实际 LLM API 响应定义接口**。

### 37. `common/guards/jwt-auth.guard.ts`（1 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L46 | `request: any` | Passport + Express 类型桥接 | 用 `request: Request` + JWT payload 自定义类型。定义 `JwtRequest = Request & { user?: JwtPayload }` |

### 38. `main.ts`（1 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L57 | `reason: any` | `unhandledRejection` 事件签名 | `reason: unknown` — Node.js 原生支持 |

### 39. `common/rate-limiter/redis-rate-limiter.ts`（1 any, L12）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L12 | `redisClient: any` | ioredis 类型未安装 | 安装 `ioredis` — 同 #32 |

### 40. `modules/eros/chat/chat.session-manager.ts`（1 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L116 | `payload: any` | WebSocket 广播的 payload 可以是任意事件数据 | 定义 `ChatEventPayload = Record<string, unknown> | string` |

### 41. `modules/eros/task/agent-tool-implementations.ts`（1 any）

| 行 | 当前 | 根因 | 方案 |
|----|------|------|------|
| L732 | 复杂嵌套 `as any` 链 | 动态数据表格渲染 | 用中间变量分步类型断言，避免嵌套 `as unknown as` 链 |

---

## 五、执行优先级

| 梯队 | 文件数 | any 数 | 预计耗时 | 风险 |
|------|--------|--------|---------|------|
| **第一梯队** | 24 文件 | 33 any | ~30 分钟 | **零风险** — 纯类型替换 |
| **第二梯队** | 9 文件 | 13 any | ~1 小时 | **低风险** — 需定义少量接口 |
| **第三梯队** | 7 文件 | 11 any | ~3 小时 | **中风险** — Zod schema 变更可能影响 YAML 解析；LLM 响应接口需对照真实 API |

---

## 六、关键决策点（需 Henry 确认）

1. **entity-data-bridge.ts**：占位类，是否现在补充实现？还是暂用 `unknown` + `@deprecated` 标记？
2. **erdl-parser.ts Zod `z.any()`**：替换后需全量回归测试所有 .erdl.yml 文件。是否接受？
3. **redis-rate-limiter.ts**：`npm i ioredis` 会增加依赖。是否接受？还是保持 `any` 标记为第三方库类型缺口？
4. **agent-tool-implementations.ts L732**：这个嵌套断言涉及运行时数据渲染，改动可能影响 Agent 输出。是否需要浏览器实测？
