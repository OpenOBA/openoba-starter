## PR 规范

### 标题格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <description>
```

示例：
- `feat(agent): add multi-model routing`
- `fix(auth): JWT expiration handling`
- `docs(readme): update installation guide`

### 类型

| 类型 | 用途 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档 |
| refactor | 重构 |
| test | 测试 |
| chore | 构建/工具 |

### PR 检查清单

- [ ] 代码通过 `npm run build:backend`
- [ ] 代码通过 ESLint (`npm run lint`)
- [ ] 测试通过 (`cd packages/backend && npm test`)
- [ ] 如果是新功能：包含测试覆盖
- [ ] 如果是 Bug 修复：描述复现步骤
- [ ] 已签署 CLA（首次贡献）

### Commit 规范

每个 commit 应该是一个逻辑单元，一个 PR 可以包含多个 commit。
