-- ============================================
-- Migration 39: ERDL 命名空间修正（种子数据）
-- ============================================
-- 依据：ER-OS-ERDL-命名规范与开发标准-V1.0.md §2.3
--        ER-OS-代码基线深度审计报告-V2.0-DSv4.md P0-4
-- 日期：2026-05-04
-- 作者：唐浩然

-- 注意：erdl_rule_definition 等 Migration 35 的表已被标记为孤儿表，
-- 但数据库可能仍有数据，先修正 namespace 保证一致性。

-- ============================================
-- 1. erdl_knowledge_source 种子数据 namespace 修正
-- ============================================
UPDATE `erdl_knowledge_source`
SET `namespace` = 'industry.eyewear'
WHERE `namespace` IN ('com.miaojing', 'com.miaojing.eyewear');

-- ============================================
-- 2. erdl_agent_capability（如有数据）修正
-- ============================================
UPDATE `erdl_agent_capability`
SET `namespace` = 'industry.eyewear'
WHERE `namespace` IN ('com.miaojing', 'com.miaojing.eyewear');

-- ============================================
-- 3. 修改 erdl_rule_definition 的 DEFAULT 值
-- ============================================
ALTER TABLE `erdl_rule_definition`
  MODIFY COLUMN `namespace` VARCHAR(128) NOT NULL DEFAULT 'industry.eyewear'
  COMMENT '命名空间';

ALTER TABLE `erdl_knowledge_source`
  MODIFY COLUMN `namespace` VARCHAR(128) NOT NULL DEFAULT 'industry.eyewear'
  COMMENT '命名空间';

ALTER TABLE `erdl_agent_capability`
  MODIFY COLUMN `namespace` VARCHAR(128) NOT NULL DEFAULT 'industry.eyewear'
  COMMENT '命名空间';
