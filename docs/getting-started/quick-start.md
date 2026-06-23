# 5 分钟快速开始

> 假设你已经完成 [安装指南](./installation.md)，这里带你体验核心功能

## 你将体验

- ✅ 登录系统并修改密码
- ✅ 配置 AI 数字执行官的 LLM API Key
- ✅ 用自然语言完成一次业务操作
- ✅ 浏览传统表单管理界面

预计耗时：5 分钟（不含安装时间）。

---

## 1. 登录系统

浏览器打开 `http://localhost:5173`，使用默认账号登录：

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `admin123` |

> ⚠️ 登录后，进入 **系统 → 用户管理**，立即修改 admin 密码。

## 2. 配置 AI 执行官

AI 执行官需要一个 LLM API Key 才能工作：

1. 点击左侧导航的 **ERA-Chat**
2. 点击右上角 ⚙️ **设置** 图标
3. 切换到 **API Key** 选项卡
4. 点击 **添加 Key**：
   - 选择 Provider（推荐 DeepSeek）
   - 粘贴你的 API Key
   - 保存
5. 切换到 **模型** 选项卡，设置默认模型（如 `deepseek-chat`）

> 💡 没有 Key？去 [platform.deepseek.com](https://platform.deepseek.com) 注册，新用户免费 500 万 token。

## 3. 与 AI 执行官对话

回到 ERA-Chat 主界面，在输入框试试这些指令：

**查询类**：
```
帮我查一下系统里有多少个商品
```

**创建类**：
```
帮我创建一个客户，姓名张三，手机13800138000，会员等级普通
```

**分析类**：
```
统计一下本月的订单数量和总金额
```

AI 执行官会：
1. **思考**（流式输出推理过程）
2. **行动**（调用对应的 ERP 工具）
3. **观察**（读取工具返回结果）
4. **回答**（用自然语言总结结果）

## 4. 浏览传统管理界面

OpenOBA Starter 同时保留完整的传统表单操作。左侧导航包含：

| 菜单 | 功能 |
|------|------|
| **仪表盘** | 数据概览 |
| **商品管理** | SPU/SKU/套装/分类 |
| **客户管理** | 客户档案/会员 |
| **订单管理** | 订单列表/售后 |
| **库存管理** | 库存查询/盘点 |
| **评价管理** | 商品评价 |
| **颜色设计** | 颜色项目/调色板 |
| **结构标准** | 镜架结构尺寸 |
| **字典管理** | 系统数据字典 |
| **系统管理** | 用户/角色/权限/菜单/审计 |
| **ERA-Chat** | AI 执行官对话 |
| **ERDL 管理** | 业务规则管理 |
| **技能管理** | AI 技能配置 |

## 5. 试试 ERDL 规则

ERDL（Entity Rule Definition Language）是 OpenOBA 的特色——用 YAML 描述业务规则，AI 可读可写。

1. 进入 **ERDL 管理**
2. 点击 **Playground** 试试规则执行
3. 或在 ERA-Chat 中输入：
   ```
   帮我看一下库存低于 10 的商品有哪些
   ```
   AI 会自动匹配库存预警相关的 ERDL 规则。

---

## 就这些？

当然不是。OpenOBA Starter 还有很多能力等你探索：

- 📖 [架构总览](../architecture/overview.md) — 理解 Core 引擎和 ERP 的关系
- 📖 [后端模块清单](../architecture/module-list.md) — 每个模块的职责
- 📖 [API 概览](../api/overview.md) — 直接调用 API
- 📖 [开发环境搭建](../development/environment-setup.md) — 参与代码贡献

有问题？[提 Issue](https://github.com/openoba/openoba-starter/issues) 或在 [Discussions](https://github.com/openoba/openoba-starter/discussions) 讨论。
