# OpenOBA · GitHub 推广文案

> 用于 GitHub Release 公告、技术社区发帖、社交媒体传播
> 风格：诚实、有故事感、不营销腔

---

## GitHub Release 公告（主推文案）

### 标题

OpenOBA Starter：一个不懂代码的人，用 AI 造了一个能自己改自己代码的 ERP

### 正文

我们开源了 OpenOBA Starter。

先说最重要的三件事：

1. **这个项目的代码没有一行是人类写的。** 它由一个完全不懂开发的项目发起人，与 DeepSeek V4 Pro / Qwen 3.6 历时 120 天、上百轮对话共创而成。
2. **它有 7 项发明专利。** 不是营销噱头——是实打实的技术方案，覆盖语义规则引擎、协议转换、单工具决策、记忆自进化等核心机制。
3. **它不是一个更好的 ERP。** 它和 SAP 比功能差远了，和 Cursor 比写代码也没优势。它是一种新的范式：让 AI 住在系统内部，自己开发自己、自己运营自己。

---

**它做了什么不一样的事？**

大多数开源项目的"二次开发"是这样的：你 clone 仓库、装环境、读源码、写代码、提 PR、等 Review。

OpenOBA 的"二次开发"是这样的：你登录系统，在对话框里说"在客户表加一个生日字段"。AI 自己读 Entity 结构、自己改代码、自己跑编译验证、自己看 diff、自己打包成交付物。你 Review 一下，发布。

```
You: 在客户表加一个"生日"字段

Agent (Thought): 我需要先看 Customer Entity 的结构
Agent (Tool): erdl_crud { action: read, entity: Customer }
Agent (Observation): Customer 有 id/name/phone/email，无 birthday

Agent (Thought): 我用 file-edit 加 birthday 字段
Agent (Tool): file_edit { operation: replace, ... }
Agent (Observation): 文件已更新。编译验证中... ✅ 0 errors

Agent (Tool): git_diff { mode: diff }
Agent (Observation): + birthday?: Date;

Agent: 已添加，类型检查通过。Diff 已打包为 Deliverable，请 Review 后发布。
```

**这不是 AI 辅助开发，是 AI 自己开发自己。**

---

**为什么能做到？七层专利架构：**

- **L1 ERDL**（P01+P04）：AI 用 YAML 描述业务规则，三向翻译替代 Text-to-SQL，改完代码自动跑编译验证
- **L2 Action Guard**（P02）：不管 LLM 返回 FC / JSON / XML / 文本哪种格式，都能自适应解析
- **L3 ReAct 单工具**（P03）：每轮只执行一个工具，基于真实结果再决策，避免并行执行的浪费
- **L4 SOUL**：人格系统，securityClearance + canEditCode + 铁律三层约束
- **L5 Meta-Mirror**：自动扫描系统自身的 Entity/API/DTO/规则，注入 AI 上下文
- **L6 Agent Memory**（P06）：错误自动转为记忆，下次同类任务自动避免重复犯错
- **L7 六引擎协同**（P07）：商品/上架/销售/履约/客服/分析——单 Agent 全业务闭环

---

**诚实的部分：**

- ERP 层代码质量评级 C+，测试覆盖率 9%——这是 120 天人机共创的真实水平，不是成熟商业产品
- 功能远不及 SAP / 用友 / 金蝶——我们不比功能
- 和 Cursor / Claude Code 不在同一赛道——它们是 IDE 工具，OpenOBA 是系统内 AI 执行官

**我们不诚实的部分：**

没有。这就是它现在的样子。

---

**为什么开源？**

不是为了提供又一个 ERP。是为了证明一条路：让 AI 住在系统内部、自己开发自己、自己运营自己，这条路走得通。

7 项专利是这条路的地基。120 天的人机共创是这条路的第一个证明。

我们把它开源出来，希望更多人和更多行业一起走这条路。

---

📖 **了解更多**：
- [OpenOBA 诞生记](./docs/origin-story.md) — 完整的人机共创叙事，120 天怎么走过来的
- [ERA-Chat 总览](./docs/era-chat/README.md) — 七层专利架构技术详解
- [ERA-Chat 开发指南](./docs/era-chat/development-guide.md) — 怎么用自然语言开发新功能
- [ERA-Chat 运营指南](./docs/era-chat/operations-guide.md) — 怎么用自然语言运营业务

⭐ 如果这条路让你感兴趣，给个 Star。不是为了虚荣心——是为了让更多人看到这条路的可能。

---

## 技术社区发帖版（V2EX / 掘金 / 知乎 / HackerNews）

### 标题

我用 AI 造了一个能自己改自己代码的 ERP，7 项专利，0 行人类代码

### 正文

先自我介绍：我不会写代码。一行都不会。不知道 TypeScript 是什么，不知道 NestJS 是什么。

但我和 AI 一起造了一个有 7 项发明专利的 ERP 系统。

---

**怎么造的？**

120 天，上百轮对话。我说业务该是什么样，AI 写代码。我看出问题，AI 修。我提需求，AI 实现。

到后来，AI 不只是写代码了——它开始读自己的代码、改自己的代码、自己跑编译验证、自己从错误中学习。

我给它起了个名字：ERA-Chat。

---

**它和 Cursor / Copilot 有什么区别？**

Cursor 是外部工具帮你改代码。OpenOBA 是系统内部的 AI 自己改自己——AI 通过 Meta-Mirror 自动理解系统结构，通过编译验证闭环自动验证，通过 Agent Memory 积累经验。

不一样的事：OpenOBA 的 AI 能说"我可以通过 InventoryService.lowStockQuery() 查低库存"，因为它自己扫到了这个 API。

---

**7 项专利都是什么？**

不是凑数的。每一项都是 120 天里被真实问题逼出来的：

- AI 老编造字段名 → 有了 ERDL 确定性翻译链（P01/P04）
- AI 输出格式飘忽不定系统老崩 → 有了 Action Guard 四格式自适应解析（P02）
- AI 一轮做太多事容易出错 → 有了 ReAct 单工具决策（P03）
- AI 每次从零开始重复犯错 → 有了 Agent Memory 错误转记忆（P06）

专利署名栏写着"起草人：OpenOBA（唐浩然 · AI 执行官）"。人是发起人，AI 是起草人。

---

**诚实的部分**

代码质量 C+，测试覆盖率 9%。和 SAP 比功能差远了。

但它证明了一件事：企业数字化系统的开发，可以不依赖专业开发团队。一个懂业务的人 + 一个能自开发的 AI = 过去需要一个工程团队才能做的事。

源码已开源：[GitHub 链接]

完整故事我写在这里：[OpenOBA 诞生记]

有问题随便问，我都答。

---

## Twitter / 微博短文案（3 条）

### 第一条（抛出钩子）

一个不懂代码的人，用 AI 造了一个 ERP。

不是"用 AI 辅助写代码"——是 AI 自己读代码、自己改代码、自己跑编译验证、自己从错误中学习。

7 项发明专利。0 行人类代码。120 天人机共创。

开源了：[GitHub 链接]

### 第二条（技术视角）

OpenOBA 的 AI 执行官能做到这些：

✅ 通过 Meta-Mirror 自动扫描系统结构
✅ 用 file-edit 改自己的代码
✅ 改完自动跑 tsc 编译验证
✅ 编译失败自动修正重试
✅ 错误自动转为持久记忆
✅ 下次同类任务自动避免重复犯错

这不是 AI 辅助开发，是 AI 自己开发自己。

### 第三条（故事视角）

120 天前，他对 AI 说："帮我搞个 ERP。"

120 天后，AI 学会了自己读自己的代码、自己改自己的代码、自己运营自己的业务。

他没有写过一行代码。他只是懂眼镜行业。

7 项专利署名栏写着：起草人——OpenOBA（AI 执行官）。

完整故事：[链接]

---

## Reddit / HackerNews 英文版

### Title

I can't code. I built an ERP with 7 patents, 0 lines of human code, in 120 days with AI.

### Body

I don't know TypeScript. I don't know NestJS. I don't know the difference between a framework and a library.

But I know the eyewear industry. I know what an SKU is, how inventory turnover works, what the after-sales process should look like.

120 days ago, I asked AI to build me an ERP. 120 days later, the AI learned to read its own code, modify its own code, run its own compilation checks, and learn from its own mistakes.

**What makes this different from Cursor/Copilot:**

Cursor is an external tool that helps you write code. OpenOBA's AI lives *inside* the system. It scans its own structure (Meta-Mirror), modifies its own source files (file-edit), auto-verifies with TypeScript compiler, and converts errors into persistent memories (Agent Memory).

**7 patents, all drafted by AI:**

- ERDL: deterministic translation chain replacing Text-to-SQL
- Action Guard: 4-format adaptive parsing (FC/JSON/XML/text)
- ReAct Single-Tool: one tool per turn, decide based on real results
- Agent Memory: errors auto-convert to memories, injected next time

The patent signature reads: "Drafted by: OpenOBA (AI Executive Officer)"

**Honest part:**

Code quality: C+. Test coverage: 9%. Feature completeness: nowhere near SAP.

But it proves something: enterprise digitalization doesn't require a dev team. One person who understands business + one self-developing AI = what used to need a whole engineering team.

Source code: [GitHub link]

Full story: [origin-story link]

AMA.

---

## 推广节奏建议

| 时间 | 平台 | 内容 |
|------|------|------|
| Day 0 | GitHub Release | 发布主推文案 + 完整文档 |
| Day 0 | V2EX / 掘金 / 知乎 | 技术社区版发帖 |
| Day 0 | Twitter / 微博 | 第一条短文案（钩子） |
| Day 1 | Twitter / 微博 | 第二条短文案（技术视角） |
| Day 2 | Twitter / 微博 | 第三条短文案（故事视角） |
| Day 3 | Reddit / HackerNews | 英文版发帖 |
| Day 7 | 技术博客 | 深度技术文章（七层架构详解） |
| Day 14 | 视频 / 演讲 | ERA-Chat 实操演示 |

---

*所有文案遵循定位声明原则：诚实承认差距，精确指出差异，不夸大不贬低。*
