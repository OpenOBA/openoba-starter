# HN Launch Post �?Drafts & Variants

> Ready-to-use drafts for Hacker News "Show HN" launch.

---

## Primary Draft

```
Show HN: I can't code. I built an enterprise ERP with one AI executor in 3 months

Three months ago, I couldn't write a line of TypeScript. Today, I'm shipping
OpenOBA �?an enterprise system with 22 backend modules, 72 entities, and 18
AI-executable skills.

How? One human + one AI executor. I defined the business direction. The AI
designed the architecture, wrote the code, ran the tests, and fixed its own bugs.

The system has:
- 0 TypeScript strict-mode errors
- 0 ESLint errors
- 0 `any` type usages
- 3,200+ commits in ~90 days
- 35 backend test suites + 7 frontend suites

This is NOT "AI writing code snippets." This is an AI executor operating as a
full-stack engineering partner inside a real enterprise system. The AI edits
code, compiles it, tests it, and rolls back on failure �?autonomously.

The key: ERDL (Entity-Relation Dynamic Language) �?a YAML-superset semantic
protocol that translates enterprise knowledge into rules the AI operates
against deterministically. Not prompt engineering. Protocol-layer constraints.

We're also launching the world's first System Store �?a marketplace where
industry experts turn their knowledge into executable ERDL skeletons. They set
prices. They keep 70%. Like an App Store, but for enterprise systems.

Tech: NestJS 11 + Vue 3 + TypeScript + MySQL + WebSocket streaming.
License: BSL 1.1 (Core) / MIT (Starter).

Repo: https://github.com/openoba/openoba-starter
Docs: https://docs.openoba.com

I'll be here answering questions all day. AMA.
```

---

## Variant A: Developer-Focused

```
Show HN: OpenOBA �?LLM + YAML = Deterministic enterprise system execution

LLMs are great at generating SQL. They're terrible at knowing which table
to query and what rules to follow.

ERDL (Entity-Relation Dynamic Language) fixes this. It's a YAML-superset
semantic protocol with five layers:

Entity �?Alias �?Relation �?Rule �?Action

Define what exists, how humans refer to it, how it connects, what the rules
are, and what operations are allowed. The LLM consumes this as context. The
Action Guard enforces it before any system operation.

No prompt engineering. No guardrails-as-prompts. Protocol-layer constraints.

The entire system was built by 1 human + 1 AI executor in 3 months.
3,200+ commits. 0 TS errors. 0 ESLint errors. 0 `any` types.

We're also launching a System Store where domain experts publish ERDL
skeletons for their industries. 70% revenue share.

Tech: NestJS 11 + Vue 3 + TypeScript + MySQL + WebSocket streaming.
License: BSL 1.1 (Core) / MIT (Starter).

Repo: https://github.com/openoba/openoba-starter
Docs: https://docs.openoba.com
```

---

## Variant B: Story-Focused (Short)

```
Show HN: I can't code. I built this with an AI executor.

3 months. 3,200+ commits. 22 backend modules. 72 database entities.
0 TypeScript errors. 0 ESLint errors.

One human. One AI executor.

The AI didn't "help" me code. The AI designed the architecture, wrote every
module, ran the tests, fixed its own bugs, and documented everything.

This isn't AI-assisted development. This is AI execution.

How it works: ERDL �?a semantic protocol that gives the AI deterministic
knowledge of the enterprise system. Entity �?Alias �?Relation �?Rule �?Action.
All YAML. Hot reload. No model training.

We're also launching the world's first System Store: domain experts turn
their industry knowledge into executable assets. They set prices. 70% revenue.

Repo: https://github.com/openoba/openoba-starter
```

---

## Variant C: Chinese (for V2EX / 掘金)

```
Show HN: 我不会写代码。我和一个AI搭子�?个月造了一套企业系统�?
3个月�?200+次提交�?2个后端模块�?2个数据库实体�?0个TypeScript报错�?个ESLint告警�?
一个人。一个AI执行体�?
AI不是"辅助"我写代码。AI设计了架构、写了所有模块、跑了测试、修了自己的bug�?还写了全部文档�?
这不是AI辅助开发。这是AI执行�?
核心技术：ERDL语义协议——把企业系统的隐性知识（这个表叫什么、这个字段的规则�?什么、这个操作有没有权限）翻译成YAML，让AI读得懂、做得对、不出界�?
我们还在建全球第一家System Store——行业专家把自己的知识变成可执行的ERDL骨架�?自己定价，拿70%分成。就像App Store，但卖的是系统能力�?
Repo: https://github.com/openoba/openoba-starter
```

---

## Posting Checklist

- [ ] Post at optimal time: Tue-Thu, 7-9 AM ET (8-10 PM Beijing)
- [ ] Have the repo fully ready (all docs, CI passing)
- [ ] Have the demo video link ready as a comment
- [ ] Have answers prepared for likely questions:
  - "How is this different from LangChain / CrewAI / Dify?"
  - "Isn't BSL a problem for open source?"
  - "How does ERDL compare to MCP?"
  - "How do you ensure the AI doesn't make mistakes?"
- [ ] Monitor and respond within 15 minutes of posting
- [ ] Share HN link on Twitter/X simultaneously
- [ ] Have team members ready to upvote (but don't coordinate �?HN detects rings)
