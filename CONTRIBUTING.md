# Contributing to OpenOBA

Thank you for your interest in OpenOBA!

OpenOBA is an **AI-Native Autonomous Executor** — an intelligent execution entity driven by natural language, capable of autonomous path planning, deterministic task execution within enterprise digital systems, and continuous self-evolution.

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## How to Contribute

### 🐛 Reporting Bugs

1. Search GitHub Issues to check if the bug has already been reported
2. Create a new Issue using the Bug Report template
3. Include:
   - Version number (check `/api/health`)
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, database version)

### 💡 Feature Requests

1. Create a Feature Request in Issues
2. Describe the use case and desired behavior
3. Wait for maintainer confirmation before coding

### 🔧 Submitting Code

#### Development Environment

- **Node.js** >= 18
- **MySQL** >= 8.0
- **npm** >= 9

```bash
# Clone and install
git clone <repo-url>
cd openoba-starter
npm install

# Build
npm run build:backend

# Start development
npm run start:backend    # Backend at http://localhost:3000
npm run start:frontend   # Frontend at http://localhost:5173

# Run tests
npm test -w packages/backend
npm run test -w frontend
```

#### Branch Strategy

- `master` — stable
- `feat/xxx` — new features
- `fix/xxx` — bug fixes
- `docs/xxx` — documentation

#### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Wizard onboarding
fix: resolve Swagger production exposure
docs: update API documentation
chore: upgrade TypeScript
refactor: split OrderService
test: add inventory module integration tests
```

#### Pre-submit Checklist

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm test -w packages/backend  # Backend tests
```

All PRs must pass CI before merging.

#### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Write code + tests
4. Run `npm run lint` and `npm test`
5. Submit PR using the PR template
6. Await code review

### 📖 Documentation

- New API endpoints must include Swagger annotations
- Architecture changes must update the corresponding docs
- Documentation and comments may be written in Chinese or English

---

## Project Structure

```
openoba-starter/
├── packages/
│   ├── backend/          # NestJS backend (industry ERP logic)
│   │   └── src/
│   │       ├── common/       # Shared components (guards, interceptors, filters)
│   │       ├── config/       # Configuration
│   │       ├── modules/      # Business modules (22: customer, order, product, ...)
│   │       └── schemas/      # ERDL schema definitions
│   ├── core/             # @openoba/core engine (ReAct / Action Guard / ERDL / Memory)
│   └── types/            # @openoba/types shared type package
├── frontend/             # Vue 3 frontend
│   └── src/
│       ├── api/              # API wrappers
│       ├── components/       # Shared components
│       ├── composables/      # Composables (18)
│       ├── views/            # Page views (11)
│       └── stores/           # Pinia stores
├── database/             # Database scripts
├── docs/                 # Technical documentation
└── skills/               # Skill definitions
```

---

## License & Legal

### License

This repository uses **per-directory licensing**:

| Directory | License | Change Date |
|-----------|---------|-------------|
| `/` (root) | MIT | — |
| **`packages/core/`** | **BSL 1.1** | 2030-06-09 → Apache 2.0 |
| `packages/backend/` | MIT (inherits root) | — |
| `packages/types/` | MIT (inherits root) | — |
| `frontend/` | MIT (inherits root) | — |

**Rules**:
- Root `LICENSE` is MIT — the default for the entire repository
- `packages/core/LICENSE` is BSL 1.1 — covers all Core engine code
- Sub-directory LICENSE files take precedence over the root LICENSE
- Any contribution to `packages/core/` is subject to BSL 1.1, automatically converting to Apache 2.0 on 2030-06-09

### Contributor License Agreement (CLA)

All external contributors must sign the [Contributor License Agreement (CLA)](./CLA.md) before submitting a PR.

Key CLA terms:
- Transfer of copyright economic rights to Shenzhen Miaojing Technology Co., Ltd.
- Grant of patent license to the Company
- Governed by the laws of the People's Republic of China

PRs submitted without a signed CLA will not be merged.

### Trademarks

OpenOBA™, ERDL™, and ERA-Chat™ are trademarks of Shenzhen Miaojing Technology Co., Ltd. See [TRADEMARK.md](./TRADEMARK.md).

---

## Contact

| Matter | Channel |
|--------|---------|
| Technical issues | GitHub Issues |
| Legal affairs | postmaster@openoba.com |
| Security vulnerabilities | See [SECURITY.md](./SECURITY.md) |
