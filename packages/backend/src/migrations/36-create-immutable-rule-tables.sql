-- 秒镜科技 · ERDL 议会模型：不可变规则 + 快照 + 提案
-- Migration: 36-create-immutable-rule-tables.sql
-- 创建时间: 2026-05-01
-- 描述: 创建不可变规则存储、快照管理、提案引擎所需的数据库表

-- ============================================
-- 1. 不可变规则记录表
-- 规则从不修改，只追加新版本
-- ============================================

CREATE TABLE IF NOT EXISTS `erdl_rule_record` (
  `rule_record_id` VARCHAR(36) NOT NULL COMMENT '记录唯一 ID',
  `rule_id` VARCHAR(64) NOT NULL COMMENT '规则逻辑 ID（跨版本不变）',
  `namespace` VARCHAR(128) NOT NULL COMMENT '命名空间',
  `rule_name` VARCHAR(255) NOT NULL COMMENT '规则名称',
  `version` INT NOT NULL DEFAULT 1 COMMENT '规则版本号（同 ruleId 下递增）',
  `content` LONGTEXT NOT NULL COMMENT '规则 YAML 原文',
  `content_hash` VARCHAR(64) NOT NULL COMMENT 'SHA256(content)',
  `parent_hash` VARCHAR(64) DEFAULT NULL COMMENT '上一版本的 content_hash（链式）',
  `snapshot_id` VARCHAR(36) NOT NULL COMMENT '所属全局快照 ID',
  `created_by` VARCHAR(64) NOT NULL COMMENT '提案者（Agent ID 或用户 ID）',
  `proposal_id` VARCHAR(36) DEFAULT NULL COMMENT '关联的提案 ID',
  `created_at` BIGINT NOT NULL COMMENT '创建时间戳（毫秒）',
  PRIMARY KEY (`rule_record_id`),
  INDEX `idx_rule_id_version` (`rule_id`, `version` DESC),
  INDEX `idx_namespace` (`namespace`),
  INDEX `idx_snapshot_id` (`snapshot_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='不可变规则记录表';

-- ============================================
-- 2. 全局快照表
-- 每次规则变更后生成新快照
-- ============================================

CREATE TABLE IF NOT EXISTS `erdl_snapshot` (
  `snapshot_id` VARCHAR(36) NOT NULL COMMENT '快照唯一 ID',
  `snapshot_seq` INT NOT NULL COMMENT '单调递增序列号',
  `predecessor_id` VARCHAR(36) DEFAULT NULL COMMENT '上一个快照 ID',
  `rule_count` INT NOT NULL DEFAULT 0 COMMENT '快照内规则数量',
  `created_by` VARCHAR(64) NOT NULL COMMENT '创建者',
  `created_at` BIGINT NOT NULL COMMENT '创建时间戳（毫秒）',
  `metadata` JSON DEFAULT NULL COMMENT '快照元数据（含 proposal_ids）',
  PRIMARY KEY (`snapshot_id`),
  UNIQUE INDEX `idx_snapshot_seq` (`snapshot_seq`),
  INDEX `idx_predecessor` (`predecessor_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局快照表';

-- ============================================
-- 3. 规则提案表
-- Agent 通过提交提案来修改规则
-- ============================================

CREATE TABLE IF NOT EXISTS `erdl_proposal` (
  `proposal_id` VARCHAR(36) NOT NULL COMMENT '提案唯一 ID',
  `type` ENUM('create', 'update', 'delete') NOT NULL COMMENT '提案类型',
  `target_namespace` VARCHAR(128) NOT NULL COMMENT '目标命名空间',
  `target_rule_id` VARCHAR(64) DEFAULT NULL COMMENT '目标规则 ID（update/delete 时）',
  `target_rule_name` VARCHAR(255) DEFAULT NULL COMMENT '目标规则名',
  `content` LONGTEXT DEFAULT NULL COMMENT '新规则 YAML（create/update 时）',
  `proposed_by` VARCHAR(64) NOT NULL COMMENT '提案者（Agent ID）',
  `proposed_at` BIGINT NOT NULL COMMENT '提交时间戳',
  `status` ENUM('pending', 'validating', 'voting', 'accepted', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '提案状态',
  `approval_level` ENUM('auto', 'agent_check', 'human', 'multi_human') NOT NULL DEFAULT 'agent_check' COMMENT '审批级别',
  `affected_namespaces` JSON DEFAULT NULL COMMENT '受影响的 namespace 列表',
  `affected_agents` JSON DEFAULT NULL COMMENT '受影响的 Agent 列表',
  `validation_errors` JSON DEFAULT NULL COMMENT '校验错误列表',
  `reject_reason` TEXT DEFAULT NULL COMMENT '驳回原因',
  `result_snapshot_id` VARCHAR(36) DEFAULT NULL COMMENT '通过后生成的快照 ID',
  `updated_at` BIGINT DEFAULT NULL COMMENT '最后更新时间戳',
  PRIMARY KEY (`proposal_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_proposed_by` (`proposed_by`),
  INDEX `idx_proposed_at` (`proposed_at`),
  INDEX `idx_namespace` (`target_namespace`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='规则提案表';

-- ============================================
-- 4. 提案投票表
-- Agent 对提案的投票记录
-- ============================================

CREATE TABLE IF NOT EXISTS `erdl_proposal_vote` (
  `vote_id` VARCHAR(36) NOT NULL COMMENT '投票唯一 ID',
  `proposal_id` VARCHAR(36) NOT NULL COMMENT '提案 ID',
  `agent_id` VARCHAR(64) NOT NULL COMMENT '投票 Agent ID',
  `verdict` ENUM('approve', 'reject', 'abstain') NOT NULL COMMENT '投票结论',
  `reason` TEXT DEFAULT NULL COMMENT '投票理由',
  `voted_at` BIGINT NOT NULL COMMENT '投票时间戳',
  PRIMARY KEY (`vote_id`),
  INDEX `idx_proposal_agent` (`proposal_id`, `agent_id`),
  INDEX `idx_voted_at` (`voted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提案投票表';

-- ============================================
-- 种子数据：初始快照
-- ============================================

INSERT INTO `erdl_snapshot` (`snapshot_id`, `snapshot_seq`, `predecessor_id`, `rule_count`, `created_by`, `created_at`, `metadata`)
VALUES ('snap-genesis-00000000000000000001', 1, NULL, 6, 'system', 1714560000000, '{"description": "Genesis snapshot from eyewear.erdl", "proposal_ids": []}');
