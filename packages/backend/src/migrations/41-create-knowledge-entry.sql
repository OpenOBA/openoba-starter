-- ============================================
-- Migration 41: knowledge_entry 知识库表
-- ============================================
-- 依据：ER-OS-Agent工作流引擎与任务编排系统-V2.0.md §4
-- 日期：2026-05-05
-- 作者：唐浩然

CREATE TABLE IF NOT EXISTS `knowledge_entry` (
  `id`              VARCHAR(36) NOT NULL COMMENT '知识条目唯一 ID',
  `title`           VARCHAR(255) NOT NULL COMMENT '知识标题',
  `type`            ENUM('DOCUMENT','EXPERIENCE','CASE','DATA','FAQ','POLICY') NOT NULL DEFAULT 'EXPERIENCE' COMMENT '知识类型',
  `domain`          VARCHAR(100) DEFAULT NULL COMMENT '领域（如 eyewear/marketing/supply_chain）',
  `tags`            JSON DEFAULT NULL COMMENT '标签数组 ["titanium","nose_pad","comfort"]',
  `content`         TEXT NOT NULL COMMENT '知识内容（Markdown）',
  `contributor`     VARCHAR(100) DEFAULT NULL COMMENT '贡献者',
  `channel`         VARCHAR(50) DEFAULT NULL COMMENT '贡献渠道（@KnowledgeBot/web/import）',
  `evidence`        JSON DEFAULT NULL COMMENT '佐证材料 [{type, url, description}]',
  `status`          ENUM('PENDING_VERIFY','VERIFIED','ACTIVE','OUTDATED','ARCHIVED') NOT NULL DEFAULT 'PENDING_VERIFY' COMMENT '知识状态',
  `verified_by`     VARCHAR(100) DEFAULT NULL COMMENT '验证人',
  `verified_at`     DATETIME DEFAULT NULL COMMENT '验证时间',
  `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_domain` (`domain`),
  INDEX `idx_status` (`status`),
  INDEX `idx_contributor` (`contributor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ER-OS 知识库（Agent 推理和人类经验的沉淀池）';

-- 种子数据：眼镜行业经验
INSERT INTO `knowledge_entry` (`id`, `title`, `type`, `domain`, `tags`, `content`, `contributor`, `channel`, `status`) VALUES
  ('kb-001', '钛合金镜框鼻托舒适度优化', 'EXPERIENCE', 'eyewear',
   '["titanium","nose_pad","comfort"]',
   '## 问题\n钛合金镜框重量轻但鼻托容易滑动，部分用户反馈佩戴 2 小时后鼻梁有压痕。\n\n## 解决方案\n1. 鼻托改用硅胶材质，增加摩擦系数\n2. 鼻托间距缩小 2mm，适配亚洲人脸型\n3. 镜腿末端加配重块，平衡重心\n\n## 效果\n客诉率从 12% 降至 3%。',
   '产品团队', 'web', 'VERIFIED'),

  ('kb-002', '轻奢定价模型参考', 'DATA', 'eyewear',
   '["pricing","luxury","benchmark"]',
   '## 轻奢眼镜定价区间\n- ESSENTIAL 线：¥198-298（基础款，引流）\n- PREMIUM 线：¥348-498（主力款，占比 60%）\n- LUXURY 线：¥598-898（限量款，占 15%）\n\n## 竞品参考\n| 品牌 | 均价 | 材质 |\n|------|------|------|\n| 暴龙 | ¥498 | TR90 |\n| 帕莎 | ¥398 | 板材 |\n| 陌森 | ¥348 | 合金 |',
   '市场部', 'web', 'VERIFIED'),

  ('kb-003', '小红书文案风格指南', 'DOCUMENT', 'marketing',
   '["content","xiaohongshu","copywriting"]',
   '## 标题公式\n- 数字+痛点+解决方案：「3 副眼镜换一周穿搭，同事问我是不是换了张脸」\n- 对比反差：「以前 2 年换 1 副，现在 1 周换 3 副」\n\n## 正文结构\n1. 个人经历（建立信任）\n2. 产品介绍（自然植入）\n3. 使用场景（引发共鸣）\n4. 行动号召（引导购买）\n\n## 话题标签\n#换框眼镜 #颜值18变 #一场景一镜框 #秒镜科技',
   '内容团队', 'web', 'ACTIVE'),

  ('kb-004', '圆框脸型适配规则', 'FAQ', 'eyewear',
   '["frame_shape","face_shape","recommendation"]',
   '## 圆框适合\n- 方脸：圆框柔化棱角 ✅\n- 长脸：圆框缩短面部视觉 ✅\n- 心形脸：圆框平衡额头宽度 ✅\n\n## 圆框不适合\n- 圆脸：圆框+圆脸=更圆 ❌（建议方框/猫眼）\n- 短脸：圆框显脸更短 ❌',
   '产品团队', 'import', 'ACTIVE');

-- 更新 system_module_registry 注册知识库模块
INSERT INTO `system_module_registry` (`id`, `module_name`, `module_type`, `version`, `status`, `metadata`) VALUES
  ('mod-knowledge', 'knowledge', 'knowledge', '1.0.0', 'active', '{"description": "ER-OS 知识库管理"}');
