-- ⚠️  此文件仅用于首次安装建表
--    已在生产数据库执行过请勿再次执行
--    使用 CREATE TABLE IF NOT EXISTS 防止数据丢失

-- OpenOBA Starter init-structure.sql
-- Generated from openoba_clean (128 tables)
-- Date: 2026-06-04T11:59:42.844Z

-- (first-time-only: `advisory_report`)
CREATE TABLE IF NOT EXISTS `advisory_report` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `query_context` text COLLATE utf8mb4_unicode_ci,
  `summary` text COLLATE utf8mb4_unicode_ci,
  `recommendations` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_info` text COLLATE utf8mb4_unicode_ci,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `aesthetic_compat_matrices`)
CREATE TABLE IF NOT EXISTS `aesthetic_compat_matrices` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `matrix_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dimension_x` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dimension_y` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `compat_data` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `aesthetic_feedback`)
CREATE TABLE IF NOT EXISTS `aesthetic_feedback` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feedback_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `aesthetic_rules`)
CREATE TABLE IF NOT EXISTS `aesthetic_rules` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `check_target` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expression` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'warn',
  `message_template` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rule_code` (`rule_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `after_sales`)
CREATE TABLE IF NOT EXISTS `after_sales` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `after_sale_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_item_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `refund_transaction_no` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_after_sale_no` (`after_sale_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `after_sales_log`)
CREATE TABLE IF NOT EXISTS `after_sales_log` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `after_sale_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `agent_memory`)
CREATE TABLE IF NOT EXISTS `agent_memory` (
  `memory_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记忆标题',
  `content` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记忆内容（Markdown）',
  `category` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lesson' COMMENT 'lesson/rule/discovery/preference/context',
  `severity` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info' COMMENT 'critical/warning/info/success',
  `scope` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'global' COMMENT 'global/task_type/entity/agent',
  `scope_value` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'scope=task_type时存 product_listing',
  `owner_agent` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属Agent（null=共享）',
  `visibility` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private' COMMENT 'private/team/public',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号，每次修改+1',
  `hit_count` int NOT NULL DEFAULT '0' COMMENT '被注入次数',
  `last_hit_at` datetime DEFAULT NULL COMMENT '最近注入时间',
  `source_session` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源 agent_session.id',
  `source_task` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源 agent_task.id',
  `source_error` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源 agent_error_log.id',
  `media_refs` json DEFAULT NULL COMMENT '关联媒体路径（预留视觉模型）',
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'active/deprecated/archived',
  `deprecated_by` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '被哪个新版本取代',
  `created_by` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'agent' COMMENT 'agent/human/system',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`memory_id`),
  KEY `idx_memory_scope` (`scope`,`scope_value`),
  KEY `idx_memory_category` (`category`),
  KEY `idx_memory_severity` (`severity`),
  KEY `idx_memory_agent` (`owner_agent`),
  KEY `idx_memory_status` (`status`),
  KEY `idx_memory_hit` (`hit_count`),
  FULLTEXT KEY `ft_memory` (`title`,`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `agent_registry`)
CREATE TABLE IF NOT EXISTS `agent_registry` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `platform` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capabilities` json DEFAULT NULL,
  `default_report_to` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allowed_actions` json DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_name` (`agent_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `agent_task`)
CREATE TABLE IF NOT EXISTS `agent_task` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_to` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `escalate_to` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `escalation_hours` int NOT NULL DEFAULT '48',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'drafted',
  `current_phase` int NOT NULL DEFAULT '0',
  `total_phases` int NOT NULL DEFAULT '0',
  `report_frequency` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'every_step',
  `context` json DEFAULT NULL,
  `proposals` json DEFAULT NULL,
  `deliverables` json DEFAULT NULL,
  `agent_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `max_retries` int NOT NULL DEFAULT '3',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_no` (`task_no`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_report_to` (`report_to`),
  KEY `idx_agent_id` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `cognitive_log`)
CREATE TABLE IF NOT EXISTS `cognitive_log` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `log_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` json NOT NULL,
  `agent_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_log_type` (`log_type`),
  KEY `idx_source` (`source_module`,`source_id`),
  KEY `idx_agent_id` (`agent_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `color_design_project`)
CREATE TABLE IF NOT EXISTS `color_design_project` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `season` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_material_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `design_brief` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `priority` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `assigned_to` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `color_material_mapping`)
CREATE TABLE IF NOT EXISTS `color_material_mapping` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feasibility_level` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'good',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `color_palette_item`)
CREATE TABLE IF NOT EXISTS `color_palette_item` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `palette_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `color_project_color`)
CREATE TABLE IF NOT EXISTS `color_project_color` (
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`,`color_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `color_seasonal_palette`)
CREATE TABLE IF NOT EXISTS `color_seasonal_palette` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `palette_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `season` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int NOT NULL,
  `tags` json DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer`)
CREATE TABLE IF NOT EXISTS `customer` (
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_level` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `company_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wechat` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscription_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `wholesale_tier` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `member_discount_rate` decimal(3,2) NOT NULL DEFAULT '1.00',
  `points_balance` int NOT NULL DEFAULT '0',
  `member_valid_until` datetime DEFAULT NULL,
  `member_since` datetime DEFAULT NULL,
  `last_active_at` datetime DEFAULT NULL,
  `points_earned` int NOT NULL DEFAULT '0',
  `points_used` int NOT NULL DEFAULT '0',
  `partner_services` json DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `referral_source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preferred_style` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wechat_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `registered_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `password_reset_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_reset_expires` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `attributes` json DEFAULT NULL,
  `total_orders` int NOT NULL DEFAULT '0',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `last_order_at` timestamp NULL DEFAULT NULL,
  `last_contact_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uk_customer_code` (`customer_code`),
  KEY `idx_type` (`customer_type`),
  KEY `idx_level` (`customer_level`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer_address`)
CREATE TABLE IF NOT EXISTS `customer_address` (
  `address_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail_address` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiver_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiver_phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer_consumption_profile`)
CREATE TABLE IF NOT EXISTS `customer_consumption_profile` (
  `consumption_profile_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_lens_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_sku_code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `use_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `use_frequency` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scene_tags` json DEFAULT NULL,
  `attributes` json DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`consumption_profile_id`),
  KEY `idx_customer_lens` (`customer_lens_id`),
  KEY `idx_use_status` (`use_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer_contact`)
CREATE TABLE IF NOT EXISTS `customer_contact` (
  `contact_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wechat` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`contact_id`),
  KEY `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer_lens`)
CREATE TABLE IF NOT EXISTS `customer_lens` (
  `customer_lens_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prescription_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `attributes` json DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_lens_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_structure_standard` (`structure_standard_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer_login_log`)
CREATE TABLE IF NOT EXISTS `customer_login_log` (
  `log_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_method` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_result` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(48) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fail_reason` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `customer_tier_pricing`)
CREATE TABLE IF NOT EXISTS `customer_tier_pricing` (
  `pricing_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_sku_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_rate` decimal(4,3) DEFAULT NULL,
  `min_quantity` int NOT NULL DEFAULT '1',
  `max_quantity` int DEFAULT NULL,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `pricing_mode` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'discount',
  `fixed_price` decimal(10,2) DEFAULT NULL,
  `agreement_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agreement_start` date DEFAULT NULL,
  `agreement_end` date DEFAULT NULL,
  `sales_rep` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pricing_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_tier` (`tier`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `deliverable_manifest`)
CREATE TABLE IF NOT EXISTS `deliverable_manifest` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `user_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'operator',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_by` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changelog` text COLLATE utf8mb4_unicode_ci,
  `parent_version` int DEFAULT NULL,
  `file_count` int NOT NULL DEFAULT '0',
  `total_size` bigint NOT NULL DEFAULT '0',
  `dir_path` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_task_version` (`task_id`,`version`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_after_sale_reason`)
CREATE TABLE IF NOT EXISTS `dict_after_sale_reason` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `after_sale_type_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_after_sale_status`)
CREATE TABLE IF NOT EXISTS `dict_after_sale_status` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_audit_status`)
CREATE TABLE IF NOT EXISTS `dict_audit_status` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_brand`)
CREATE TABLE IF NOT EXISTS `dict_brand` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'third_party' COMMENT 'own/third_party',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_code_spec`)
CREATE TABLE IF NOT EXISTS `dict_code_spec` (
  `id` varchar(36) NOT NULL,
  `spec_code` varchar(64) NOT NULL,
  `spec_name` varchar(128) NOT NULL,
  `entity` varchar(64) NOT NULL,
  `field` varchar(64) NOT NULL,
  `template` varchar(256) NOT NULL,
  `pattern` varchar(256) DEFAULT NULL,
  `immutable` tinyint DEFAULT '1',
  `llm_description` text NOT NULL,
  `variables` json DEFAULT NULL,
  `is_active` tinyint DEFAULT '1',
  `scope` varchar(32) DEFAULT 'global',
  `scope_value` varchar(64) DEFAULT NULL,
  `priority` int DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `spec_code` (`spec_code`),
  KEY `idx_entity_field` (`entity`,`field`),
  KEY `idx_scope` (`scope`,`scope_value`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- (first-time-only: `dict_compatibility_level`)
CREATE TABLE IF NOT EXISTS `dict_compatibility_level` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_contact_role`)
CREATE TABLE IF NOT EXISTS `dict_contact_role` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色编码',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认角色',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系人角色字典';

-- (first-time-only: `dict_customer_level`)
CREATE TABLE IF NOT EXISTS `dict_customer_level` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_customer_status`)
CREATE TABLE IF NOT EXISTS `dict_customer_status` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '鐘舵?缂栫爜',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '鐘舵?鍚嶇О',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '鎻忚堪',
  `color` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'UI鏍囩?棰滆壊: success/warning/danger/info',
  `sort_order` int DEFAULT '0' COMMENT '鎺掑簭',
  `is_active` tinyint DEFAULT '1' COMMENT '鏄?惁鍚?敤',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='瀹㈡埛鐘舵?瀛楀吀';

-- (first-time-only: `dict_customer_type`)
CREATE TABLE IF NOT EXISTS `dict_customer_type` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_effect_tag`)
CREATE TABLE IF NOT EXISTS `dict_effect_tag` (
  `effect_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '效果编码',
  `effect_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '效果类型(skin_tone/face_shape)',
  `effect_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '效果名称',
  `target_value` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '目标值',
  `recommended_colors` json DEFAULT NULL COMMENT '推荐颜色',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  PRIMARY KEY (`effect_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='效果标签字典';

-- (first-time-only: `dict_frame_material`)
CREATE TABLE IF NOT EXISTS `dict_frame_material` (
  `material_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '材质编码',
  `material_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '材质名称',
  `material_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '材质英文名',
  `material_category` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '材质分类',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `is_active` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='镜框材质字典';

-- (first-time-only: `dict_frame_type`)
CREATE TABLE IF NOT EXISTS `dict_frame_type` (
  `type_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_hinge`)
CREATE TABLE IF NOT EXISTS `dict_hinge` (
  `hinge_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hinge_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hinge_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `features` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hinge_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_lens_coating`)
CREATE TABLE IF NOT EXISTS `dict_lens_coating` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_lens_function`)
CREATE TABLE IF NOT EXISTS `dict_lens_function` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '功能名',
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消费者展示名',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_lens_material`)
CREATE TABLE IF NOT EXISTS `dict_lens_material` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_logistics_company`)
CREATE TABLE IF NOT EXISTS `dict_logistics_company` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `english_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_url_template` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_logistics_status`)
CREATE TABLE IF NOT EXISTS `dict_logistics_status` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_logistics_trace_type`)
CREATE TABLE IF NOT EXISTS `dict_logistics_trace_type` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_nose_pad`)
CREATE TABLE IF NOT EXISTS `dict_nose_pad` (
  `pad_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pad_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pad_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_adjustable` tinyint NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pad_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_order_status`)
CREATE TABLE IF NOT EXISTS `dict_order_status` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_payment_method`)
CREATE TABLE IF NOT EXISTS `dict_payment_method` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_payment_scene`)
CREATE TABLE IF NOT EXISTS `dict_payment_scene` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_payment_status`)
CREATE TABLE IF NOT EXISTS `dict_payment_status` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_product_status`)
CREATE TABLE IF NOT EXISTS `dict_product_status` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????: draft/on_sale/off_sale',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???????';

-- (first-time-only: `dict_product_tier`)
CREATE TABLE IF NOT EXISTS `dict_product_tier` (
  `tier_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier_desc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `icon_color` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_product_type`)
CREATE TABLE IF NOT EXISTS `dict_product_type` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_promotion_status`)
CREATE TABLE IF NOT EXISTS `dict_promotion_status` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????: draft/active/paused/expired',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???????';

-- (first-time-only: `dict_referral_source`)
CREATE TABLE IF NOT EXISTS `dict_referral_source` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道编码',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道名称',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `channel_group` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道分组: social/video/search/offline/partner/other',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户来源渠道字典';

-- (first-time-only: `dict_refractive_index`)
CREATE TABLE IF NOT EXISTS `dict_refractive_index` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '技术名',
  `display_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消费者展示名',
  `value` decimal(4,2) NOT NULL COMMENT '折射率数值',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_review_status`)
CREATE TABLE IF NOT EXISTS `dict_review_status` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_review_tag`)
CREATE TABLE IF NOT EXISTS `dict_review_tag` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_sku_color`)
CREATE TABLE IF NOT EXISTS `dict_sku_color` (
  `color_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name_en` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pinyin_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pinyin_initial` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_family` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'solid',
  `hex_value` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pantone_ref` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_image` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `trend_score` int NOT NULL DEFAULT '50',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`color_id`),
  UNIQUE KEY `uk_color_code` (`color_code`),
  KEY `idx_color_family` (`color_family`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_sku_status`)
CREATE TABLE IF NOT EXISTS `dict_sku_status` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????: active/inactive/discontinued',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SKU?????';

-- (first-time-only: `dict_spu_color`)
CREATE TABLE IF NOT EXISTS `dict_spu_color` (
  `dict_id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name_en` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pinyin_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '中文名拼音（如 "fen hong"）',
  `pinyin_initial` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '拼音首字母（如 "fh"）',
  `color_family` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'solid',
  `pattern_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hex_value` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pantone_ref` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pantone 参考编号',
  `hex_values` json DEFAULT NULL,
  `swatch_image` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trend_score` decimal(3,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `color_code` (`color_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_subscription_status`)
CREATE TABLE IF NOT EXISTS `dict_subscription_status` (
  `code` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态编码',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态名称',
  `description` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `color` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'el-tag 颜色',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅状态字典';

-- (first-time-only: `dict_surface_treatment`)
CREATE TABLE IF NOT EXISTS `dict_surface_treatment` (
  `treatment_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `treatment_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `treatment_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`treatment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_unit`)
CREATE TABLE IF NOT EXISTS `dict_unit` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft`)
CREATE TABLE IF NOT EXISTS `draft` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `draft_no` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `draft_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'editing',
  `body_text` text COLLATE utf8mb4_unicode_ci,
  `body_json` json DEFAULT NULL,
  `attachments` json DEFAULT NULL,
  `blocks` json DEFAULT NULL,
  `delivery_channel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `local_base_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `source_task_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_session_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_agent` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_prompt` text COLLATE utf8mb4_unicode_ci,
  `publish_action` json DEFAULT NULL,
  `publish_snapshot` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_draft_no` (`draft_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft_batch`)
CREATE TABLE IF NOT EXISTS `draft_batch` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `generation_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_count` int NOT NULL DEFAULT '0',
  `approved_count` int NOT NULL DEFAULT '0',
  `rejected_count` int NOT NULL DEFAULT '0',
  `published_count` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'generating',
  `prompt_context` text COLLATE utf8mb4_unicode_ci,
  `error_info` text COLLATE utf8mb4_unicode_ci,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft_publish_batch`)
CREATE TABLE IF NOT EXISTS `draft_publish_batch` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `package_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `draft_count` int NOT NULL DEFAULT '0',
  `sku_count` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `published_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `error_info` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft_sku`)
CREATE TABLE IF NOT EXISTS `draft_sku` (
  `draft_sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `draft_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skin_tone_effect` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `face_shape_effect` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `aesthetic_score` decimal(5,2) DEFAULT NULL,
  `aesthetic_level` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_unicode_ci,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `published_sku_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`draft_sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft_spu`)
CREATE TABLE IF NOT EXISTS `draft_spu` (
  `draft_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shape_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `structure_standard_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `spu_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `spu_description` text COLLATE utf8mb4_unicode_ci,
  `display_name_template` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ai',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `aesthetic_score` decimal(5,2) DEFAULT NULL,
  `aesthetic_level` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_unicode_ci,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `published_spu_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `reviewed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`draft_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft_task`)
CREATE TABLE IF NOT EXISTS `draft_task` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `input_context` json DEFAULT NULL,
  `output_result` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `progress` int NOT NULL DEFAULT '0',
  `error_info` text COLLATE utf8mb4_unicode_ci,
  `retry_count` int NOT NULL DEFAULT '0',
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `erdl_proposal`)
CREATE TABLE IF NOT EXISTS `erdl_proposal` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proposal_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `proposed_by` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changes` json NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewed_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `erdl_rule_record`)
CREATE TABLE IF NOT EXISTS `erdl_rule_record` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expression` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `version` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `erdl_snapshot`)
CREATE TABLE IF NOT EXISTS `erdl_snapshot` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `snapshot_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` json NOT NULL,
  `created_by` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `external_barcode_mapping`)
CREATE TABLE IF NOT EXISTS `external_barcode_mapping` (
  `mapping_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_barcode` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_brand` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_product` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inventory_sku_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mapping_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `inventory`)
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouse_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT',
  `quantity` int NOT NULL DEFAULT '0',
  `locked_quantity` int NOT NULL DEFAULT '0',
  `available_quantity` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_warehouse` (`sku_id`,`warehouse_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `inventory_document`)
CREATE TABLE IF NOT EXISTS `inventory_document` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouse_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DEFAULT',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `total_items` int NOT NULL DEFAULT '0',
  `total_quantity` int NOT NULL DEFAULT '0',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_no` (`document_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `inventory_transaction`)
CREATE TABLE IF NOT EXISTS `inventory_transaction` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `before_quantity` int NOT NULL,
  `after_quantity` int NOT NULL,
  `reference_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `knowledge_entry`)
CREATE TABLE IF NOT EXISTS `knowledge_entry` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visibility` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EXPERIENCE',
  `tags` json NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `weight` float NOT NULL DEFAULT '0.3',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `attachments` json DEFAULT NULL,
  `contributor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_visibility` (`visibility`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_compatibility`)
CREATE TABLE IF NOT EXISTS `lens_compatibility` (
  `compat_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `compatibility_level` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `lens_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`compat_id`),
  UNIQUE KEY `uk_lens_sku` (`product_sku_id`),
  KEY `idx_lens_standard` (`lens_standard_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_material`)
CREATE TABLE IF NOT EXISTS `lens_material` (
  `material_code` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name_en` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_series`)
CREATE TABLE IF NOT EXISTS `lens_series` (
  `series_code` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_name` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_name_en` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`series_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_shape`)
CREATE TABLE IF NOT EXISTS `lens_shape` (
  `shape_code` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shape_name` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shape_name_en` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`shape_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_standard`)
CREATE TABLE IF NOT EXISTS `lens_standard` (
  `standard_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `internal_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shape_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `series_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `width` decimal(5,1) DEFAULT NULL,
  `height` decimal(5,1) DEFAULT NULL,
  `bridge_width` decimal(5,1) DEFAULT NULL,
  `circumference` decimal(6,1) DEFAULT NULL,
  `base_curve` decimal(8,1) DEFAULT NULL,
  `surface_types` json DEFAULT NULL,
  `refractive_indexes` json DEFAULT NULL,
  `lens_material_codes` json DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`standard_id`),
  UNIQUE KEY `uk_external_code` (`external_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_standard_attachment`)
CREATE TABLE IF NOT EXISTS `lens_standard_attachment` (
  `attachment_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `standard_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_standard_id` (`standard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `member_level`)
CREATE TABLE IF NOT EXISTS `member_level` (
  `level_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_rate` decimal(4,3) NOT NULL,
  `upgrade_threshold` decimal(10,2) DEFAULT NULL,
  `benefits` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `member_level_log`)
CREATE TABLE IF NOT EXISTS `member_level_log` (
  `log_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_level` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `new_level` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trigger_reason` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `member_pricing_rule`)
CREATE TABLE IF NOT EXISTS `member_pricing_rule` (
  `rule_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'discount',
  `discount_rate` decimal(4,3) DEFAULT NULL,
  `fixed_price` decimal(10,2) DEFAULT NULL,
  `extra_discount` decimal(4,3) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  `min_quantity` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `start_time` timestamp NULL DEFAULT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `notes` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  KEY `idx_level_code` (`level_code`),
  KEY `idx_sku_id` (`sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `order`)
CREATE TABLE IF NOT EXISTS `order` (
  `order_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'retail',
  `order_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'retail',
  `has_prescription` tinyint(1) NOT NULL DEFAULT '0',
  `has_processing` tinyint(1) NOT NULL DEFAULT '0',
  `is_wholesale` tinyint(1) NOT NULL DEFAULT '0',
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wholesale_tier` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `payment_method` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `payment_status_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid',
  `logistics_status_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'unshipped',
  `after_sale_status_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `review_status_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `total_amount` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `actual_amount` decimal(12,2) NOT NULL,
  `total_retail_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_profit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_margin_pct` decimal(5,2) NOT NULL DEFAULT '0.00',
  `cancel_refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `after_sale_refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `prescription_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `internal_remark` text COLLATE utf8mb4_unicode_ci,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `review_deadline` timestamp NULL DEFAULT NULL,
  `attributes` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `order_address`)
CREATE TABLE IF NOT EXISTS `order_address` (
  `address_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiver_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiver_phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `district` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_detail` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postal_code` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `order_item`)
CREATE TABLE IF NOT EXISTS `order_item` (
  `item_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `retail_price` decimal(10,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_reason` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_ref_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_cost` decimal(10,2) DEFAULT NULL,
  `gross_profit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` decimal(12,2) NOT NULL,
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_tier` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_fulfillment_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'frame_only',
  `lens_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_needed',
  `frame_color` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `frame_size` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prescription_required` tinyint(1) NOT NULL DEFAULT '0',
  `sku_attributes` json DEFAULT NULL,
  `review_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unreviewed',
  `after_sale_status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `remark` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `order_log`)
CREATE TABLE IF NOT EXISTS `order_log` (
  `log_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_data` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `order_payment`)
CREATE TABLE IF NOT EXISTS `order_payment` (
  `payment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_method` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `transaction_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `refunded_at` timestamp NULL DEFAULT NULL,
  `refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `remark` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `order_shipment`)
CREATE TABLE IF NOT EXISTS `order_shipment` (
  `shipment_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tracking_no` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carrier` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `shipper` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `points_transaction`)
CREATE TABLE IF NOT EXISTS `points_transaction` (
  `txn_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` int NOT NULL,
  `balance_after` int NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`txn_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `price_history`)
CREATE TABLE IF NOT EXISTS `price_history` (
  `history_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` decimal(10,2) DEFAULT NULL,
  `new_value` decimal(10,2) NOT NULL,
  `change_reason` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_sku` (`sku_id`),
  KEY `idx_time` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `product_category`)
CREATE TABLE IF NOT EXISTS `product_category` (
  `category_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类ID',
  `category_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类编码',
  `category_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父级ID',
  `level` int NOT NULL DEFAULT '1' COMMENT '层级',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `icon` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `is_recommended` tinyint NOT NULL DEFAULT '0' COMMENT '是否推荐',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_category_code` (`category_code`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类';

-- (first-time-only: `product_set`)
CREATE TABLE IF NOT EXISTS `product_set` (
  `set_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套装ID',
  `set_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套装编码',
  `set_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套装名称',
  `sku_list` json NOT NULL COMMENT 'SKU编码列表',
  `set_price` decimal(10,2) NOT NULL COMMENT '套装价格',
  `original_total_price` decimal(10,2) DEFAULT NULL COMMENT '原价合计',
  `discount_rate` decimal(3,2) DEFAULT NULL COMMENT '折扣率',
  `retail_price` decimal(10,2) DEFAULT NULL COMMENT '零售价累加',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '状态',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `category_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类ID',
  `main_image` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主图URL',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`set_id`),
  UNIQUE KEY `uk_set_code` (`set_code`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品套装';

-- (first-time-only: `product_sku`)
CREATE TABLE IF NOT EXISTS `product_sku` (
  `sku_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SKU ID',
  `sku_code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SKU编码',
  `spu_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SPU ID',
  `sku_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SKU名称',
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '色彩代码',
  `skin_tone_effect` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '肤色效果词',
  `face_shape_effect` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '脸型效果词',
  `display_name` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '展示名',
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '结构标准编码',
  `product_tier` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品层级',
  `sku_attributes` json DEFAULT NULL COMMENT '扩展属性',
  `cost_price` decimal(10,2) DEFAULT NULL COMMENT '成本价',
  `retail_price` decimal(10,2) NOT NULL COMMENT '零售价',
  `min_price` decimal(10,2) DEFAULT NULL COMMENT '最低售价',
  `stock_quantity` int NOT NULL DEFAULT '0' COMMENT '库存数量',
  `warning_quantity` int NOT NULL DEFAULT '10' COMMENT '预警数量',
  `barcode` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '旧条码(废弃)',
  `sku_barcode` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '内部条码',
  `ean13` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'EAN-13',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lens_width` int DEFAULT NULL COMMENT '镜片宽度mm',
  `bridge_width` int DEFAULT NULL COMMENT '鼻梁宽度mm',
  `temple_length` int DEFAULT NULL COMMENT '镜腿长度mm',
  `frame_height` int DEFAULT NULL COMMENT '镜框高度mm(已废弃)',
  `total_width` int DEFAULT NULL COMMENT '总宽度mm',
  `frame_material` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '镜框材质',
  `temple_material` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '镜腿材质',
  `frame_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '镜框类型',
  `nose_pad_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '鼻托类型',
  `hinge_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '铰链类型',
  `weight_g` decimal(5,1) DEFAULT NULL COMMENT '重量(克)',
  `suitable_face_shapes` json DEFAULT NULL COMMENT '适用脸型',
  `surface_treatment` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '表面处理',
  `has_blue_light_filter` tinyint NOT NULL DEFAULT '0' COMMENT '防蓝光',
  `has_photochromic` tinyint NOT NULL DEFAULT '0' COMMENT '变色',
  `has_polarized` tinyint NOT NULL DEFAULT '0' COMMENT '偏光',
  `uv_protection` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UV400' COMMENT 'UV防护',
  `tech_spec_extra` json DEFAULT NULL COMMENT '扩展技术参数',
  PRIMARY KEY (`sku_id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  UNIQUE KEY `uk_sku_barcode` (`sku_barcode`),
  KEY `idx_spu_id` (`spu_id`),
  KEY `idx_color` (`color_code`),
  KEY `idx_status` (`status`),
  KEY `idx_ean13` (`ean13`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SKU';

-- (first-time-only: `product_sku_image`)
CREATE TABLE IF NOT EXISTS `product_sku_image` (
  `image_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '图片ID',
  `sku_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SKU ID',
  `image_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '图片URL',
  `image_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gallery' COMMENT 'main/gallery/detail/lifestyle/360view/website_banner',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否主图',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `alt_text` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '替代文本',
  `width` int DEFAULT NULL COMMENT '图片宽度',
  `height` int DEFAULT NULL COMMENT '图片高度',
  `file_size` int DEFAULT NULL COMMENT '文件大小(bytes)',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  KEY `idx_sku_type` (`sku_id`,`image_type`,`sort_order`),
  KEY `idx_sku_primary` (`sku_id`,`is_primary`),
  KEY `idx_sku_active` (`sku_id`,`is_active`,`is_deleted`),
  KEY `idx_type_active` (`image_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SKU图片';

-- (first-time-only: `product_spu`)
CREATE TABLE IF NOT EXISTS `product_spu` (
  `spu_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SPU ID',
  `spu_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SPU编码',
  `spu_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SPU名称',
  `category_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类ID',
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '结构标准编码',
  `product_tier` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品层级',
  `series_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '系列编码',
  `gender` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unisex' COMMENT 'female/male/unisex/limited',
  `scene_tags` json DEFAULT NULL COMMENT '场景标签',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `main_image` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主图URL',
  `images` json DEFAULT NULL COMMENT '图片列表',
  `attributes` json DEFAULT NULL COMMENT '扩展属性',
  `compatibility_levels` json DEFAULT NULL COMMENT '兼容等级列表',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`spu_id`),
  UNIQUE KEY `uk_spu_code` (`spu_code`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_structure` (`structure_standard_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SPU';

-- (first-time-only: `product_tier_pricing`)
CREATE TABLE IF NOT EXISTS `product_tier_pricing` (
  `tier_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '层级定价ID',
  `tier_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '层级名称',
  `tier_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '层级编码',
  `positioning` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '定位描述',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_id`),
  UNIQUE KEY `uk_tier_code` (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品层级定价';

-- (first-time-only: `promotion`)
CREATE TABLE IF NOT EXISTS `promotion` (
  `promotion_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `promotion_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_ids` json DEFAULT NULL,
  `discount_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_amount` decimal(10,2) DEFAULT NULL,
  `max_discount` decimal(10,2) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `user_limit` int DEFAULT NULL,
  `total_limit` int DEFAULT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  `status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `priority` int NOT NULL DEFAULT '0',
  `stackable` tinyint(1) NOT NULL DEFAULT '0',
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`promotion_id`),
  UNIQUE KEY `uk_promotion_code` (`promotion_code`),
  KEY `idx_status_time` (`status`,`start_time`,`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `promotion_sku`)
CREATE TABLE IF NOT EXISTS `promotion_sku` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `promotion_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `custom_price` decimal(10,2) DEFAULT NULL,
  `priority` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promo_sku` (`promotion_id`,`sku_id`),
  KEY `idx_sku` (`sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `publish_package`)
CREATE TABLE IF NOT EXISTS `publish_package` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `package_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_ids` json DEFAULT NULL,
  `platforms` json DEFAULT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_package_no` (`package_no`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `report_target`)
CREATE TABLE IF NOT EXISTS `report_target` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` json DEFAULT NULL,
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `review`)
CREATE TABLE IF NOT EXISTS `review` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `overall_score` tinyint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `skill_key_vault`)
CREATE TABLE IF NOT EXISTS `skill_key_vault` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_label` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `encrypted_value` text COLLATE utf8mb4_unicode_ci,
  `is_required` tinyint NOT NULL DEFAULT '0',
  `is_masked` tinyint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `skill_registry`)
CREATE TABLE IF NOT EXISTS `skill_registry` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skill_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0.0',
  `category` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entrypoint` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `runtime` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'node18',
  `pricing_model` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'free',
  `pricing_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `pricing_period` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kb_refs` json DEFAULT NULL,
  `mirror_refs` json DEFAULT NULL,
  `permissions` json NOT NULL,
  `dependencies` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `auto_upgrade` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'prompt',
  `installed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_run_at` timestamp NULL DEFAULT NULL,
  `run_count` int NOT NULL DEFAULT '0',
  `error_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skill_name` (`skill_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `sku_effect_recommend`)
CREATE TABLE IF NOT EXISTS `sku_effect_recommend` (
  `rec_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `skin_tone_effect` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `face_shape_effect` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`rec_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `sms_verification_code`)
CREATE TABLE IF NOT EXISTS `sms_verification_code` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `spec_template`)
CREATE TABLE IF NOT EXISTS `spec_template` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'lens/fabric/material',
  `params_schema` json DEFAULT NULL COMMENT '参数定义 JSON Schema',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_type` (`type`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_compatibility`)
CREATE TABLE IF NOT EXISTS `structure_compatibility` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `structure_standard_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lens_material_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lens_refractive_index` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `compatibility_description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_material`)
CREATE TABLE IF NOT EXISTS `structure_material` (
  `material_code` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name_en` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_series`)
CREATE TABLE IF NOT EXISTS `structure_series` (
  `series_code` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_name` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_name_en` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`series_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_shape`)
CREATE TABLE IF NOT EXISTS `structure_shape` (
  `shape_code` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shape_name` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shape_name_en` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`shape_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_standard`)
CREATE TABLE IF NOT EXISTS `structure_standard` (
  `structure_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `internal_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shape_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `series_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `width` decimal(5,1) DEFAULT NULL,
  `height` decimal(5,1) DEFAULT NULL,
  `bridge_width` decimal(5,1) DEFAULT NULL,
  `circumference` decimal(6,1) DEFAULT NULL,
  `base_curve` decimal(8,1) DEFAULT NULL,
  `surface_types` json DEFAULT NULL,
  `refractive_indexes` json DEFAULT NULL,
  `compatibility_score` decimal(3,2) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`structure_id`),
  UNIQUE KEY `uk_external_code` (`external_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_standard_attachment`)
CREATE TABLE IF NOT EXISTS `structure_standard_attachment` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `structure_standard_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `sub_sku`)
CREATE TABLE IF NOT EXISTS `sub_sku` (
  `ssku_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ssku_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ssku_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spec_values` json DEFAULT NULL,
  `image_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `retail_price` decimal(10,2) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ssku_id`),
  UNIQUE KEY `uk_ssku_code` (`ssku_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `sub_sku_category`)
CREATE TABLE IF NOT EXISTS `sub_sku_category` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` int NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `sys_agent_manifest`)
CREATE TABLE IF NOT EXISTS `sys_agent_manifest` (
  `agent_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Agent ID',
  `agent_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Agent编码',
  `agent_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Agent名称',
  `agent_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal' COMMENT '类型(internal/external/mcp_client)',
  `security_clearance` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'L2' COMMENT '安全等级(L1-L4)',
  `capabilities_json` text COLLATE utf8mb4_unicode_ci COMMENT '能力配置JSON',
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联用户ID',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_active_at` datetime DEFAULT NULL COMMENT '最后活跃',
  `stats_json` text COLLATE utf8mb4_unicode_ci COMMENT '统计JSON',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`agent_id`),
  UNIQUE KEY `uk_agent_code` (`agent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent注册声明表';

-- (first-time-only: `sys_audit_log`)
CREATE TABLE IF NOT EXISTS `sys_audit_log` (
  `log_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志ID',
  `actor_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作者类型(human/agent/system)',
  `actor_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作者ID',
  `actor_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作者名称',
  `action_time` datetime(3) NOT NULL COMMENT '操作时间(毫秒精度)',
  `category` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类',
  `action` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作',
  `resource` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标资源',
  `detail` text COLLATE utf8mb4_unicode_ci COMMENT '操作详情JSON',
  `data_domain` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '数据域',
  `sensitivity` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '敏感级别',
  `was_masked` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否脱敏',
  `export_target` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '数据出口目标',
  `source_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源IP',
  `result` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success' COMMENT '操作结果',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_actor` (`actor_type`,`actor_id`),
  KEY `idx_action_time` (`action_time`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全量行为审计日志';

-- (first-time-only: `sys_menu`)
CREATE TABLE IF NOT EXISTS `sys_menu` (
  `menu_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单ID',
  `menu_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单编码',
  `menu_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单名称',
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父级ID',
  `menu_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'menu' COMMENT '菜单类型',
  `path` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '路由路径',
  `icon` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `permission_code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联权限编码',
  `is_visible` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否可见',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`menu_id`),
  UNIQUE KEY `uk_menu_code` (`menu_code`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统菜单';

-- (first-time-only: `sys_permission`)
CREATE TABLE IF NOT EXISTS `sys_permission` (
  `permission_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限ID',
  `permission_code` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限编码',
  `permission_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限名称',
  `resource_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源类型',
  `resource_path` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源路径',
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `parent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父级ID',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_permission_code` (`permission_code`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统权限';

-- (first-time-only: `sys_role`)
CREATE TABLE IF NOT EXISTS `sys_role` (
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色ID',
  `role_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色编码',
  `role_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色';

-- (first-time-only: `sys_role_permission`)
CREATE TABLE IF NOT EXISTS `sys_role_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色ID',
  `permission_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`,`permission_id`),
  KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-权限关联';

-- (first-time-only: `sys_user`)
CREATE TABLE IF NOT EXISTS `sys_user` (
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID(UUID)',
  `username` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `password_hash` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希(bcrypt)',
  `real_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '真实姓名',
  `email` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '电话',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户';

-- (first-time-only: `sys_user_role`)
CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-角色关联';

-- (first-time-only: `system_module_registry`)
CREATE TABLE IF NOT EXISTS `system_module_registry` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0.0.0',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered',
  `dependencies` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `registered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_name` (`module_name`),
  KEY `idx_module_type` (`module_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `vision_prescription`)
CREATE TABLE IF NOT EXISTS `vision_prescription` (
  `prescription_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `od_sphere` decimal(4,2) DEFAULT NULL,
  `od_cylinder` decimal(4,2) DEFAULT NULL,
  `od_axis` int DEFAULT NULL,
  `od_add` decimal(4,2) DEFAULT NULL,
  `os_sphere` decimal(4,2) DEFAULT NULL,
  `os_cylinder` decimal(4,2) DEFAULT NULL,
  `os_axis` int DEFAULT NULL,
  `os_add` decimal(4,2) DEFAULT NULL,
  `pd_value` decimal(4,1) DEFAULT NULL,
  `source_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prescription_date` date DEFAULT NULL,
  `expire_date` date DEFAULT NULL,
  `ocr_confidence` decimal(5,2) DEFAULT NULL,
  `ocr_verified` tinyint(1) NOT NULL DEFAULT '0',
  `prescription_images` json DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`prescription_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_expire` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `wholesale_tier`)
CREATE TABLE IF NOT EXISTS `wholesale_tier` (
  `tier_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier_code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_quantity` int NOT NULL,
  `max_quantity` int DEFAULT NULL,
  `discount_rate` decimal(4,3) NOT NULL,
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_id`),
  UNIQUE KEY `uk_tier_code` (`tier_code`),
  KEY `idx_code` (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

