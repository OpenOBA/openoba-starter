# ERA-Chat — 智能体对话工作台

> OpenOBA AI 执行体的自然语言交互界面。

## 什么是 ERA-Chat

OpenOBA 内置的对话工作台。用自然语言与 AI 执行体交流——创建订单、查询库存、修改代码——实时观察执行全过程。

技术栈：Vue 3.5 + Element Plus，WebSocket 优先（Socket.IO），SSE 流式降级。

## 快速开始

1. 打开 OpenOBA 前端 → 点击 **ERA-Chat** 标签页
2. 输入请求，按回车

示例：`"库存低于 10 的商品"`、`"新建客户 John Doe，john@example.com"`

## 核心功能

- **自然语言任务执行**：CRUD、分析查询、代码编辑，全部通过自然语言驱动
- **ReAct 实时时间线**：思维 → 工具调用 → 观察 → 轮次完成，全流程可视化
- **文件编辑 + 编译检查**：AI 修改代码 → 自动编译 → 错误自修复 → 确认通过
- **任务提案**：AI 提出操作方案，人类审核批准后再执行
- **成果导出**：将会话导出为 Markdown（变更日志 + 文件差异 + 版本信息）

## 界面概览

| 区域 | 用途 |
|------|------|
| 聊天区（中间） | 输入消息，查看回复 |
| 时间线面板（右侧） | 实时 ReAct 执行流程 |
| 任务历史（左侧） | 历史会话，可搜索 |

组件：`AgentChat`、`ReActTimeline`、`TaskProposals`、`EraChatWelcome`

## 配置

- **模型选择**：头部下拉菜单切换 LLM 后端（DeepSeek、Qwen 等）
- **API 密钥**：在 OpenOBA 设置中管理，使用外部 LLM 前需先配置

## 提示技巧

- 具体明确：`"SKU ABC-123"` 而非 `"那个产品"`
- 动作清晰：`"数量设为 50"` 而非 `"改一下"`
- 包含阈值：`"库存低于 10"`
- 复杂任务拆分为小步骤

## 架构

```
[ERA-Chat (Vue 3.5)] ──WebSocket──▶ [ChatModule]
       │                                  │
       ▼                                  ▼
[时间线面板] ◀──SSE 流式── [ReAct → Action Guard → ERDL → Skills]
```

- WebSocket 优先，SSE 流式事件：`thought, tool_start, tool_end, observation, round_done`
- 组件级响应式状态（无外部 Store）
- 后端：ChatModule 管理连接，分发至 ErosTaskModule（ReAct 循环）、Action Guard（三级验证）、ERDL（语义翻译）、Skills（技能执行）

## 延伸阅读

- [架构总览](../architecture/overview.md)
- [模块列表](../architecture/module-list.md)
- [ERDL 协议](../erdl/overview.md)
