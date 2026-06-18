# ERA-Chat 首页常用语功能修复追踪

**日期**：2026-06-18
**发现人**：Henry
**处理人**：唐浩然
**类型**：Bug修复
**状态**：✅ 已修复
**Commit**：c3e1960

---

## 问题症状

ERA-Chat 首页的"常用语"模板功能没有激活——常用语栏不显示/点击按钮无反应。

## 根因

TaskDashboard.vue 模板中 `:templates="templates"` 引用了**不存在**的变量。内联了一套 `loadTemplates`/`saveTemplates`/`defaultTemplates` 死代码，但没有声明 `templates` ref，也没有 import 已有的 `useTemplates` composable。

## 修复内容

### EraChatWelcome.vue
- `saveTemplate()`: 将 `emit('templatesSaved', items)` 传出完整 items 数组，替代之前的 `(props as any)._onTemplatesSaved?.(items)` hack
- 更新 emit 类型：`templatesSaved: [items: TemplateItem[]]`

### TaskDashboard.vue
- import `useTemplates` composable
- 添加 `eraChatWelcomeRef` 并通过 ref 桥接 `handleTemplateAdd`/`handleTemplateEdit` 到子组件弹窗
- 添加 `onTemplatesSaved` handler 将子组件传出的 items 同步回 composable
- 删除内联的死代码：`loadTemplates()`/`saveTemplates()`/`defaultTemplates`
- 解构 `useTemplates()` 获得 `templates`, `applyTemplate`, `removeTemplate`, `resetTemplates`

### 类型检查
- vue-tsc --noEmit：TaskDashboard 和 EraChatWelcome 零新增错误
- 其余文件的 TS 错误为已有 baseline，非本次引入
