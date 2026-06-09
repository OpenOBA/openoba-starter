-- Migration: 43-create-deliverable-manifest.sql
-- 创建交付物清单表，记录每个任务的每个版本的交付物元数据
-- Phase B1: ERA 交付物管理

CREATE TABLE IF NOT EXISTS deliverable_manifest (
  id          VARCHAR(36)  NOT NULL COMMENT '主键 UUID',
  task_id     VARCHAR(36)  NOT NULL COMMENT '关联任务 ID',
  task_title  VARCHAR(200) NOT NULL COMMENT '任务标题（冗余，便于显示）',
  version     INT          NOT NULL DEFAULT 1 COMMENT '版本号',
  user_type   VARCHAR(20)  NOT NULL DEFAULT 'operator' COMMENT '用户类型: operator/developer/maintainer',
  status      VARCHAR(20)  NOT NULL DEFAULT 'draft' COMMENT '状态: draft/approved/published/archived',
  created_by  VARCHAR(64)  NOT NULL COMMENT '创建者（Agent 或 人类）',
  approved_by VARCHAR(64)  NULL     COMMENT '审批者',
  changelog   TEXT         NULL     COMMENT '本版本变更说明',
  parent_version INT       NULL     COMMENT '父版本号（首次为 NULL）',
  file_count  INT          NOT NULL DEFAULT 0 COMMENT '文件数量',
  total_size  BIGINT       NOT NULL DEFAULT 0 COMMENT '总大小（字节）',
  dir_path    VARCHAR(512) NOT NULL COMMENT '版本目录相对路径（相对于 deliverableRoot）',
  extra       JSON         NULL     COMMENT '扩展信息',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_task_id (task_id),
  INDEX idx_task_version (task_id, version),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交付物清单';
