# Issue: Agent 长任务执行中 WS 连接断开，前端不同步

> 标签: `bug` `P1` `ws` `agent` `frontend-sync`
> 发现人: Henry + 唐浩然
> 日期: 2026-06-28
> 复现率: 100%（复杂 DDL/代码修改任务）

---

## 现象

在 ERA-Chat 执行复杂任务（如"给商品表新增适用季节字段"）时：
- Agent 在后端**实际执行完毕**（30 轮 ReAct，成功写 9 条 SPU attributes、1 条 inventory_document、4 个源文件，生成 2 个 agent_task proposal）
- 前端 ERA-Chat 界面**仅显示部分执行过程**，最终表现为"卡住"
- 刷新页面后**无法恢复执行状态**

---

## 根因

### 1. WS 连接超时导致 run 被 abort

**`chat.gateway.ts:62-64`**
```
pingInterval: 25000,   // 25s
pingTimeout: 10000,    // 10s
```
复杂 Agent 任务执行时间 3-8 分钟，远超 35s 窗口。Socket.IO 心跳超时断开连接。

**`chat.gateway.ts:126-130`**
```typescript
handleDisconnect(client: Socket) {
  this.runRegistry.abortByClient(client.id)  // ← WS断开即中止run
  this.sessionManager.removeClient(client.id)
}
```
断开时无条件 abort 所有活跃 run，无恢复机制。

### 2. Abort 信号未传递到 LLM Bridge 执行链

**`chat.gateway.ts:255-258`** — 调用 executor 时未传 abortSignal：
```typescript
await this.executor.chatExecute(
  cleanHistory, cleanMessage,
  (event: StreamEvent) => { ... },
  { userId: clientInfo.userId, agentCode: 'tanghaoran', model: data.model },
  // ❌ 缺少: abortController.signal
)
```

**`agent-executor.service.ts:383`** — 调用 llmBridge 时未传 abortSignal：
```typescript
const result = await this.llmBridge.queryWithToolsLegacy(
  enhancedSystemPrompt, fullUserMessage, tools, toolExecutor, onEvent, defaultProviderCode,
  // ❌ 缺少: abortSignal
)
```

**`erdl-llm-bridge.ts:288`** — 传给 queryWithToolsStream 时 abortSignal=undefined：
```typescript
const round = await this.queryWithToolsStream(messages, tools, toolExecutor, onEvent, undefined, preferredProviderCode)
```

### 3. 断开后 Agent 继续执行但结果丢失

时序：
```
T+0     WS 连接 OK，chat.send
T+50s   Socket.IO 心跳超时 → 断开
        handleDisconnect → abortController.abort()
        但 LLM Bridge 没收到 abortSignal → Agent 继续执行
T+5min  Agent 完成 30 轮 ReAct，调用 chat.done
        但 abortController.signal.aborted === true
        → client.emit('chat.done') 被跳过
        → reactTimeline 丢弃
        → 前端收不到完成信号
```

---

## 影响范围

| 场景 | 触发 | 严重度 |
|------|:--:|:--:|
| 简单查询（<30s） | ❌ | — |
| 多步查询（30s-2min） | ⚠️ 可能 | 中 |
| DDL/代码修改任务（3min+） | ✅ 100% | **高** |
| 手动刷新页面 | ✅ 100% | 中 |

---

## 修复方案

### A. WS 超时配置调优（低风险，立即见效）

`chat.gateway.ts`:
```
pingInterval: 45000,    // 25s → 45s
pingTimeout: 60000,     // 10s → 60s
```

### B. AbortSignal 链传递（核心修复）

| 文件 | 改动 |
|------|------|
| `chat.gateway.ts:255` | 传 `abortController.signal` 到 `chatExecute` |
| `agent-executor.service.ts:chatExecute` | 接收 `abortSignal` 参数 → 传入 `queryWithToolsLegacy` |
| `erdl-llm-bridge.ts:queryWithToolsLegacy` | 接收 `abortSignal` → 传入 `queryWithToolsStream` |

### C. WS 断开后 run 保留 + 前端重连恢复（健壮性增强）

| 文件 | 改动 |
|------|------|
| `chat.gateway.ts:handleDisconnect` | 不 abort run，改为标记 `disconnected` |
| `run-registry.ts` | 新增 `markDisconnected()` / `reconnect()` |
| `useAgentChat.ts` | WS 重连后查询活跃 run 并恢复流式监听 |
| `useWsClient.ts` | 重连时传 sessionKey 到服务端 |

---

## 执行痕迹确认（2026-06-28）

### 数据库写入（全部成功）

| 表 | 操作 | 记录数 | 确认 |
|---|------|:--:|:--:|
| `product_spu` | UPDATE attributes JSON | 9 条 | ✅ `{"season":"四季通用"/"春夏"}` |
| `inventory_document` | INSERT 入库单 | 1 条 | ✅ `STKIN-20260703-0001` |
| `agent_task` | UPDATE status=proposed | 2 条 | ✅ TASK-438 + TASK-819 |

### 文件系统写入（全部成功）

| 文件 | 操作 | LastWrite | 确认 |
|------|------|-----------|:--:|
| `product-spu.entity.ts` | 新增 `seasonTags` Column | 15:44:02 | ✅ |
| `product.constants.ts` | 新增 `SEASON_TAGS` 常量 | 15:45:24 | ✅ |
| `eyewear.schema.ts` | 新增 `seasonTags` Schema | 15:46:49 | ✅ |
| `44-add-season-tags-to-product-spu.sql` | 新建 migration | 15:48:08 | ✅ |

### 数据库表结构（未执行 SQL）

| 操作 | 状态 | 说明 |
|------|:--:|------|
| `ALTER TABLE product_spu ADD season_tags` | ✘ 未执行 | migration SQL 仅写入文件 |

---

## 临时规避

避免在 ERA-Chat 中提交超长任务（3min+）；复杂 DDL 任务建议分步执行。

---

_关联: V1.5.0-alpha · 开源上线前_
