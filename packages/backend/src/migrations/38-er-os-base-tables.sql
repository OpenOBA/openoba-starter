-- ============================================
-- Migration 38: ER-OS 基座建表
-- ============================================
-- 依据：ER-OS-Agent工作流引擎与任务编排系统-V2.0.md §4
--        ER-OS-ERDL-命名规范与开发标准-V1.0.md §6
--        ER-OS-代码基线深度审计报告-V2.0-DSv4.md 修正版
-- 日期：2026-05-04
-- 作者：唐浩然
-- 修正：Qwen 版 Migration 37 的 5 处遗漏已修正

-- ============================================
-- 1. cognitive_log — 统一认知日志
-- ============================================
-- 所有 Agent 日志的统一入口：
--   agent_task 的 Task Report / Approval 事件
--   erdl_proposal 的 Rule Proposal 事件
--   系统事件 / 错误 / 审计
CREATE TABLE IF NOT EXISTS `cognitive_log` (
  `id`              VARCHAR(36) NOT NULL COMMENT '日志唯一 ID',
  `log_type`        VARCHAR(50) NOT NULL COMMENT 'task_report | approval | rejection | escalation | rule_proposal | event | system',
  `source_module`   VARCHAR(50) NOT NULL COMMENT '来源模块 agent_task | erdl_proposal | system',
  `source_id`       VARCHAR(36) DEFAULT NULL COMMENT '关联的业务记录 ID',
  `level`           VARCHAR(20) NOT NULL DEFAULT 'info' COMMENT 'debug | info | warn | error',
  `title`           VARCHAR(255) DEFAULT NULL COMMENT '日志标题（人类可读）',
  `content`         JSON NOT NULL COMMENT '日志内容（结构化 JSON）',
  `agent_id`        VARCHAR(100) DEFAULT NULL COMMENT '触发 Agent 标识',
  `actor`           VARCHAR(100) DEFAULT NULL COMMENT '操作人（Agent 名称或人类名称）',
  `actor_type`      ENUM('human', 'agent', 'system') DEFAULT 'system',
  `created_at`      BIGINT NOT NULL COMMENT 'Unix 毫秒时间戳',

  PRIMARY KEY (`id`),
  INDEX `idx_log_type` (`log_type`),
  INDEX `idx_source` (`source_module`, `source_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_agent` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='统一认知日志（ER-OS 所有 Agent 事件的唯一日志入口）';

-- ============================================
-- 2. report_target — 汇报对象（决策层级）
-- ============================================
CREATE TABLE IF NOT EXISTS `report_target` (
  `id`              VARCHAR(36) NOT NULL COMMENT '汇报对象唯一 ID',
  `name`            VARCHAR(100) NOT NULL COMMENT '姓名',
  `role`            VARCHAR(100) NOT NULL COMMENT '角色（老板 / 商品负责人 / 运营负责人 / 专员）',
  `level`           ENUM('L0', 'L1', 'L2') NOT NULL COMMENT '决策层级',
  `scope`           JSON DEFAULT NULL COMMENT '管辖范围 ["product","content","service","tech","all"]',
  `parent_id`       VARCHAR(36) DEFAULT NULL COMMENT '上级汇报对象 ID（用于升级链）',
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_level` (`level`),
  INDEX `idx_active` (`is_active`),
  INDEX `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='汇报对象表（ER-OS 决策层级 L0/L1/L2）';

-- 种子数据：初始汇报对象
INSERT INTO `report_target` (`id`, `name`, `role`, `level`, `scope`, `parent_id`) VALUES
  ('rt-l0-henry', 'Henry', '老板', 'L0', '["all"]', NULL),
  ('rt-l1-product', '张经理', '商品负责人', 'L1', '["product"]', 'rt-l0-henry'),
  ('rt-l1-ops', '李经理', '运营负责人', 'L1', '["content","service"]', 'rt-l0-henry');

-- ============================================
-- 3. agent_registry — Agent 注册表（任务编排）
-- ============================================
CREATE TABLE IF NOT EXISTS `agent_registry` (
  `id`                VARCHAR(36) NOT NULL COMMENT 'Agent 唯一 ID',
  `agent_name`        VARCHAR(100) NOT NULL COMMENT 'Agent 名称（如 ProductListingAgent）',
  `agent_type`        VARCHAR(50) NOT NULL COMMENT 'master | image | content | code | data | external',
  `display_name`      VARCHAR(128) DEFAULT NULL COMMENT '中文显示名（UI 展示用）',
  `platform`          VARCHAR(50) DEFAULT NULL COMMENT 'OpenClaw | WorkBuddy | MCP',
  `capabilities`      JSON DEFAULT NULL COMMENT '能力声明 ["product.create","product.update","content.generate"]',
  `default_report_to` VARCHAR(36) DEFAULT NULL COMMENT '默认汇报对象 → report_target.id',
  `allowed_actions`   JSON DEFAULT NULL COMMENT '权限范围 ["create_product","modify_price","publish_content"]',
  `status`            ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
  `created_at`        DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_agent_name` (`agent_name`),
  INDEX `idx_type` (`agent_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_report_to` (`default_report_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Agent 注册表（ER-OS 任务编排用，独立于 sys_agent_manifest 安全审计表）';

-- ============================================
-- 4. agent_task — 任务工作流引擎（9 状态机）
-- ============================================
CREATE TABLE IF NOT EXISTS `agent_task` (
  `id`                VARCHAR(36) NOT NULL COMMENT '任务唯一 ID',
  `task_no`           VARCHAR(50) NOT NULL COMMENT 'TASK-YYYYMMDD-NNN',
  `title`             VARCHAR(200) NOT NULL COMMENT '任务标题',
  `type`              VARCHAR(50) NOT NULL COMMENT 'product_listing | content_creation | customer_service | tech_support',

  -- 汇报链
  `created_by`        VARCHAR(36) NOT NULL COMMENT '任务创建者',
  `report_to`         VARCHAR(36) NOT NULL COMMENT '当前审批人 → report_target.id',
  `escalate_to`       VARCHAR(36) DEFAULT NULL COMMENT '升级审批人 → report_target.id',
  `escalation_hours`  INT NOT NULL DEFAULT 48 COMMENT '超时升级小时数',

  -- 工作流
  `status`            ENUM('drafted', 'proposed', 'revised', 'executing', 'delivered', 'published', 'completed', 'cancelled', 'escalated') NOT NULL DEFAULT 'drafted',
  `current_phase`     INT NOT NULL DEFAULT 0 COMMENT '当前阶段编号',
  `total_phases`      INT NOT NULL DEFAULT 0 COMMENT '总阶段数',
  `report_frequency`  ENUM('every_step', 'per_phase', 'daily_digest', 'on_exception') NOT NULL DEFAULT 'every_step' COMMENT '汇报频率',

  -- 内容
  `context`           JSON DEFAULT NULL COMMENT '任务上下文（老板原始指令、规格书引用等）',
  `proposals`         JSON DEFAULT NULL COMMENT '方案历史 [{version, content, timestamp, status}]',
  `deliverables`      JSON DEFAULT NULL COMMENT '交付物清单 [{type, url, status}]',

  -- Agent
  `agent_id`          VARCHAR(100) DEFAULT NULL COMMENT '执行的 Agent 标识',
  `retry_count`       INT NOT NULL DEFAULT 0 COMMENT '自动重试次数（max 3）',
  `max_retries`       INT NOT NULL DEFAULT 3 COMMENT '最大重试次数',

  `created_at`        DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_task_no` (`task_no`),
  INDEX `idx_status` (`status`),
  INDEX `idx_report_to` (`report_to`),
  INDEX `idx_type` (`type`),
  INDEX `idx_agent` (`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Agent 任务工作流引擎（ER-OS 核心表，9 状态状态机，支持汇报链+升级+重试）';

-- ============================================
-- 5. publish_package — 多平台发布包
-- ============================================
CREATE TABLE IF NOT EXISTS `publish_package` (
  `id`              VARCHAR(36) NOT NULL COMMENT '发布包唯一 ID',
  `task_id`         VARCHAR(36) DEFAULT NULL COMMENT '关联 ER-OS 任务 ID → agent_task.id',
  `package_no`      VARCHAR(50) NOT NULL COMMENT 'PKG-YYYYMMDD-NNN',
  `title`           VARCHAR(200) NOT NULL COMMENT '发布包标题',
  `product_ids`     JSON DEFAULT NULL COMMENT '关联的 SPU/SKU ID 列表',
  `platforms`       JSON DEFAULT NULL COMMENT '多平台发布材料 [{platform, title, content, tags, images, status}]',
  `status`          ENUM('draft', 'ready', 'partial_published', 'published') NOT NULL DEFAULT 'draft',
  `created_at`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_package_no` (`package_no`),
  INDEX `idx_task` (`task_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='多平台发布包（ER-OS 发布材料管理，支持小红书/淘宝/京东等多平台）';

-- ============================================
-- 6. system_module_registry — 模块注册表
-- ============================================
CREATE TABLE IF NOT EXISTS `system_module_registry` (
  `id`              VARCHAR(36) NOT NULL COMMENT '模块唯一 ID',
  `module_name`     VARCHAR(100) NOT NULL COMMENT '模块名称',
  `module_type`     VARCHAR(50) NOT NULL COMMENT 'engine | agent | api | knowledge | skill | platform | business',
  `version`         VARCHAR(20) NOT NULL DEFAULT '0.0.0' COMMENT 'SemVer 版本号',
  `status`          ENUM('registered', 'active', 'inactive', 'error') NOT NULL DEFAULT 'registered',
  `dependencies`    JSON DEFAULT NULL COMMENT '依赖模块列表',
  `metadata`        JSON DEFAULT NULL COMMENT '模块元数据',
  `registered_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_module_name` (`module_name`),
  INDEX `idx_type` (`module_type`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='系统模块注册表（AI-BOS Phase 0 桩，后续 MCPCapable 的基础）';

-- 种子数据：注册所有现有业务模块
INSERT INTO `system_module_registry` (`id`, `module_name`, `module_type`, `version`, `status`, `metadata`) VALUES
  ('mod-auth', 'auth', 'business', '1.0.0', 'active', '{"description": "管理员认证登录"}'),
  ('mod-system', 'system', 'business', '1.0.0', 'active', '{"description": "用户/角色/权限/菜单/Agent管理"}'),
  ('mod-structure', 'structure', 'business', '1.0.0', 'active', '{"description": "结构标准库（镜片标准）"}'),
  ('mod-product', 'product', 'business', '1.0.0', 'active', '{"description": "商品管理 SPU/SKU"}'),
  ('mod-sub-sku', 'sub-sku', 'business', '1.0.0', 'active', '{"description": "副品管理（镜片/配件/服务）"}'),
  ('mod-category', 'category', 'business', '1.0.0', 'active', '{"description": "商品分类管理"}'),
  ('mod-color', 'color', 'business', '1.0.0', 'active', '{"description": "色彩标准库"}'),
  ('mod-inventory', 'inventory', 'business', '1.0.0', 'active', '{"description": "库存管理+订单联动"}'),
  ('mod-order', 'order', 'business', '1.0.0', 'active', '{"description": "订单管理+履约"}'),
  ('mod-after-sales', 'after-sales', 'business', '1.0.0', 'active', '{"description": "售后/退款模块"}'),
  ('mod-customer', 'customer', 'business', '1.0.0', 'active', '{"description": "客户管理+消费档案"}'),
  ('mod-customer-auth', 'customer-auth', 'business', '1.0.0', 'active', '{"description": "客户官网认证"}'),
  ('mod-review', 'review', 'business', '1.0.0', 'active', '{"description": "商品评价管理"}'),
  ('mod-aesthetics', 'aesthetics', 'engine', '1.0.0', 'active', '{"description": "美学校验引擎"}'),
  ('mod-draft-pool', 'draft-pool', 'business', '1.0.0', 'active', '{"description": "草稿池+AI生成商品"}'),
  ('mod-dictionary', 'dictionary', 'business', '1.0.0', 'active', '{"description": "通用字典服务"}'),
  ('mod-erdl', 'erdl', 'engine', '1.0.0', 'active', '{"description": "ERDL 规则引擎+议会协议"}'),
  ('mod-schema', 'schema', 'engine', '1.0.0', 'active', '{"description": "行业 Schema 注册表"}'),
  ('mod-sms', 'sms', 'business', '1.0.0', 'active', '{"description": "短信验证码服务"}'),
  ('mod-upload', 'upload', 'business', '1.0.0', 'active', '{"description": "文件上传服务"}'),
  ('mod-website', 'website', 'business', '1.0.0', 'active', '{"description": "客户官网 API"}');
