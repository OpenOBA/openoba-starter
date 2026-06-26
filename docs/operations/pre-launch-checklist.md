# Operations Checklist — Pre-Launch

> Everything that must be done before GitHub goes public.

---

## Technical Readiness

### Repository
- [ ] All 51 docs in `docs-github/` copied to repository root
- [ ] `packages/core/LICENSE` (BSL 1.1) in place
- [ ] Root `LICENSE` (MIT) in place
- [ ] All cross-references verified (0 broken links)
- [ ] `README.md` renders correctly on GitHub
- [ ] CI pipeline green (build + lint + test)
- [ ] `.env.example` present and accurate

### Documentation
- [ ] All 15 pairs of Chinese/English docs structurally aligned
- [ ] CHANGELOG up to date (include Unreleased items)
- [ ] VISION.md reviewed and final
- [ ] CONTRIBUTING.md CLA flow verified
- [ ] SECURITY.md PGP key ready (or placeholder noted)
- [ ] SUPPORT.md contact channels active

### Issue Templates
- [ ] bug_report.md — tested submission flow
- [ ] feature_request.md — tested submission flow
- [ ] erdl_skeleton.md — tested submission flow
- [ ] skill_proposal.md — tested submission flow
- [ ] PULL_REQUEST_TEMPLATE.md — tested
- [ ] config.yml — blank issues disabled, contact links work

---

## Visual Assets

- [ ] OpenOBA logo (SVG + PNG, dark + light variants)
- [ ] Architecture diagram (SVG, embeddable in README)
- [ ] ERA-Chat demo screenshot (annotated)
- [ ] Commit activity graph screenshot
- [ ] Social preview image (1200×630px for Twitter/LinkedIn)
- [ ] Favicon / Open Graph image in repo

---

## Demo

- [ ] 2-3 minute ERA-Chat demo video
  - Show: "查库存", "创建订单", "生成报表" — 3 real interactions
  - Show: ReAct timeline (Thought → Tool → Observation)
  - Show: file-edit → compile-check → auto-fix loop
  - Host on YouTube (unlisted initially, public at launch)
- [ ] Demo video captioned (Chinese + English subtitles)

---

## External Platform Setup

### Website
- [ ] openoba.com landing page updated with new messaging
- [ ] docs.openoba.com configured and pointing to docs
- [ ] .well-known/security.txt deployed
- [ ] PGP key hosted at .well-known/security-pgp-key.asc

### GitHub
- [ ] Repository description: "AI-Native Autonomous Executor — The world's first System Store"
- [ ] Topics: ai, agent, enterprise, erdl, nestjs, vue, typescript, system-store
- [ ] Website link: https://openoba.com
- [ ] "Sponsor" button configured (if applicable)
- [ ] Branch protection rules: require PR review for master

### Social
- [ ] Twitter/X account: @OpenOBA
- [ ] Avatar + banner + bio ready
- [ ] Pinned tweet ready (launch announcement)
- [ ] Discord server created and configured
- [ ] LinkedIn company page

### Product Hunt (if applicable)
- [ ] Maker account created
- [ ] Product page draft ready
- [ ] Gallery images uploaded
- [ ] First comment drafted

---

## Content Ready

- [ ] HN post final draft (primary + 2 variants)
- [ ] Product Hunt listing copy
- [ ] Twitter/X launch thread (10 tweets)
- [ ] LinkedIn launch post
- [ ] Week 2 blog post drafted (ERDL deep-dive)
- [ ] Week 3 blog post drafted (SafeExpr)

---

## Legal

- [ ] Trademark application submitted (CNIPA Class 9, 42)
- [ ] DPO name confirmed in all policies
- [ ] CLA Assistant bot configured on repo
- [ ] BSL 1.1 Change Date verified: 2030-06-09
- [ ] Privacy policy published on openoba.com

---

## Launch Day Runbook

### T-2 days
- [ ] Final repo audit (all docs, all links, all tests)
- [ ] Demo video uploaded (unlisted)
- [ ] All social accounts verified
- [ ] Team briefing: who responds to what

### T-1 day
- [ ] HN post scheduled or draft loaded
- [ ] PH post scheduled
- [ ] Launch thread loaded in Twitter scheduler
- [ ] All team members online for launch window

### T-0 (Launch — Tue-Thu, 8 PM Beijing / 7 AM ET)
- [ ] Post HN Show HN
- [ ] Post Product Hunt
- [ ] Post Twitter/X thread
- [ ] Post LinkedIn
- [ ] Make demo video public

### T+1 hour
- [ ] Respond to first HN comments (critical — HN front page depends on engagement)
- [ ] Respond to PH comments
- [ ] Cross-post HN link to relevant subreddits

### T+24 hours
- [ ] Post Week 2 technical blog
- [ ] Share on Twitter/X
- [ ] Submit to Dev.to, r/programming

### T+7 days
- [ ] Launch retrospective
- [ ] Week 1 metrics review (stars, traffic, contributors, issues)
- [ ] Adjust content calendar based on what resonated

---

> **One human, one machine. One legion. One launch.**
