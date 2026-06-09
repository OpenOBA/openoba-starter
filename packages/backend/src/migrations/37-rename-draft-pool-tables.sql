-- ============================================
-- Migration 37: Draft-Pool 表重命名 + 主键规范化
-- ============================================

-- 1. agent_tasks → draft_task
ALTER TABLE `agent_tasks`
  DROP INDEX `idx_reference`,
  DROP INDEX `idx_status`,
  DROP INDEX `idx_task_type`,
  RENAME TO `draft_task`,
  CHANGE COLUMN `task_id` `id` VARCHAR(36) NOT NULL,
  ADD INDEX `idx_draft_task_status` (`status`),
  ADD INDEX `idx_draft_task_type` (`task_type`);

-- 2. publish_packages → draft_publish_batch
ALTER TABLE `publish_packages`
  RENAME TO `draft_publish_batch`,
  CHANGE COLUMN `publish_id` `id` VARCHAR(36) NOT NULL;

-- 3. advisory_reports → advisory_report
ALTER TABLE `advisory_reports`
  RENAME TO `advisory_report`,
  CHANGE COLUMN `report_id` `id` VARCHAR(36) NOT NULL;

-- 4. draft_batches → draft_batch
ALTER TABLE `draft_batches`
  RENAME TO `draft_batch`,
  CHANGE COLUMN `batch_id` `id` VARCHAR(36) NOT NULL;
