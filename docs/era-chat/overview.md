# ERA-Chat — Agent Conversation Workspace

> The natural-language interface to the OpenOBA AI executor.

## What is ERA-Chat

Conversational workspace for OpenOBA. Talk to the AI executor in plain language — create orders, query inventory, edit code — and watch execution unfold in real time.

Tech: Vue 3.5 + Element Plus, WebSocket (Socket.IO) with SSE streaming fallback.

## Quick Start

1. Open OpenOBA frontend → click **ERA-Chat** tab
2. Type a request, press Enter

Examples: `"stock below 10"`, `"create customer John Doe, john@example.com"`

## Key Features

- **NL Task Execution**: CRUD, analytics, code edits — all from natural language
- **ReAct Timeline**: Live visualization of Thought → Tool → Observation → Round Done
- **File-Edit + Compile-Check**: AI modifies code → compiles → auto-fixes errors → confirms
- **Task Proposals**: AI proposes actions, human approves before execution
- **Deliverable Export**: Export session as Markdown (changelog + diffs + version info)

## Interface

| Area | Purpose |
|------|---------|
| Chat (center) | Compose messages, view responses |
| Timeline (right) | Live ReAct execution timeline |
| Task History (left) | Previous sessions, searchable |

Components: `AgentChat`, `ReActTimeline`, `TaskProposals`, `EraChatWelcome`

## Configuration

- **Model Selection**: Dropdown in header to switch LLM backends (DeepSeek, Qwen)
- **API Keys**: Manage in OpenOBA settings; configure before using external providers

## Prompt Tips

- Be specific: `"product SKU ABC-123"` not `"that product"`
- Clear actions: `"set quantity to 50"` not `"change it"`
- Include thresholds: `"stock below 10"`
- Break complex tasks into smaller steps

## Architecture

```
[ERA-Chat (Vue 3.5)] ──WebSocket──▶ [ChatModule]
       │                                  │
       ▼                                  ▼
[Timeline Panel] ◀──SSE Stream── [ReAct → Guard → ERDL → Skills]
```

- WebSocket-first with SSE streaming events: `thought, tool_start, tool_end, observation, round_done`
- Component-local reactive state (no external store)
- Backend: ChatModule manages connections, dispatches to ErosTaskModule (ReAct), Action Guard (3-tier validation), ERDL (semantic translation)

## Further Reading

- [Architecture Overview](../architecture/overview.md)
- [Module List](../architecture/module-list.md)
- [ERDL Protocol](../erdl/overview.md)
