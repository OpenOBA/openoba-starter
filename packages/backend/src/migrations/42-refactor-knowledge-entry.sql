-- ============================================
-- Migration 42: knowledge_entry 重构
-- 依据：ER-OS-知识库操作规范-V1.0.md
-- 日期：2026-05-06
-- 作者：唐浩然
-- ============================================

-- Step 0: 修改 type 枚举（加 STRATEGY 值）
ALTER TABLE knowledge_entry MODIFY COLUMN type ENUM('DOCUMENT','EXPERIENCE','CASE','DATA','FAQ','POLICY','STRATEGY') NOT NULL DEFAULT 'EXPERIENCE' COMMENT '知识类型';

-- Step 1: 新增字段
ALTER TABLE knowledge_entry
  ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'public' COMMENT '可见范围：public/private' AFTER title,
  ADD COLUMN weight FLOAT NOT NULL DEFAULT 0.3 COMMENT '权重 0-1，Agent引用越多越高' AFTER content,
  ADD COLUMN attachments JSON DEFAULT NULL COMMENT '附件列表 [{name,type,url,size}]' AFTER weight;

-- Step 2: tags 改为必填
ALTER TABLE knowledge_entry
  MODIFY COLUMN tags JSON NOT NULL COMMENT '标签数组（必填）["titanium","nose_pad"]';

-- Step 3: status 简化为 active/archived
ALTER TABLE knowledge_entry
  MODIFY COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT '状态：active/archived';

-- Step 4: 删除冗余字段
ALTER TABLE knowledge_entry
  DROP COLUMN domain,
  DROP COLUMN verified_by,
  DROP COLUMN verified_at,
  DROP COLUMN channel,
  DROP COLUMN evidence;

-- Step 5: 清除私有库旧种子（重新播种）
DELETE FROM knowledge_entry;

-- Step 6: 公开知识 15 条
INSERT INTO knowledge_entry (id, title, visibility, type, tags, content, weight, contributor, status, created_at, updated_at) VALUES
('kb-001', '钛合金镜框鼻托舒适度优化', 'public', 'EXPERIENCE',
 '["钛合金","鼻托","舒适度"]',
 '## 问题\n钛合金镜框重量轻但鼻托容易滑动，部分用户反馈佩戴 2 小时后鼻梁有压痕。\n\n## 解决方案\n1. 鼻托改用硅胶材质，增加摩擦系数\n2. 鼻托间距缩小 2mm，适配亚洲人脸型\n3. 镜腿末端加配重块，平衡重心\n\n## 效果\n客诉率从 12% 降至 3%。',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-002', '轻奢眼镜定价区间参考', 'public', 'DATA',
 '["定价","竞品","轻奢"]',
 '## 轻奢眼镜定价区间\n- ESSENTIAL 线：¥198-298（基础款，引流）\n- PREMIUM 线：¥348-498（主力款，占比 60%）\n- LUXURY 线：¥598-898（限量款，占 15%）\n\n## 竞品参考\n| 品牌 | 均价 | 材质 |\n|------|------|------|\n| 暴龙 | ¥498 | TR90 |\n| 帕莎 | ¥398 | 板材 |\n| 陌森 | ¥348 | 合金 |',
 0.5, '市场部', 'active', NOW(), NOW()),

('kb-003', '小红书文案风格指南', 'public', 'DOCUMENT',
 '["小红书","文案","内容"]',
 '## 标题公式\n- 数字+痛点+解决方案：「3 副眼镜换一周穿搭，同事问我是不是换了张脸」\n- 对比反差：「以前 2 年换 1 副，现在 1 周换 3 副」\n\n## 正文结构\n1. 个人经历（建立信任）\n2. 产品介绍（自然植入）\n3. 使用场景（引发共鸣）\n4. 行动号召（引导购买）\n\n## 话题标签\n#换框眼镜 #颜值18变 #一场景一镜框 #秒镜科技',
 0.5, '内容团队', 'active', NOW(), NOW()),

('kb-004', '圆框脸型适配规则', 'public', 'FAQ',
 '["圆框","脸型","显瘦"]',
 '## 圆框适合\n- 方脸：圆框柔化棱角 ✅\n- 长脸：圆框缩短面部视觉 ✅\n- 心形脸：圆框平衡额头宽度 ✅\n\n## 圆框不适合\n- 圆脸：圆框+圆脸=更圆 ❌（建议方框/猫眼）\n- 短脸：圆框显脸更短 ❌',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-005', 'TR90材质特性与应用', 'public', 'DATA',
 '["TR90","材质","轻量"]',
 '## TR90 特性\n- 重量：比钛合金轻 15%，比板材轻 40%\n- 弹性：弯折 180° 不断裂\n- 耐高温：-30°C ~ 120°C 不变形\n- 颜色：可做透明/半透明/渐变效果\n\n## 适用场景\n- 运动款镜框首选材质\n- 儿童眼镜（安全不易断）\n- 入门级产品线（成本可控）\n\n## 缺点\n- 表面硬度不如钛合金，易划伤\n- 高级感不如金属材质',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-006', '镜框颜色搭配原则', 'public', 'EXPERIENCE',
 '["颜色","穿搭","显白"]',
 '## 冷白皮\n- 推荐：银色、玫瑰金、透明、浅蓝\n- 避雷：纯金、古铜色\n\n## 暖黄皮\n- 推荐：金色、玳瑁色、深棕、酒红\n- 避雷：纯白、亮银色\n\n## 中性皮\n- 几乎所有颜色都适合\n- 重点看服装搭配\n\n## 通勤场景\n- 黑框/玳瑁 → 百搭不出错\n- 金属细框 → 精致感提升',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-007', '亚洲人脸型数据参考', 'public', 'DATA',
 '["脸型","亚洲人","数据"]',
 '## 亚洲人脸型分布（估算）\n| 脸型 | 占比 | 特征 |\n|------|------|------|\n| 圆脸 | 35% | 长宽比接近 1:1 |\n| 方脸 | 20% | 下颌角明显 |\n| 长脸 | 15% | 长宽比 > 1.5:1 |\n| 心形脸 | 18% | 额头宽下巴尖 |\n| 椭圆脸 | 12% | 标准比例 |\n\n## 设计启示\n- 圆脸用户占比最高 → 方框/猫眼框是主力 SKU\n- 圆框主要服务方脸和长脸（合计 35%）',
 0.5, '市场部', 'active', NOW(), NOW()),

('kb-008', '2026春夏眼镜流行色趋势', 'public', 'DATA',
 '["流行色","趋势","2026"]',
 '## 2026 春夏主流色\n| 色系 | 色号参考 | 适用框型 |\n|------|---------|---------|\n| 冰透蓝 | #B8D4E3 | 金属细框 |\n| 蜜桃粉 | #F4C2C2 | 板材/TR90 |\n| 鼠尾草绿 | #B2C9AB | 板材大框 |\n| 奶油黄 | #FFF3C4 | TR90 运动款 |\n| 薰衣草紫 | #C3AED6 | 金属细框 |\n\n## 来源\nPantone 2026 春夏 + 天猫眼镜品类搜索趋势',
 0.5, '市场部', 'active', NOW(), NOW()),

('kb-009', '镜框尺寸测量标准', 'public', 'DOCUMENT',
 '["尺寸","验光","标准"]',
 '## 关键尺寸\n| 参数 | 含义 | 范围 |\n|------|------|------|\n| 镜片宽 | 单片镜片最宽处 | 45-60mm |\n| 鼻梁距 | 两镜片间距离 | 14-24mm |\n| 镜腿长 | 镜腿总长度 | 130-150mm |\n| 总宽 | 镜框两端最宽处 | 125-145mm |\n\n## 测量方法\n镜框内侧通常印有尺寸：`50□18-140`\n→ 镜片宽 50mm / 鼻梁距 18mm / 镜腿 140mm\n\n## 适配建议\n总宽 ≈ 脸宽的 85% 为最佳比例',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-010', '快拆结构常见问题排查', 'public', 'FAQ',
 '["快拆","售后","结构"]',
 '## 常见问题\n\n### Q: 镜片卡不进去\n检查方向：镜片凸点对准镜框凹槽，先卡上端再压下端。\n\n### Q: 镜片松动\n- 检查卡扣是否完全入位（听到咔哒声）\n- 硅胶垫圈是否有磨损（寿命约 500 次拆装）\n\n### Q: 用力过猛镜框变形\nTR90 材质可弯折 180° 自行恢复；金属框需送修。\n\n## 保养\n每月用清水冲洗卡扣处，避免灰尘积聚影响精度。',
 0.5, '售后团队', 'active', NOW(), NOW()),

('kb-011', '鼻托弧度与防滑效果关系', 'public', 'EXPERIENCE',
 '["鼻托","防滑","设计"]',
 '## 弧度测试数据\n| 弧度 | 防滑指数 | 舒适度 |\n|------|---------|--------|\n| 15° | ★★☆☆☆ | 几乎无感 |\n| 25° | ★★★★☆ | 最佳平衡点 |\n| 35° | ★★★★★ | 稍有压迫感 |\n\n## 结论\n25° 鼻托弧度为最佳设计参数，搭配硅胶材质防滑效果最优。\n亚洲人推荐鼻托间距：16-18mm。',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-012', '各大品牌框型对比分析', 'public', 'DATA',
 '["竞品","框型","对比"]',
 '## 品牌框型特色\n| 品牌 | 主力框型 | 目标人群 |\n|------|---------|---------|\n| 暴龙 | 方框/飞行员 | 男性商务 25-40 |\n| 帕莎 | 猫眼/大框 | 女性时尚 20-35 |\n| 陌森 | 圆框/几何框 | 潮流青年 18-30 |\n| GENTLE MONSTER | 超大框 | 时尚博主 20-30 |\n\n## 秒镜机会\n- 覆盖全脸型（一镜多框先天优势）\n- 快速上新（2-4 周 vs 行业 3-6 月）',
 0.5, '市场部', 'active', NOW(), NOW()),

('kb-013', '眼镜电商退货原因TOP10', 'public', 'DATA',
 '["退货","售后","电商"]',
 '## 退货原因排名\n| 排名 | 原因 | 占比 |\n|------|------|------|\n| 1 | 佩戴不舒适 | 28% |\n| 2 | 与图片色差大 | 18% |\n| 3 | 尺寸不合适 | 15% |\n| 4 | 镜框变形 | 10% |\n| 5 | 款式不喜欢 | 8% |\n| 6 | 镜片刮花 | 7% |\n| 7 | 包装破损 | 5% |\n| 8 | 发错货 | 4% |\n| 9 | 度数不准 | 3% |\n| 10 | 其他 | 2% |\n\n## 秒镜对策\n- 舒适度 → 鼻托+镜腿人体工学优化\n- 色差 → AR 试戴功能\n- 尺寸 → 线上脸型测量工具',
 0.5, '售后团队', 'active', NOW(), NOW()),

('kb-014', '商务场景镜框选择指南', 'public', 'EXPERIENCE',
 '["商务","场景","穿搭"]',
 '## 商务场景核心原则\n- 金属细框 > 板材厚框\n- 深色 > 亮色\n- 经典框型 > 潮流框型\n\n## 推荐组合\n| 场合 | 框型 | 颜色 | 材质 |\n|------|------|------|------|\n| 重要会议 | 半框/眉线框 | 枪色 | 钛合金 |\n| 日常办公 | 方框/椭圆形 | 黑色/玳瑁 | TR90 |\n| 商务晚宴 | 无框 | 金色/银色 | 钛合金 |\n| 出差出行 | 半框 | 深灰 | 钛合金 |',
 0.5, '产品团队', 'active', NOW(), NOW()),

('kb-015', '猫眼框穿搭场景推荐', 'public', 'EXPERIENCE',
 '["猫眼框","穿搭","约会","场景"]',
 '## 猫眼框优势\n- 提拉面部线条，显脸小\n- 自带复古时尚感\n- 适合拍照出片\n\n## 场景推荐\n| 场景 | 搭配建议 |\n|------|---------|\n| 约会 | 黑色猫眼 + 红唇 |\n| 闺蜜聚会 | 玳瑁猫眼 + 慵懒卷发 |\n| 街拍 | 透明猫眼 + 高马尾 |\n| 职场 | 细框猫眼 + 西装 |\n\n## 不适合\n- 菱形脸（颧骨更突出）\n- 倒三角脸型（加重失衡感）',
 0.5, '内容团队', 'active', NOW(), NOW());

-- Step 7: 私有知识 5 条
INSERT INTO knowledge_entry (id, title, visibility, type, tags, content, weight, contributor, status, created_at, updated_at) VALUES
('kp-001', '钛合金供应商报价汇总', 'private', 'DATA',
 '["钛合金","供应链","成本"]',
 '## 供应商报价（绝密）\n| 供应商 | 钛合金报价/kg | 起订量 | 交期 |\n|------|-------------|--------|------|\n| A 厂 | ¥XXX | 500kg | 30天 |\n| B 厂 | ¥XXX | 200kg | 45天 |\n| C 厂 | ¥XXX | 1000kg | 20天 |\n\n> ⚠️ 此为供应链核心机密，请勿外传',
 0.5, 'Henry', 'active', NOW(), NOW()),

('kp-002', '秒镜VIP定价策略与利润空间', 'private', 'STRATEGY',
 '["定价","VIP","利润"]',
 '## 定价公式\n零售价 = 成本价 × 倍率系数\n\n| 产品线 | 倍率 | 毛利率 |\n|------|------|--------|\n| ESSENTIAL | 2.5x | 60% |\n| PREMIUM | 3.5x | 71% |\n| LUXURY | 5x | 80% |\n\n## VIP 折扣空间\n- Normal: 无折扣\n- Silver: 95 折\n- Gold: 9 折\n- Diamond: 85 折\n\n> ⚠️ 此为定价核心策略，请勿外传',
 0.5, 'Henry', 'active', NOW(), NOW()),

('kp-003', '竞品成本逆向分析', 'private', 'DATA',
 '["竞品","成本","分析"]',
 '## 竞品成本拆解（估算）\n| 品牌 | 镜框成本 | 镜片成本 | 渠道成本 | 零售价 | 毛利率 |\n|------|---------|---------|---------|--------|--------|\n| 暴龙 | ¥60 | ¥40 | ¥100 | ¥498 | 60% |\n| 帕莎 | ¥50 | ¥35 | ¥80 | ¥398 | 58% |\n| 陌森 | ¥45 | ¥30 | ¥70 | ¥348 | 58% |\n\n## 秒镜优势\n快拆结构专利 → 单用户可买多框 → 用户 LTV 提升 3-5 倍\n\n> ⚠️ 此为竞争情报，请勿外传',
 0.5, 'Henry', 'active', NOW(), NOW()),

('kp-004', '首季度销售目标与拆解', 'private', 'DATA',
 '["销售","目标","计划"]',
 '## Q2 2026 销售目标\n| 月份 | 销售额 | 订单数 | 客单价 |\n|------|--------|--------|--------|\n| 5月 | ¥50,000 | 125 | ¥400 |\n| 6月 | ¥80,000 | 200 | ¥400 |\n| 7月 | ¥120,000 | 300 | ¥400 |\n\n## 渠道拆解\n- 小红书: 60%\n- 抖音: 20%\n- 线下体验: 15%\n- 其他: 5%\n\n> ⚠️ 此为内部经营目标，请勿外传',
 0.5, 'Henry', 'active', NOW(), NOW()),

('kp-005', '关键供应商联系方式', 'private', 'DATA',
 '["供应链","联系方式","供应商"]',
 '## 供应商名录\n| 类型 | 代号 | 联系人 | 手机 | 微信 |\n|------|------|--------|------|------|\n| 钛合金 | T1 | XXX | 138****1234 | xxx_wx |\n| TR90 | P1 | XXX | 139****5678 | xxx_wx |\n| 板材 | B1 | XXX | 137****9012 | xxx_wx |\n| 镜片 | L1 | XXX | 136****3456 | xxx_wx |\n| 包装 | PK1 | XXX | 135****7890 | xxx_wx |\n\n> ⚠️ 此为供应链核心资产，请勿外传',
 0.5, 'Henry', 'active', NOW(), NOW());

-- Step 8: 更新 system_module_registry（知识库模块已简化）
UPDATE system_module_registry SET metadata = '{"description":"ER-OS 知识库管理（标签驱动）"}' WHERE id = 'mod-knowledge';

-- Step 9: 删除旧的索引（如果存在）
ALTER TABLE knowledge_entry DROP INDEX idx_contributor;

-- Step 10: 新增索引
ALTER TABLE knowledge_entry
  ADD INDEX idx_visibility (visibility),
  ADD INDEX idx_weight (weight);
