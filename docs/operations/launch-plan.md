# OpenOBA Launch & Operations Plan

> **Core Principle**: Don't explain what OpenOBA is. Show what OpenOBA proved.
>
> Version: 1.0 | 2026-06-25

---

## 1. Positioning

| Don't compete on | Compete on |
|-----------------|-----------|
| "Best AI Agent framework" | "The only platform that turns industry knowledge into executable system assets" |
| "Open-source ERP" | "Built by 1 human + 1 AI executor in 3 months" — an unreplicable proof |
| "AI tool / assistant" | "The world's first System Store" |

**Three "onlys" = Three unassailable moats.**

---

## 2. Launch Narrative

### The Core Story

> *"I can't code. I built an enterprise system with one AI executor in 3 months. Here's the proof."*

### Key Talking Points

| Point | Evidence |
|-------|----------|
| Non-technical founder | Zero coding background |
| 3 months, 3,200+ commits | From 2026.04.03 to present |
| Enterprise-grade quality | 0 TS errors, 0 ESLint errors, 0 `any` |
| Not a toy | 22 NestJS modules, 72 entities, 18 Skills |
| Deterministic execution | ERDL + Action Guard — not prompt engineering |
| Self-built with own product | The AI executor built the platform that runs the AI executor |

---

## 3. Launch Channel Strategy

### Phase 1: Pre-Launch (Now → Launch Day)

| Action | Owner | Status |
|--------|-------|--------|
| GitHub repo fully ready (51 docs, green CI, all policies) | 唐浩然 | ✅ |
| System Store page placeholder | 唐浩然 | ⏳ |
| Demo video: ERA-Chat executing real tasks | Henry | ⏳ |
| Commit timeline visualization | 唐浩然 | ⏳ |
| Prepare HN post draft | 唐浩然 | ⏳ |

### Phase 2: Launch Day (TBD)

| Platform | Content | Target |
|----------|---------|--------|
| **Hacker News** | "Show HN: I can't code. I built an enterprise ERP with one AI executor in 3 months" | Front page within 4 hours |
| **Product Hunt** | Same day launch | Top 5 of the day |
| **Twitter/X** | Thread: "1 human + 1 AI. 3 months. Here's the commit history." | 500+ RTs |
| **GitHub** | Repo goes public | Trending within 24h |

### Phase 3: Follow-up (Launch + 48h)

| Content | Platform | Timing |
|---------|----------|--------|
| "Why I replaced expr-eval with a recursive-descent parser" | Dev.to / r/programming | +24h |
| "ERDL: Making LLMs operationally safe with YAML" | r/MachineLearning | +48h |
| "How we built a monorepo with per-directory licensing (BSL + MIT)" | r/opensource | +72h |
| Respond to all HN/PH comments | HN / PH | Ongoing |

### Phase 4: Sustained Growth (Q3 2026)

| Action | Frequency | Goal |
|--------|-----------|------|
| Technical blog post | Weekly | SEO + authority building |
| New ERDL skeleton | Monthly | Second industry after eyewear |
| Community engagement | Daily | Respond to Issues, PRs, Discussions |
| Social proof collection | Ongoing | User stories, tweets, testimonials |

---

## 4. HN Post Draft

```
Title: Show HN: I can't code. I built an enterprise ERP with one AI executor in 3 months

Three months ago, I couldn't write a line of TypeScript. Today, I'm shipping
OpenOBA — an enterprise system with 22 backend modules, 72 database entities,
and 18 AI-executable skills.

How? One human + one AI executor. I defined the business direction. The AI
designed the architecture, wrote the code, ran the tests, and fixed its own bugs.

The system has:
- 0 TypeScript strict-mode errors
- 0 ESLint errors
- 0 `any` type usages
- 3,200+ commits
- Full test coverage (35 backend suites + 7 frontend suites)

This isn't "AI writing code snippets." This is an AI executor operating as a
full-stack engineering partner, deterministically executing tasks inside a
real enterprise system. The AI edits code, compiles it, tests it, and rolls
back on failure — autonomously.

The secret sauce: ERDL (Entity-Relation Dynamic Language), a YAML-superset
semantic protocol that translates enterprise domain knowledge into rules
the AI can operate against deterministically. Not prompt engineering.
Protocol-layer constraints.

We're also building the world's first System Store — a marketplace where
industry experts turn their domain knowledge into executable ERDL skeletons.
They set their price. They keep 70%.

Happy to answer any questions. AMA.
```

---

## 5. Content Calendar

### Month 1: Foundation

| Week | Post | Topic |
|------|------|-------|
| W1 | Launch HN + PH | The story |
| W2 | Technical deep-dive | ERDL: Why YAML for enterprise AI |
| W3 | Engineering | SafeExpr: Building a zero-injection expression parser |
| W4 | Vision | System Store: The App Store model for enterprise knowledge |

### Month 2: Depth

| Week | Post | Topic |
|------|------|-------|
| W5 | Architecture | Action Guard: Three-tier validation without prompts |
| W6 | Case study | How we split 4,561-line Vue files into 8 composable components |
| W7 | Ecosystem | Your industry knowledge is an asset. Here's how to monetize it. |
| W8 | Technical | WebSocket streaming for AI agents at production scale |

---

## 6. Developer Outreach Hooks

| Hook | Channel | Why It Works |
|------|---------|-------------|
| "I replaced expr-eval with a recursive-descent parser. Here's the code." | r/programming, HN | Specific, technical, provable |
| "ERDL: A YAML-superset that constrains LLM behavior at the protocol layer" | r/MachineLearning | Counter-positioning to prompt engineering |
| "Monorepo dual-licensing: How we ship BSL + MIT in one repo" | r/opensource | Novel engineering practice |
| "1 human + 1 AI = 3,200 commits in 3 months. The commit log." | Twitter/X | Visual proof |

---

## 7. Industry Expert Outreach

| Industry | Channel | Message |
|----------|---------|---------|
| Eyewear / Optometry | Trade shows, WeChat groups | "Your 10 years of industry knowledge can become a sellable digital system" |
| Healthcare | Health IT communities | "HIS rules are too complex? Define them in YAML. Let AI execute." |
| Logistics | Supply chain communities | "Every warehouse has its own logic — turn it into an ERDL skeleton" |
| Retail | Retail tech groups | "Build your own inventory system in YAML, not code" |

---

## 8. Social Proof Collection

### Internal (ready now)

- [ ] GitHub commit history (3,200+ commits, every day since April 3)
- [ ] 0 TS errors screenshot
- [ ] ERA-Chat demo video
- [ ] Architecture diagram

### External (to collect)

- [ ] Early user testimonials
- [ ] First external contributor PR
- [ ] First System Store listing
- [ ] Media coverage

---

## 9. Metrics & Goals

| Metric | 30-Day Target | 90-Day Target |
|--------|--------------|---------------|
| GitHub Stars | 500 | 2,000 |
| HN upvotes | 200+ | — |
| Product Hunt upvotes | 300+ | — |
| External contributors | 3 | 10 |
| ERDL skeletons listed | 2 | 5 |
| Blog posts published | 4 | 12 |
| Email list subscribers | 100 | 500 |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| HN/PH post ignored | Pre-build social proof (screenshots, video, commit graph); post at optimal time (Tue-Thu, 7-9am ET) |
| "Just another AI wrapper" | Lead with the miracle story, not the tech; let curiosity drive the click |
| Empty System Store | Ship eyewear skeleton as showcase; partner with 1 domain expert for a second skeleton pre-launch |
| Negative technical scrutiny | All code is public and proven (0 TS errors, 0 ESLint); let the commit history speak |
| Copycats | 3-month execution lead + network effects of System Store + BSL protection on Core |

---

> **One human, one machine. One legion.**
>
> This document was drafted by 1 human + 1 AI executor in 15 minutes.
