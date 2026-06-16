-- ⚠️  此文件由 Entity Schema Diff 逐表重建
--    基准：所有 Entity .ts 文件 + Core Entity 定义
--    日期：2026-06-11 · Phase 0 地基修复
--    旧文件：init-structure.sql.bak-20260611
--    使用 CREATE TABLE IF NOT EXISTS 防止数据丢失

-- OpenOBA Starter init-structure.sql · Rebuilt from Entity baseline
-- 逐表生成，每表一个区块

CREATE TABLE IF NOT EXISTS `advisory_report` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `report_name` varchar(200) NOT NULL COMMENT '报告名称',
  `report_type` varchar(30) NOT NULL COMMENT '报告类型：color_trend|shape_trend|market_analysis|product_audit',
  `query_context` text COMMENT '查询上下文JSON',
  `summary` text COMMENT '摘要',
  `recommendations` json DEFAULT NULL COMMENT '推荐建议JSON',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending|generating|completed|failed',
  `error_info` text COMMENT '错误信息',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='咨询报告';

CREATE TABLE IF NOT EXISTS `aesthetic_compat_matrices` (
  `matrix_id` char(36) NOT NULL COMMENT 'UUID主键',
  `matrix_type` varchar(32) NOT NULL COMMENT '矩阵类型',
  `dim_a` varchar(32) NOT NULL COMMENT '维度A',
  `dim_b` varchar(32) NOT NULL COMMENT '维度B',
  `compatibility` varchar(16) NOT NULL COMMENT '兼容性',
  `reason` text COMMENT '原因',
  `weight` decimal(5,2) NOT NULL DEFAULT 1.00 COMMENT '权重',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`matrix_id`),
  INDEX `idx_matrix_type` (`matrix_type`),
  INDEX `idx_dim_a` (`dim_a`),
  INDEX `idx_dim_b` (`dim_b`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='美学兼容矩阵';

CREATE TABLE IF NOT EXISTS `aesthetic_feedback` (
  `feedback_id` char(36) NOT NULL COMMENT 'UUID主键',
  `rule_code` varchar(32) NOT NULL COMMENT '规则编码',
  `action` varchar(16) DEFAULT NULL COMMENT '动作',
  `sku_context` json DEFAULT NULL COMMENT 'SKU上下文',
  `spu_context` json DEFAULT NULL COMMENT 'SPU上下文',
  `operator_note` text COMMENT '操作备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  INDEX `idx_rule_code` (`rule_code`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='美学反馈';

CREATE TABLE IF NOT EXISTS `aesthetic_rules` (
  `rule_id` char(36) NOT NULL COMMENT 'UUID主键',
  `rule_code` varchar(32) NOT NULL COMMENT '规则编码',
  `rule_name` varchar(128) NOT NULL COMMENT '规则名称',
  `rule_type` varchar(16) NOT NULL COMMENT '规则类型',
  `rule_level` varchar(8) NOT NULL COMMENT '规则级别',
  `description` text COMMENT '描述',
  `config` json DEFAULT NULL COMMENT '配置JSON',
  `weight` decimal(5,2) NOT NULL DEFAULT 1.00 COMMENT '权重',
  `status` varchar(16) NOT NULL DEFAULT 'active' COMMENT '状态',
  `version` varchar(16) NOT NULL DEFAULT '1.0.0' COMMENT '版本号',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  UNIQUE KEY `uk_rule_code` (`rule_code`),
  INDEX `idx_rule_level` (`rule_level`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='美学规则';

CREATE TABLE IF NOT EXISTS `after_sales` (
  `id` char(36) NOT NULL COMMENT 'UUID主键',
  `after_sales_no` varchar(36) NOT NULL COMMENT '售后单号',
  `order_id` varchar(36) NOT NULL COMMENT '关联订单ID',
  `order_no` varchar(36) DEFAULT NULL COMMENT '订单号',
  `customer_id` varchar(36) DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户姓名',
  `after_sales_type` enum('return','exchange','refund_only','repair') NOT NULL COMMENT '售后类型',
  `reason_type` enum('quality','wrong_item','not_as_described','changed_mind','other') NOT NULL DEFAULT 'other' COMMENT '原因类型',
  `reason_detail` text COMMENT '详细原因描述',
  `evidence_urls` json DEFAULT NULL COMMENT '凭证图片URL列表',
  `refund_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '退款金额',
  `actual_refund_amount` decimal(10,2) DEFAULT NULL COMMENT '实际退款金额',
  `return_tracking_no` varchar(64) DEFAULT NULL COMMENT '退货物流单号',
  `return_carrier` varchar(64) DEFAULT NULL COMMENT '退货物流公司',
  `resend_tracking_no` varchar(64) DEFAULT NULL COMMENT '重发物流单号',
  `resend_carrier` varchar(64) DEFAULT NULL COMMENT '重发物流公司',
  `status` enum('pending','approved','rejected','returning','received','refunded','completed','closed') NOT NULL DEFAULT 'pending' COMMENT '售后状态',
  `items` json DEFAULT NULL COMMENT '商品明细JSON',
  `reviewer_id` varchar(36) DEFAULT NULL COMMENT '审核人ID',
  `review_note` text COMMENT '审核备注',
  `reviewed_at` datetime DEFAULT NULL COMMENT '审核时间',
  `refund_method` enum('original','balance','bank_transfer') DEFAULT NULL COMMENT '退款方式',
  `refunded_at` datetime DEFAULT NULL COMMENT '退款到账时间',
  `applicant_type` enum('customer','admin') NOT NULL DEFAULT 'customer' COMMENT '申请人类型',
  `applicant_id` varchar(36) DEFAULT NULL COMMENT '申请人ID',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_after_sales_no` (`after_sales_no`),
  INDEX `idx_after_sales_order` (`order_id`),
  INDEX `idx_after_sales_customer` (`customer_id`),
  INDEX `idx_after_sales_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后工单';

CREATE TABLE IF NOT EXISTS `after_sales_log` (
  `id` char(36) NOT NULL COMMENT 'UUID主键',
  `after_sales_id` varchar(36) NOT NULL COMMENT '售后单ID',
  `action` varchar(50) NOT NULL COMMENT '操作动作',
  `from_status` varchar(30) DEFAULT NULL COMMENT '变更前状态',
  `to_status` varchar(30) DEFAULT NULL COMMENT '变更后状态',
  `operator_id` varchar(36) DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(100) DEFAULT NULL COMMENT '操作人姓名',
  `note` text COMMENT '操作备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_log_after_sales` (`after_sales_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后操作日志';

CREATE TABLE IF NOT EXISTS `color_design_project` (
  `project_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `project_code` varchar(32) NOT NULL COMMENT '项目编码',
  `project_name` varchar(128) NOT NULL COMMENT '项目名称',
  `description` text COMMENT '描述',
  `palette_id` varchar(36) DEFAULT NULL COMMENT '色盘ID',
  `target_season` varchar(16) DEFAULT NULL COMMENT '目标季节',
  `target_launch_date` date DEFAULT NULL COMMENT '目标上市日期',
  `status` varchar(16) NOT NULL DEFAULT 'draft' COMMENT '状态',
  `priority` varchar(8) NOT NULL DEFAULT 'normal' COMMENT '优先级',
  `assigned_to` varchar(64) DEFAULT NULL COMMENT '负责人',
  `ai_evaluation_score` decimal(3,1) DEFAULT NULL COMMENT 'AI评估分数',
  `ai_evaluation_notes` text COMMENT 'AI评估备注',
  `sales_forecast` int DEFAULT NULL COMMENT '销量预测',
  `forecast_confidence` decimal(3,1) DEFAULT NULL COMMENT '预测置信度',
  `created_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  `approved_by` varchar(36) DEFAULT NULL COMMENT '审批人',
  `approved_at` datetime DEFAULT NULL COMMENT '审批时间',
  `notes` text COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`),
  UNIQUE KEY `uk_project_code` (`project_code`),
  INDEX `idx_status` (`status`),
  INDEX `idx_target_season` (`target_season`),
  INDEX `idx_palette_id` (`palette_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='色彩设计项目';

CREATE TABLE IF NOT EXISTS `color_material_mapping` (
  `mapping_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `material_code` varchar(16) NOT NULL COMMENT '材质编码',
  `color_code` varchar(32) NOT NULL COMMENT '颜色编码',
  `feasibility` varchar(16) NOT NULL DEFAULT 'feasible' COMMENT '可行性',
  `craft_process` varchar(64) DEFAULT NULL COMMENT '工艺说明',
  `notes` varchar(512) DEFAULT NULL COMMENT '备注',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mapping_id`),
  UNIQUE KEY `uk_material_color` (`material_code`, `color_code`),
  INDEX `idx_material_code` (`material_code`),
  INDEX `idx_color_code` (`color_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='色彩材质映射';

CREATE TABLE IF NOT EXISTS `color_palette_item` (
  `item_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `palette_id` varchar(36) NOT NULL COMMENT '色盘ID',
  `color_code` varchar(32) NOT NULL COMMENT '颜色编码',
  `role_in_palette` varchar(32) NOT NULL DEFAULT 'primary' COMMENT '色盘中角色',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `notes` varchar(256) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  INDEX `idx_palette_id` (`palette_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='色盘色项';

CREATE TABLE IF NOT EXISTS `color_project_color` (
  `project_color_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `project_id` varchar(36) NOT NULL COMMENT '项目ID',
  `color_code` varchar(32) NOT NULL COMMENT '颜色编码',
  `material_code` varchar(16) DEFAULT NULL COMMENT '材质编码',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否主色',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `notes` varchar(256) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_color_id`),
  INDEX `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目颜色关联';

CREATE TABLE IF NOT EXISTS `color_seasonal_palette` (
  `palette_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `season` varchar(16) NOT NULL COMMENT '季节',
  `palette_name` varchar(64) NOT NULL COMMENT '色盘名称',
  `theme` varchar(128) DEFAULT NULL COMMENT '主题',
  `target_audience` varchar(64) DEFAULT NULL COMMENT '目标人群',
  `scenario` varchar(64) DEFAULT NULL COMMENT '适用场景',
  `trend_source` varchar(256) DEFAULT NULL COMMENT '趋势来源',
  `status` varchar(16) NOT NULL DEFAULT 'draft' COMMENT '状态',
  `created_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  `notes` varchar(512) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`palette_id`),
  INDEX `idx_season` (`season`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='季节色盘';

CREATE TABLE IF NOT EXISTS `customer` (
  `customer_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_code` varchar(32) NOT NULL COMMENT '系统编号 MJ-CUS-000001',
  `customer_type` varchar(32) DEFAULT NULL COMMENT 'retail/business/partner',
  `customer_level` varchar(32) DEFAULT 'normal' COMMENT 'normal/vip/svip/gold',
  `company_name` varchar(256) DEFAULT NULL COMMENT '企业名称',
  `contact_name` varchar(128) NOT NULL COMMENT '联系人姓名',
  `phone` varchar(32) NOT NULL COMMENT '联系电话',
  `email` varchar(128) DEFAULT NULL COMMENT '电子邮箱',
  `wechat` varchar(128) DEFAULT NULL COMMENT '微信号',
  `nickname` varchar(128) DEFAULT NULL COMMENT '昵称',
  `avatar_url` varchar(512) DEFAULT NULL COMMENT '头像URL',
  `address` varchar(512) DEFAULT NULL COMMENT '默认地址',
  `city` varchar(64) DEFAULT NULL COMMENT '城市',
  `province` varchar(64) DEFAULT NULL COMMENT '省份',
  `subscription_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '订阅状态 none/active/expired',
  `wholesale_tier` varchar(16) DEFAULT NULL COMMENT '批发阶梯 A/B/C',
  `member_discount_rate` decimal(3,2) NOT NULL DEFAULT 1.00 COMMENT '会员折扣率',
  `points_balance` int NOT NULL DEFAULT 0 COMMENT '积分余额',
  `member_valid_until` datetime DEFAULT NULL COMMENT '会员有效期至',
  `member_since` datetime DEFAULT NULL COMMENT '成为会员时间',
  `last_active_at` datetime DEFAULT NULL COMMENT '最后活跃时间',
  `points_earned` int NOT NULL DEFAULT 0 COMMENT '累计获得积分',
  `points_used` int NOT NULL DEFAULT 0 COMMENT '已消耗积分',
  `partner_services` json DEFAULT NULL COMMENT '合作伙伴服务',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  `referral_source` varchar(32) DEFAULT NULL COMMENT '来源渠道',
  `preferred_style` varchar(64) DEFAULT NULL COMMENT '偏好风格',
  `wechat_id` varchar(128) DEFAULT NULL COMMENT '微信号',
  `password_hash` varchar(256) DEFAULT NULL COMMENT '官网登录密码 bcrypt',
  `account_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '官网账户状态',
  `registered_at` timestamp NULL DEFAULT NULL COMMENT '注册时间',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `password_reset_token` varchar(128) DEFAULT NULL COMMENT '密码重置Token',
  `password_reset_expires` timestamp NULL DEFAULT NULL COMMENT 'Token过期时间',
  `notes` text COMMENT '备注',
  `attributes` json DEFAULT NULL COMMENT '扩展属性',
  `total_orders` int NOT NULL DEFAULT 0 COMMENT '累计订单数',
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '累计消费金额',
  `last_order_at` timestamp NULL DEFAULT NULL COMMENT '最后下单时间',
  `last_contact_at` timestamp NULL DEFAULT NULL COMMENT '最后联系时间',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `uk_customer_code` (`customer_code`),
  INDEX `idx_type` (`customer_type`),
  INDEX `idx_level` (`customer_level`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户';

CREATE TABLE IF NOT EXISTS `customer_address` (
  `address_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `province` varchar(128) NOT NULL COMMENT '省份',
  `city` varchar(128) NOT NULL COMMENT '城市',
  `district` varchar(128) DEFAULT NULL COMMENT '区县',
  `detail_address` varchar(512) NOT NULL COMMENT '详细地址',
  `receiver_name` varchar(128) NOT NULL COMMENT '收货人',
  `receiver_phone` varchar(32) NOT NULL COMMENT '收货人电话',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否默认地址',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户地址';

CREATE TABLE IF NOT EXISTS `customer_consumption_profile` (
  `consumption_profile_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_lens_id` varchar(36) NOT NULL COMMENT '关联镜片档案ID',
  `product_sku_code` varchar(128) DEFAULT NULL COMMENT '关联商品SKU编码',
  `product_name` varchar(256) DEFAULT NULL COMMENT '镜框名称快照',
  `purchase_date` date DEFAULT NULL COMMENT '购买日期',
  `order_id` varchar(36) DEFAULT NULL COMMENT '来源订单ID',
  `use_status` varchar(32) NOT NULL DEFAULT 'active' COMMENT 'active/standby/disabled',
  `use_frequency` varchar(32) DEFAULT NULL COMMENT 'high/medium/low',
  `scene_tags` json DEFAULT NULL COMMENT '场景标签',
  `attributes` json DEFAULT NULL COMMENT '扩展属性',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`consumption_profile_id`),
  INDEX `idx_customer_lens` (`customer_lens_id`),
  INDEX `idx_use_status` (`use_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户消费画像';

CREATE TABLE IF NOT EXISTS `customer_contact` (
  `contact_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `contact_name` varchar(128) NOT NULL COMMENT '联系人姓名',
  `phone` varchar(32) DEFAULT NULL COMMENT '联系电话',
  `email` varchar(128) DEFAULT NULL COMMENT '电子邮箱',
  `wechat` varchar(128) DEFAULT NULL COMMENT '微信号',
  `role` varchar(64) DEFAULT NULL COMMENT '角色',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否主要联系人',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`contact_id`),
  INDEX `idx_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户联系人';

CREATE TABLE IF NOT EXISTS `customer_lens` (
  `customer_lens_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `structure_standard_code` varchar(64) NOT NULL COMMENT '结构标准锚点',
  `prescription_id` varchar(36) DEFAULT NULL COMMENT '关联处方ID',
  `purchase_date` date DEFAULT NULL COMMENT '购买日期',
  `order_id` varchar(36) DEFAULT NULL COMMENT '来源订单ID',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT 'active/discontinued',
  `attributes` json DEFAULT NULL COMMENT '扩展属性',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_lens_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_structure_standard` (`structure_standard_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户镜片档案';

CREATE TABLE IF NOT EXISTS `customer_login_log` (
  `log_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `phone` varchar(32) NOT NULL COMMENT '手机号',
  `login_method` varchar(32) NOT NULL DEFAULT 'sms' COMMENT '登录方式',
  `login_result` varchar(16) NOT NULL DEFAULT 'success' COMMENT 'success/fail',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(512) DEFAULT NULL COMMENT '用户代理',
  `device_id` varchar(128) DEFAULT NULL COMMENT '设备ID',
  `fail_reason` varchar(128) DEFAULT NULL COMMENT '失败原因',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户登录日志';

CREATE TABLE IF NOT EXISTS `customer_tier_pricing` (
  `pricing_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '关联客户',
  `tier` varchar(16) NOT NULL COMMENT '档位 A/B/C',
  `product_sku_id` varchar(36) DEFAULT NULL COMMENT '商品SKU',
  `discount_rate` decimal(4,3) DEFAULT NULL COMMENT '折扣率',
  `min_quantity` int NOT NULL DEFAULT 1 COMMENT '最低起订量',
  `max_quantity` int DEFAULT NULL COMMENT '最高数量',
  `effective_from` date DEFAULT NULL COMMENT '生效起始日期',
  `effective_to` date DEFAULT NULL COMMENT '生效结束日期',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `pricing_mode` varchar(16) NOT NULL DEFAULT 'discount' COMMENT 'discount/fixed',
  `fixed_price` decimal(10,2) DEFAULT NULL COMMENT '固定协议价',
  `agreement_no` varchar(64) DEFAULT NULL COMMENT '协议编号',
  `agreement_start` date DEFAULT NULL COMMENT '协议生效日',
  `agreement_end` date DEFAULT NULL COMMENT '协议到期日',
  `sales_rep` varchar(64) DEFAULT NULL COMMENT '负责销售',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pricing_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_tier` (`tier`),
  INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户阶梯定价';

CREATE TABLE IF NOT EXISTS `dict_effect_tag` (
  `effect_code` varchar(32) NOT NULL COMMENT '效果编码',
  `effect_type` varchar(16) NOT NULL COMMENT '效果类型',
  `effect_name` varchar(32) NOT NULL COMMENT '效果名称',
  `target_value` varchar(32) NOT NULL COMMENT '目标值',
  `recommended_colors` json DEFAULT NULL COMMENT '推荐颜色JSON',
  `description` text COMMENT '描述',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  PRIMARY KEY (`effect_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='效果标签字典';

CREATE TABLE IF NOT EXISTS `dict_frame_material` (
  `material_code` varchar(32) NOT NULL COMMENT '材质编码',
  `material_name` varchar(50) NOT NULL COMMENT '材质名称',
  `material_en` varchar(50) DEFAULT NULL COMMENT '材质英文名',
  `material_category` varchar(20) DEFAULT NULL COMMENT '材质分类',
  `description` text COMMENT '描述',
  `is_active` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='框架材质字典';

CREATE TABLE IF NOT EXISTS `dict_frame_type` (
  `type_code` varchar(20) NOT NULL COMMENT '类型编码',
  `type_name` varchar(50) NOT NULL COMMENT '类型名称',
  `type_en` varchar(50) DEFAULT NULL COMMENT '类型英文名',
  `description` text COMMENT '描述',
  `is_active` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='框架类型字典';

CREATE TABLE IF NOT EXISTS `dict_hinge` (
  `hinge_code` varchar(32) NOT NULL COMMENT '铰链编码',
  `hinge_name` varchar(50) NOT NULL COMMENT '铰链名称',
  `hinge_en` varchar(50) DEFAULT NULL COMMENT '铰链英文名',
  `features` json DEFAULT NULL COMMENT '特性列表',
  `description` text COMMENT '描述',
  `is_active` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hinge_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='铰链字典';

CREATE TABLE IF NOT EXISTS `dict_nose_pad` (
  `pad_code` varchar(32) NOT NULL COMMENT '鼻托编码',
  `pad_name` varchar(50) NOT NULL COMMENT '鼻托名称',
  `pad_en` varchar(50) DEFAULT NULL COMMENT '鼻托英文名',
  `is_adjustable` tinyint NOT NULL DEFAULT 0 COMMENT '是否可调',
  `description` text COMMENT '描述',
  `is_active` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pad_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鼻托字典';

CREATE TABLE IF NOT EXISTS `dict_sku_color` (
  `color_id` char(36) NOT NULL COMMENT 'UUID主键',
  `color_code` varchar(64) NOT NULL COMMENT '颜色编码',
  `color_name` varchar(128) NOT NULL COMMENT '颜色名称',
  `color_name_en` varchar(128) DEFAULT NULL COMMENT '颜色英文名',
  `pinyin_name` varchar(128) DEFAULT NULL COMMENT '拼音',
  `pinyin_initial` varchar(16) DEFAULT NULL COMMENT '拼音首字母',
  `color_family` varchar(32) DEFAULT NULL COMMENT '色系',
  `color_type` varchar(32) NOT NULL DEFAULT 'solid' COMMENT '颜色类型',
  `hex_value` varchar(32) DEFAULT NULL COMMENT '十六进制色值',
  `pantone_ref` varchar(32) DEFAULT NULL COMMENT 'Pantone色卡',
  `preview_image` varchar(512) DEFAULT NULL COMMENT '预览图',
  `description` text COMMENT '描述',
  `trend_score` int NOT NULL DEFAULT 50 COMMENT '趋势分',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`color_id`),
  UNIQUE KEY `uk_color_code` (`color_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SKU颜色字典';

CREATE TABLE IF NOT EXISTS `dict_surface_treatment` (
  `treatment_code` varchar(32) NOT NULL COMMENT '处理编码',
  `treatment_name` varchar(50) NOT NULL COMMENT '处理名称',
  `treatment_en` varchar(50) DEFAULT NULL COMMENT '处理英文名',
  `description` text COMMENT '描述',
  `is_active` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序序号',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`treatment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表面处理字典';

CREATE TABLE IF NOT EXISTS `draft` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `draft_no` varchar(20) NOT NULL COMMENT '草稿编号',
  `title` varchar(200) DEFAULT NULL COMMENT '标题',
  `draft_type` varchar(30) DEFAULT NULL COMMENT '草稿类型 spu/content/report/note/mixed',
  `status` varchar(20) NOT NULL DEFAULT 'editing' COMMENT 'editing/ready/published/archived',
  `body_text` text COMMENT '正文内容',
  `body_json` json DEFAULT NULL COMMENT '结构化内容',
  `attachments` json DEFAULT NULL COMMENT '附件列表',
  `blocks` json DEFAULT NULL COMMENT 'Block内容 V2',
  `delivery_channel` varchar(20) NOT NULL DEFAULT 'system' COMMENT '交付渠道',
  `local_base_path` varchar(500) DEFAULT NULL COMMENT '本地文件路径',
  `tags` json DEFAULT NULL COMMENT '标签列表',
  `source_task_id` varchar(36) DEFAULT NULL COMMENT '来源Task',
  `source_session_id` varchar(36) DEFAULT NULL COMMENT '来源会话',
  `source_agent` varchar(50) DEFAULT NULL COMMENT '来源Agent',
  `source_model` varchar(50) DEFAULT NULL COMMENT '来源模型',
  `source_prompt` text COMMENT '来源Prompt',
  `publish_action` json DEFAULT NULL COMMENT '发布动作记录',
  `publish_snapshot` text COMMENT '发布快照',
  `published_at` timestamp NULL DEFAULT NULL COMMENT '发布时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_draft_no` (`draft_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通用草稿池';

CREATE TABLE IF NOT EXISTS `draft_batch` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `batch_name` varchar(200) NOT NULL COMMENT '批次名称',
  `generation_type` varchar(20) NOT NULL COMMENT 'ai/manual',
  `total_count` int NOT NULL DEFAULT 0 COMMENT '总数',
  `approved_count` int NOT NULL DEFAULT 0 COMMENT '已通过',
  `rejected_count` int NOT NULL DEFAULT 0 COMMENT '已驳回',
  `published_count` int NOT NULL DEFAULT 0 COMMENT '已发布',
  `status` varchar(20) NOT NULL DEFAULT 'generating' COMMENT 'generating/completed/cancelled',
  `prompt_context` text COMMENT 'Prompt上下文',
  `error_info` text COMMENT '错误信息',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='草稿批次';

CREATE TABLE IF NOT EXISTS `draft_publish_batch` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `package_name` varchar(200) NOT NULL COMMENT '发布包名称',
  `draft_count` int NOT NULL DEFAULT 0 COMMENT '草稿数量',
  `sku_count` int NOT NULL DEFAULT 0 COMMENT 'SKU数量',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/completed/failed',
  `published_by` varchar(50) DEFAULT NULL COMMENT '发布人',
  `published_at` datetime DEFAULT NULL COMMENT '发布时间',
  `error_info` text COMMENT '错误信息',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='草稿发布批次';

CREATE TABLE IF NOT EXISTS `draft_sku` (
  `draft_sku_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `draft_id` varchar(36) NOT NULL COMMENT '关联草稿ID',
  `color_code` varchar(20) NOT NULL COMMENT '颜色编码',
  `color_name` varchar(100) DEFAULT NULL COMMENT '颜色名称',
  `skin_tone_effect` varchar(50) DEFAULT NULL COMMENT '肤色效果',
  `face_shape_effect` varchar(50) DEFAULT NULL COMMENT '脸型效果',
  `display_name` varchar(500) DEFAULT NULL COMMENT '展示名称',
  `sku_status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/approved/rejected/published',
  `aesthetic_score` decimal(5,2) DEFAULT NULL COMMENT '美学评分',
  `aesthetic_level` varchar(10) DEFAULT NULL COMMENT 'pass/warn/block',
  `review_notes` text COMMENT '审核备注',
  `rejected_reason` text COMMENT '驳回原因',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `published_sku_id` varchar(36) DEFAULT NULL COMMENT '已发布SKU ID',
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`draft_sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='草稿SKU';

CREATE TABLE IF NOT EXISTS `draft_task` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `task_type` varchar(30) NOT NULL COMMENT 'draft_generation/aesthetics_check/advisory_report/publish',
  `reference_id` varchar(36) DEFAULT NULL COMMENT '关联引用ID',
  `input_context` json DEFAULT NULL COMMENT '输入上下文',
  `output_result` json DEFAULT NULL COMMENT '输出结果',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/completed/failed',
  `progress` int NOT NULL DEFAULT 0 COMMENT '进度%',
  `error_info` text COMMENT '错误信息',
  `retry_count` int NOT NULL DEFAULT 0 COMMENT '重试次数',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='草稿任务';

CREATE TABLE IF NOT EXISTS `external_barcode_mapping` (
  `mapping_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `sku_id` varchar(36) DEFAULT NULL COMMENT '关联产品SKU',
  `external_barcode` varchar(64) NOT NULL COMMENT '外部条码',
  `external_brand` varchar(64) DEFAULT NULL COMMENT '外部品牌',
  `external_product` varchar(256) DEFAULT NULL COMMENT '外部商品名',
  `structure_standard_code` varchar(64) DEFAULT NULL COMMENT '关联结构标准',
  `inventory_sku_id` varchar(36) DEFAULT NULL COMMENT '关联库存SKU',
  `unit_cost` decimal(10,2) DEFAULT NULL COMMENT '成本单价',
  `source` varchar(32) DEFAULT NULL COMMENT '来源',
  `status` varchar(16) NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mapping_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外部条码映射';

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` char(36) NOT NULL COMMENT 'UUID主键',
  `sku_id` varchar(36) NOT NULL COMMENT '关联SKU ID',
  `sku_code` varchar(128) NOT NULL COMMENT 'SKU编码',
  `structure_standard_code` varchar(64) DEFAULT NULL COMMENT '结构标准编码',
  `warehouse_code` varchar(32) NOT NULL DEFAULT 'WH-MAIN' COMMENT '仓库编码',
  `current_quantity` int NOT NULL DEFAULT 0 COMMENT '当前数量',
  `available_quantity` int NOT NULL DEFAULT 0 COMMENT '可用数量',
  `locked_quantity` int NOT NULL DEFAULT 0 COMMENT '锁定数量',
  `warning_quantity` int NOT NULL DEFAULT 10 COMMENT '预警数量',
  `last_stock_check_at` datetime DEFAULT NULL COMMENT '最后盘点时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_warehouse` (`sku_id`, `warehouse_code`),
  INDEX `idx_available` (`available_quantity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存';

CREATE TABLE IF NOT EXISTS `inventory_document` (
  `id` char(36) NOT NULL COMMENT 'UUID主键',
  `doc_no` varchar(64) NOT NULL COMMENT '单据编号',
  `doc_type` enum('stock_in','stock_out','transfer','adjustment') NOT NULL COMMENT '单据类型',
  `items` json NOT NULL COMMENT '商品明细',
  `total_quantity` int NOT NULL DEFAULT 0 COMMENT '总数量',
  `source` enum('agent','manual','platform','ocr') NOT NULL DEFAULT 'agent' COMMENT '来源',
  `source_ref` varchar(256) DEFAULT NULL COMMENT '来源单据号',
  `status` enum('draft','pending','confirmed','executed','rejected') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `confirmed_by` varchar(100) DEFAULT NULL COMMENT '确认人',
  `remark` text COMMENT '备注',
  `executed_at` datetime DEFAULT NULL COMMENT '执行时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_no` (`doc_no`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存单据';

CREATE TABLE IF NOT EXISTS `inventory_transaction` (
  `id` char(36) NOT NULL COMMENT 'UUID主键',
  `sku_id` varchar(36) NOT NULL COMMENT '关联SKU ID',
  `sku_code` varchar(128) NOT NULL COMMENT 'SKU编码',
  `structure_standard_code` varchar(64) DEFAULT NULL COMMENT '结构标准编码',
  `warehouse_code` varchar(32) NOT NULL DEFAULT 'WH-MAIN' COMMENT '仓库编码',
  `transaction_type` varchar(32) NOT NULL COMMENT '交易类型',
  `quantity` int NOT NULL COMMENT '数量',
  `quantity_before` int NOT NULL COMMENT '变更前数量',
  `quantity_after` int NOT NULL COMMENT '变更后数量',
  `reference_type` varchar(32) DEFAULT NULL COMMENT '引用类型',
  `reference_id` varchar(36) DEFAULT NULL COMMENT '引用ID',
  `operator_id` varchar(36) DEFAULT NULL COMMENT '操作人ID',
  `remark` varchar(512) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sku_id` (`sku_id`),
  INDEX `idx_type` (`transaction_type`),
  INDEX `idx_reference` (`reference_type`, `reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存交易流水';

CREATE TABLE IF NOT EXISTS `member_level` (
  `level_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `level_name` varchar(32) NOT NULL COMMENT '等级名称',
  `level_code` varchar(16) NOT NULL COMMENT '等级编码',
  `discount_rate` decimal(4,3) NOT NULL COMMENT '会员折扣率',
  `upgrade_threshold` decimal(10,2) DEFAULT NULL COMMENT '升级门槛',
  `benefits` json DEFAULT NULL COMMENT '权益描述',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员等级';

CREATE TABLE IF NOT EXISTS `member_level_log` (
  `log_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `old_level` varchar(32) NOT NULL COMMENT '旧等级',
  `new_level` varchar(32) NOT NULL COMMENT '新等级',
  `trigger_type` varchar(32) NOT NULL COMMENT 'upgrade/downgrade/manual',
  `trigger_reason` varchar(256) DEFAULT NULL COMMENT '变更原因',
  `order_id` varchar(36) DEFAULT NULL COMMENT '触发订单',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员等级变更日志';

CREATE TABLE IF NOT EXISTS `member_pricing_rule` (
  `rule_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `level_code` varchar(16) NOT NULL COMMENT '等级编码',
  `sku_id` varchar(36) NOT NULL COMMENT 'SKU ID',
  `rule_type` varchar(16) NOT NULL DEFAULT 'discount' COMMENT '规则类型',
  `discount_rate` decimal(4,3) DEFAULT NULL COMMENT '折扣率',
  `fixed_price` decimal(10,2) DEFAULT NULL COMMENT '固定价',
  `extra_discount` decimal(4,3) DEFAULT NULL COMMENT '额外折扣',
  `priority` int NOT NULL DEFAULT 0 COMMENT '优先级',
  `min_quantity` int NOT NULL DEFAULT 1 COMMENT '起订量',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `start_time` timestamp NULL DEFAULT NULL COMMENT '开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '结束时间',
  `notes` varchar(512) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员定价规则';

CREATE TABLE IF NOT EXISTS `order` (
  `order_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_no` varchar(64) NOT NULL COMMENT '订单号',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `customer_name` varchar(128) NOT NULL COMMENT '客户姓名',
  `customer_phone` varchar(32) DEFAULT NULL COMMENT '客户电话',
  `customer_type` varchar(16) NOT NULL DEFAULT 'retail' COMMENT '客户类型',
  `order_type` varchar(16) NOT NULL DEFAULT 'retail' COMMENT '订单类型',
  `has_prescription` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否有处方',
  `has_processing` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否需要加工',
  `is_wholesale` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否批发订单',
  `structure_standard_code` varchar(64) DEFAULT NULL COMMENT '结构标准锚点',
  `wholesale_tier` varchar(16) DEFAULT NULL COMMENT '批发阶梯档位',
  `status` varchar(32) NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  `payment_method` varchar(32) DEFAULT NULL COMMENT '支付方式',
  `payment_status` varchar(32) NOT NULL DEFAULT 'unpaid' COMMENT '支付状态',
  `payment_status_code` varchar(64) DEFAULT 'unpaid' COMMENT '支付状态码',
  `logistics_status_code` varchar(64) DEFAULT 'unshipped' COMMENT '物流状态码',
  `after_sale_status_code` varchar(64) DEFAULT 'none' COMMENT '售后状态码',
  `review_status_code` varchar(64) DEFAULT 'pending' COMMENT '评价状态码',
  `total_amount` decimal(12,2) NOT NULL COMMENT '总金额',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '运费',
  `actual_amount` decimal(12,2) NOT NULL COMMENT '实付金额',
  `total_retail_price` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '总零售价',
  `total_discount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '总优惠金额',
  `total_cost` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '订单总成本',
  `gross_profit` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '毛利润',
  `gross_margin_pct` decimal(5,2) NOT NULL DEFAULT 0.00 COMMENT '毛利率%',
  `cancel_refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '取消退款金额',
  `after_sale_refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '售后退款金额',
  `prescription_id` varchar(36) DEFAULT NULL COMMENT '关联处方ID',
  `remark` text COMMENT '客户备注',
  `internal_remark` text COMMENT '内部备注',
  `source` varchar(32) NOT NULL DEFAULT 'manual' COMMENT '订单来源',
  `created_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  `received_at` timestamp NULL DEFAULT NULL COMMENT '签收时间',
  `review_deadline` timestamp NULL DEFAULT NULL COMMENT '评价截止',
  `attributes` json DEFAULT NULL COMMENT '扩展属性',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `uk_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单';

CREATE TABLE IF NOT EXISTS `order_address` (
  `address_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_id` varchar(36) NOT NULL COMMENT '关联订单ID',
  `receiver_name` varchar(64) NOT NULL COMMENT '收货人',
  `receiver_phone` varchar(32) NOT NULL COMMENT '收货人电话',
  `province` varchar(64) NOT NULL COMMENT '省份',
  `city` varchar(64) NOT NULL COMMENT '城市',
  `district` varchar(64) DEFAULT NULL COMMENT '区县',
  `address_detail` varchar(512) NOT NULL COMMENT '详细地址',
  `postal_code` varchar(16) DEFAULT NULL COMMENT '邮政编码',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否默认',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单地址';

CREATE TABLE IF NOT EXISTS `order_item` (
  `item_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_id` varchar(36) NOT NULL COMMENT '关联订单ID',
  `product_type` varchar(32) NOT NULL COMMENT '商品类型',
  `product_id` varchar(36) NOT NULL COMMENT '商品ID',
  `product_name` varchar(256) NOT NULL COMMENT '商品名称',
  `sku_code` varchar(64) DEFAULT NULL COMMENT 'SKU编码',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '数量',
  `unit_price` decimal(10,2) NOT NULL COMMENT '单价',
  `retail_price` decimal(10,2) DEFAULT NULL COMMENT '零售价',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
  `discount_reason` varchar(64) DEFAULT NULL COMMENT '优惠原因',
  `discount_ref_id` varchar(36) DEFAULT NULL COMMENT '优惠引用ID',
  `unit_cost` decimal(10,2) DEFAULT NULL COMMENT '成本单价',
  `gross_profit` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '毛利润',
  `subtotal` decimal(12,2) NOT NULL COMMENT '小计',
  `structure_standard_code` varchar(64) NOT NULL COMMENT '结构标准锚点',
  `product_tier` varchar(20) DEFAULT NULL COMMENT '产品层级',
  `order_fulfillment_type` varchar(32) NOT NULL DEFAULT 'frame_only' COMMENT '履行类型',
  `lens_status` varchar(32) NOT NULL DEFAULT 'not_needed' COMMENT '镜片状态',
  `frame_color` varchar(64) DEFAULT NULL COMMENT '镜框颜色',
  `frame_size` varchar(32) DEFAULT NULL COMMENT '镜框尺寸',
  `prescription_required` tinyint(1) NOT NULL DEFAULT 0 COMMENT '需处方',
  `sku_attributes` json DEFAULT NULL COMMENT 'SKU属性快照',
  `review_status` varchar(32) NOT NULL DEFAULT 'unreviewed' COMMENT '评价状态',
  `after_sale_status` varchar(32) NOT NULL DEFAULT 'none' COMMENT '售后状态',
  `remark` varchar(512) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单商品明细';

CREATE TABLE IF NOT EXISTS `order_log` (
  `log_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_id` varchar(36) NOT NULL COMMENT '关联订单ID',
  `action` varchar(64) NOT NULL COMMENT '操作动作',
  `old_status` varchar(32) DEFAULT NULL COMMENT '旧状态',
  `new_status` varchar(32) DEFAULT NULL COMMENT '新状态',
  `operator` varchar(64) DEFAULT NULL COMMENT '操作人',
  `remark` varchar(512) DEFAULT NULL COMMENT '备注',
  `extra_data` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单操作日志';

CREATE TABLE IF NOT EXISTS `order_payment` (
  `payment_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_id` varchar(36) NOT NULL COMMENT '关联订单ID',
  `payment_no` varchar(64) NOT NULL COMMENT '支付流水号',
  `payment_method` varchar(32) NOT NULL COMMENT '支付方式',
  `amount` decimal(12,2) NOT NULL COMMENT '金额',
  `status` varchar(32) NOT NULL DEFAULT 'pending' COMMENT '状态',
  `transaction_id` varchar(128) DEFAULT NULL COMMENT '第三方交易号',
  `paid_at` timestamp NULL DEFAULT NULL COMMENT '支付时间',
  `refunded_at` timestamp NULL DEFAULT NULL COMMENT '退款到账时间',
  `refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '退款金额',
  `remark` varchar(512) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uk_payment_no` (`payment_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单支付记录';

CREATE TABLE IF NOT EXISTS `order_shipment` (
  `shipment_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_id` varchar(36) NOT NULL COMMENT '关联订单ID',
  `tracking_no` varchar(128) DEFAULT NULL COMMENT '物流单号',
  `carrier` varchar(64) DEFAULT NULL COMMENT '物流公司',
  `shipped_at` timestamp NULL DEFAULT NULL COMMENT '发货时间',
  `delivered_at` timestamp NULL DEFAULT NULL COMMENT '签收时间',
  `status` varchar(32) NOT NULL DEFAULT 'pending' COMMENT '状态',
  `shipper` varchar(64) DEFAULT NULL COMMENT '发货人',
  `remark` varchar(512) DEFAULT NULL COMMENT '备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单物流';

CREATE TABLE IF NOT EXISTS `points_transaction` (
  `txn_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `points` int NOT NULL COMMENT '正数=获得 负数=消耗',
  `balance_after` int NOT NULL COMMENT '变更后余额',
  `type` varchar(32) NOT NULL COMMENT 'order_earn/order_burn/manual/expire',
  `ref_id` varchar(36) DEFAULT NULL COMMENT '关联订单号',
  `description` varchar(256) DEFAULT NULL COMMENT '描述',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`txn_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分交易记录';

CREATE TABLE IF NOT EXISTS `price_history` (
  `history_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `sku_id` varchar(36) NOT NULL COMMENT '关联SKU ID',
  `price_type` varchar(32) NOT NULL COMMENT 'cost/retail/min',
  `old_value` decimal(10,2) DEFAULT NULL COMMENT '旧值',
  `new_value` decimal(10,2) NOT NULL COMMENT '新值',
  `change_reason` varchar(256) DEFAULT NULL COMMENT '变更原因',
  `changed_by` varchar(64) DEFAULT NULL COMMENT '变更人',
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  INDEX `idx_sku` (`sku_id`),
  INDEX `idx_time` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='价格历史';

CREATE TABLE IF NOT EXISTS `product_category` (
  `category_id` char(36) NOT NULL COMMENT 'UUID主键',
  `category_code` varchar(64) NOT NULL COMMENT '分类编码',
  `category_name` varchar(128) NOT NULL COMMENT '分类名称',
  `parent_id` varchar(36) DEFAULT NULL COMMENT '父级ID',
  `level` int NOT NULL DEFAULT 1 COMMENT '等级',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `icon` varchar(64) DEFAULT NULL COMMENT '图标',
  `description` varchar(256) DEFAULT NULL COMMENT '分类描述',
  `is_recommended` tinyint NOT NULL DEFAULT 0 COMMENT '是否推荐',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '软删除时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uk_category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品分类';

CREATE TABLE IF NOT EXISTS `product_set` (
  `set_id` char(36) NOT NULL COMMENT 'UUID主键',
  `set_code` varchar(64) NOT NULL COMMENT '套装编码',
  `set_name` varchar(256) NOT NULL COMMENT '套装名称',
  `sku_list` json NOT NULL COMMENT 'SKU编码列表',
  `set_price` decimal(10,2) NOT NULL COMMENT '套装价格',
  `original_total_price` decimal(10,2) DEFAULT NULL COMMENT '原总价',
  `discount_rate` decimal(3,2) DEFAULT NULL COMMENT '折扣率',
  `retail_price` decimal(10,2) DEFAULT NULL COMMENT '零售价累加',
  `status` varchar(32) NOT NULL DEFAULT 'draft' COMMENT '状态',
  `description` text COMMENT '描述',
  `category_id` varchar(36) DEFAULT NULL COMMENT '分类ID',
  `main_image` varchar(512) DEFAULT NULL COMMENT '主图URL',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`set_id`),
  UNIQUE KEY `uk_set_code` (`set_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品套装';

CREATE TABLE IF NOT EXISTS `product_sku` (
  `sku_id` char(36) NOT NULL COMMENT 'UUID主键',
  `sku_code` varchar(128) NOT NULL COMMENT 'SKU编码',
  `spu_id` varchar(32) NOT NULL COMMENT 'SPU ID',
  `sku_name` varchar(256) DEFAULT NULL COMMENT 'SKU名称',
  `color_code` varchar(64) NOT NULL COMMENT '色彩代码',
  `skin_tone_effect` varchar(32) DEFAULT NULL COMMENT '肤色效果',
  `face_shape_effect` varchar(32) DEFAULT NULL COMMENT '脸型效果',
  `display_name` varchar(256) DEFAULT NULL COMMENT '完整展示名',
  `structure_standard_code` varchar(64) NOT NULL COMMENT '结构标准编码',
  `product_tier` varchar(20) DEFAULT NULL COMMENT '产品层级',
  `sku_attributes` json DEFAULT NULL COMMENT 'SKU属性',
  `cost_price` decimal(10,2) DEFAULT NULL COMMENT '成本价',
  `retail_price` decimal(10,2) NOT NULL COMMENT '统一零售价',
  `min_price` decimal(10,2) DEFAULT NULL COMMENT '最低售价',
  `stock_quantity` int NOT NULL DEFAULT 0 COMMENT '库存',
  `warning_quantity` int NOT NULL DEFAULT 10 COMMENT '预警数量',
  `barcode` varchar(128) DEFAULT NULL COMMENT '旧条码',
  `sku_barcode` varchar(64) DEFAULT NULL COMMENT '内部条码',
  `ean13` varchar(13) DEFAULT NULL COMMENT 'EAN-13',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  `structure_width` int DEFAULT NULL COMMENT '结构标准-镜片宽度mm',
  `bridge_width` int DEFAULT NULL COMMENT '鼻梁宽度mm',
  `temple_length` int DEFAULT NULL COMMENT '镜腿长度mm',
  `frame_height` int DEFAULT NULL COMMENT '【已废弃】镜框高度',
  `total_width` int DEFAULT NULL COMMENT '总宽度mm',
  `frame_material` varchar(32) DEFAULT NULL COMMENT '镜框材质',
  `temple_material` varchar(32) DEFAULT NULL COMMENT '镜腿材质',
  `frame_type` varchar(20) DEFAULT NULL COMMENT '镜框类型',
  `nose_pad_type` varchar(32) DEFAULT NULL COMMENT '鼻托类型',
  `hinge_type` varchar(32) DEFAULT NULL COMMENT '铰链类型',
  `weight_g` decimal(5,1) DEFAULT NULL COMMENT '重量g',
  `suitable_face_shapes` json DEFAULT NULL COMMENT '适用脸型',
  `surface_treatment` varchar(32) DEFAULT NULL COMMENT '表面处理',
  `has_blue_light_filter` tinyint NOT NULL DEFAULT 0 COMMENT '防蓝光',
  `has_photochromic` tinyint NOT NULL DEFAULT 0 COMMENT '变色',
  `has_polarized` tinyint NOT NULL DEFAULT 0 COMMENT '偏光',
  `uv_protection` varchar(10) NOT NULL DEFAULT 'UV400' COMMENT 'UV防护',
  `tech_spec_extra` json DEFAULT NULL COMMENT '扩展技术参数',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sku_id`),
  UNIQUE KEY `uk_sku_code` (`sku_code`),
  UNIQUE KEY `uk_sku_barcode` (`sku_barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SKU';

CREATE TABLE IF NOT EXISTS `product_sku_image` (
  `image_id` char(36) NOT NULL COMMENT 'UUID主键',
  `sku_id` varchar(36) NOT NULL COMMENT '关联SKU ID',
  `image_url` varchar(512) NOT NULL COMMENT '图片URL',
  `image_type` varchar(32) NOT NULL DEFAULT 'gallery' COMMENT 'main/gallery/detail/lifestyle/360view/website_banner',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否主图',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `alt_text` varchar(256) DEFAULT NULL COMMENT 'SEO替代文本',
  `width` int DEFAULT NULL COMMENT '图片宽度',
  `height` int DEFAULT NULL COMMENT '图片高度',
  `file_size` int DEFAULT NULL COMMENT '文件大小',
  `created_by` varchar(36) DEFAULT NULL COMMENT '创建人',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`image_id`),
  INDEX `idx_sku_type` (`sku_id`, `image_type`, `sort_order`),
  INDEX `idx_sku_primary` (`sku_id`, `is_primary`),
  INDEX `idx_sku_active` (`sku_id`, `is_active`, `is_deleted`),
  INDEX `idx_type_active` (`image_type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SKU图片';

CREATE TABLE IF NOT EXISTS `product_spu` (
  `spu_id` char(36) NOT NULL COMMENT 'SPU ID',
  `spu_code` varchar(64) NOT NULL COMMENT 'SPU编码',
  `spu_name` varchar(256) NOT NULL COMMENT 'SPU名称',
  `category_id` char(36) DEFAULT NULL COMMENT '分类ID',
  `structure_standard_code` varchar(64) NOT NULL COMMENT '结构标准编码',
  `product_tier` varchar(20) DEFAULT NULL COMMENT '产品层级',
  `series_code` varchar(64) DEFAULT NULL COMMENT '系列编码',
  `gender` varchar(16) NOT NULL DEFAULT 'unisex' COMMENT '款式',
  `scene_tags` json DEFAULT NULL COMMENT '场景标签',
  `description` text COMMENT '描述',
  `main_image` varchar(512) DEFAULT NULL COMMENT '主图URL',
  `images` json DEFAULT NULL COMMENT '图片列表',
  `attributes` json DEFAULT NULL COMMENT '扩展属性',
  `compatibility_levels` json DEFAULT NULL COMMENT '兼容等级列表',
  `status` varchar(32) NOT NULL DEFAULT 'draft' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`spu_id`),
  UNIQUE KEY `uk_spu_code` (`spu_code`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_structure` (`structure_standard_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品SPU';

CREATE TABLE IF NOT EXISTS `product_tier_pricing` (
  `tier_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `tier_name` varchar(32) NOT NULL COMMENT '层级名称',
  `tier_code` varchar(16) NOT NULL COMMENT '层级编码',
  `positioning` varchar(256) DEFAULT NULL COMMENT '定位',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_id`),
  UNIQUE KEY `uk_tier_code` (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品层级定价';

CREATE TABLE IF NOT EXISTS `promotion` (
  `promotion_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `promotion_code` varchar(32) NOT NULL COMMENT '促销编码',
  `name` varchar(128) NOT NULL COMMENT '名称',
  `type` varchar(32) NOT NULL COMMENT 'discount/flash_sale/bundle/coupon/member_exclusive',
  `scope` varchar(32) NOT NULL COMMENT 'all/category/spu/sku',
  `scope_ids` json DEFAULT NULL COMMENT '适用范围ID列表',
  `discount_type` varchar(16) NOT NULL COMMENT 'percent/fixed_amount',
  `discount_value` decimal(10,2) NOT NULL COMMENT '优惠值',
  `min_amount` decimal(10,2) DEFAULT NULL COMMENT '最低金额',
  `max_discount` decimal(10,2) DEFAULT NULL COMMENT '最大折扣',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `user_limit` int DEFAULT NULL COMMENT '每人限用次数',
  `total_limit` int DEFAULT NULL COMMENT '总量限制',
  `used_count` int NOT NULL DEFAULT 0 COMMENT '已使用次数',
  `status` varchar(16) NOT NULL DEFAULT 'draft' COMMENT 'draft/active/paused/expired',
  `priority` int NOT NULL DEFAULT 0 COMMENT '优先级',
  `stackable` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否可叠加',
  `extra` json DEFAULT NULL COMMENT '扩展数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`promotion_id`),
  UNIQUE KEY `uk_promotion_code` (`promotion_code`),
  INDEX `idx_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='促销活动';

CREATE TABLE IF NOT EXISTS `promotion_sku` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `promotion_id` varchar(36) NOT NULL COMMENT '促销ID',
  `sku_id` varchar(36) NOT NULL COMMENT 'SKU ID',
  `custom_price` decimal(10,2) DEFAULT NULL COMMENT '活动专属价',
  `priority` int NOT NULL DEFAULT 0 COMMENT '优先级',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promo_sku` (`promotion_id`, `sku_id`),
  INDEX `idx_sku` (`sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='促销SKU关联';

CREATE TABLE IF NOT EXISTS `review` (
  `review_id` char(36) NOT NULL COMMENT 'UUID主键',
  `order_id` varchar(36) NOT NULL COMMENT '订单ID',
  `order_item_id` varchar(36) DEFAULT NULL COMMENT '订单明细ID',
  `customer_id` varchar(36) NOT NULL COMMENT '客户ID',
  `customer_name` varchar(128) DEFAULT NULL COMMENT '客户名称',
  `spu_id` varchar(36) NOT NULL COMMENT '关联SPU',
  `sku_id` varchar(36) DEFAULT NULL COMMENT '关联SKU',
  `overall_score` int NOT NULL COMMENT '综合评分',
  `quality_score` int DEFAULT NULL COMMENT '质量评分',
  `comfort_score` int DEFAULT NULL COMMENT '舒适度评分',
  `style_score` int DEFAULT NULL COMMENT '款式评分',
  `value_score` int DEFAULT NULL COMMENT '性价比评分',
  `content` text COMMENT '评价内容',
  `is_anonymous` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否匿名',
  `status` varchar(16) NOT NULL DEFAULT 'pending' COMMENT '状态',
  `images` json DEFAULT NULL COMMENT '图片列表',
  `reply_content` text COMMENT '商家回复',
  `reply_by` varchar(36) DEFAULT NULL COMMENT '回复人',
  `reply_at` timestamp NULL DEFAULT NULL COMMENT '回复时间',
  `tags` json DEFAULT NULL COMMENT '标签列表',
  `helpful_count` int NOT NULL DEFAULT 0 COMMENT '有用数量',
  `metadata` json DEFAULT NULL COMMENT '元数据',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商品评价';

CREATE TABLE IF NOT EXISTS `sku_effect_recommend` (
  `rec_id` char(36) NOT NULL COMMENT 'UUID主键',
  `color_code` varchar(64) NOT NULL COMMENT '颜色编码',
  `skin_tone_effect` varchar(32) NOT NULL COMMENT '肤色效果词',
  `face_shape_effect` varchar(32) NOT NULL COMMENT '脸型效果词',
  `is_primary` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否主推荐',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  PRIMARY KEY (`rec_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SKU效果推荐';

CREATE TABLE IF NOT EXISTS `sms_verification_code` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `phone` varchar(11) NOT NULL COMMENT '电话',
  `code` varchar(6) NOT NULL COMMENT '验证码',
  `purpose` varchar(20) NOT NULL DEFAULT 'login' COMMENT 'login/register/reset',
  `expires_at` datetime NOT NULL COMMENT '过期时间',
  `used` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已使用',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '请求IP',
  `sent_at` datetime DEFAULT NULL COMMENT '发送时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_phone_purpose` (`phone`, `purpose`),
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信验证码';

CREATE TABLE IF NOT EXISTS `structure_compatibility` (
  `compat_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `structure_standard_code` varchar(64) NOT NULL COMMENT '结构标准锚点',
  `product_sku_id` varchar(36) NOT NULL COMMENT '关联镜框SKU',
  `compatibility_level` varchar(16) NOT NULL COMMENT 'color/style/texture/smart',
  `notes` varchar(512) DEFAULT NULL COMMENT '备注',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`compat_id`),
  INDEX `idx_structure_standard` (`structure_standard_code`),
  INDEX `idx_sku` (`product_sku_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结构兼容性';

CREATE TABLE IF NOT EXISTS `structure_standard` (
  `structure_id` char(36) NOT NULL COMMENT 'UUID主键',
  `external_code` varchar(16) NOT NULL COMMENT '对外编号',
  `internal_code` varchar(64) DEFAULT NULL COMMENT '对内编号',
  `shape_code` varchar(8) NOT NULL COMMENT '造型代码',
  `series_code` varchar(8) DEFAULT NULL COMMENT '系列代码',
  `width` decimal(5,1) NOT NULL COMMENT '宽度mm',
  `height` decimal(5,1) NOT NULL COMMENT '高度mm',
  `bridge_width` int DEFAULT NULL COMMENT '鼻梁宽度mm',
  `circumference` decimal(6,1) NOT NULL COMMENT '周长mm',
  `base_curve` int DEFAULT NULL COMMENT '基弧',
  `surface_types` json NOT NULL COMMENT '球面类型',
  `refractive_indexes` json NOT NULL COMMENT '折射率',
  `description` text COMMENT '描述',
  `status` varchar(16) NOT NULL DEFAULT 'active' COMMENT '状态',
  `material_code` varchar(16) DEFAULT NULL COMMENT '材质编码',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`structure_id`),
  UNIQUE KEY `uk_external_code` (`external_code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结构标准';

CREATE TABLE IF NOT EXISTS `structure_standard_attachment` (
  `attachment_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `structure_id` varchar(36) NOT NULL COMMENT '结构标准ID',
  `file_type` varchar(16) NOT NULL COMMENT 'image/pdf/dwg/3d',
  `file_name` varchar(256) NOT NULL COMMENT '文件名',
  `file_url` varchar(512) NOT NULL COMMENT '文件URL',
  `file_size` int DEFAULT NULL COMMENT '文件大小',
  `mime_type` varchar(128) DEFAULT NULL COMMENT 'MIME类型',
  `description` text COMMENT '附件说明',
  `is_public` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否公开',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结构标准附件';

CREATE TABLE IF NOT EXISTS `sub_sku` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `code` varchar(50) NOT NULL COMMENT '编码',
  `name` varchar(200) NOT NULL COMMENT '名称',
  `category_id` varchar(36) NOT NULL COMMENT '分类ID',
  `spec_template_id` varchar(36) DEFAULT NULL COMMENT '规格模板ID',
  `brand` varchar(50) DEFAULT NULL COMMENT '品牌',
  `model` varchar(100) DEFAULT NULL COMMENT '型号',
  `spec_values` json DEFAULT NULL COMMENT '规格值',
  `standard_id` varchar(36) DEFAULT NULL COMMENT '标准ID',
  `price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '价格',
  `cost_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '成本价',
  `unit` varchar(20) NOT NULL DEFAULT '副' COMMENT '单位',
  `stock` int NOT NULL DEFAULT 0 COMMENT '库存',
  `images` json DEFAULT NULL COMMENT '图片列表',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='副品S-SKU';

CREATE TABLE IF NOT EXISTS `sub_sku_category` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `code` varchar(50) NOT NULL COMMENT '编码',
  `name` varchar(100) NOT NULL COMMENT '名称',
  `parent_id` varchar(36) DEFAULT NULL COMMENT '父级ID',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='副品分类';

CREATE TABLE IF NOT EXISTS `sys_agent_manifest` (
  `agent_id` char(36) NOT NULL COMMENT 'UUID主键',
  `agent_code` varchar(64) NOT NULL COMMENT 'Agent编码',
  `agent_name` varchar(128) NOT NULL COMMENT 'Agent名称',
  `agent_type` varchar(32) NOT NULL DEFAULT 'internal' COMMENT 'internal/external/mcp_client',
  `security_clearance` varchar(8) NOT NULL DEFAULT 'L2' COMMENT 'L1-L4安全等级',
  `capabilities_json` text COMMENT '能力配置JSON',
  `user_id` varchar(36) DEFAULT NULL COMMENT '关联用户ID',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_active_at` datetime DEFAULT NULL COMMENT '最后活跃时间',
  `stats_json` text COMMENT '行为统计JSON',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`agent_id`),
  UNIQUE KEY `uk_agent_code` (`agent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent注册表';

CREATE TABLE IF NOT EXISTS `sys_audit_log` (
  `log_id` char(36) NOT NULL COMMENT 'UUID主键',
  `actor_type` varchar(32) NOT NULL COMMENT 'human/agent/system',
  `actor_id` varchar(64) NOT NULL COMMENT '操作者ID',
  `actor_name` varchar(128) DEFAULT NULL COMMENT '操作者名称',
  `action_time` datetime(3) NOT NULL COMMENT '操作时间',
  `category` varchar(32) NOT NULL COMMENT '操作类别',
  `action` varchar(256) NOT NULL COMMENT '具体操作',
  `resource` varchar(512) DEFAULT NULL COMMENT '目标资源',
  `detail` text COMMENT '操作详情JSON',
  `data_domain` varchar(64) DEFAULT NULL COMMENT '数据域',
  `sensitivity` varchar(32) NOT NULL DEFAULT 'none' COMMENT '敏感级别',
  `was_masked` tinyint(1) NOT NULL DEFAULT 0 COMMENT '已脱敏',
  `export_target` varchar(128) DEFAULT NULL COMMENT '数据出口目标',
  `source_ip` varchar(64) DEFAULT NULL COMMENT '请求IP',
  `result` varchar(32) NOT NULL DEFAULT 'success' COMMENT 'success/failure/blocked',
  `error_message` text COMMENT '错误信息',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_actor` (`actor_type`, `actor_id`),
  INDEX `idx_action_time` (`action_time`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全量审计日志';

CREATE TABLE IF NOT EXISTS `sys_menu` (
  `menu_id` char(36) NOT NULL COMMENT 'UUID主键',
  `menu_code` varchar(64) NOT NULL COMMENT '菜单编码',
  `menu_name` varchar(128) NOT NULL COMMENT '菜单名称',
  `parent_id` varchar(36) DEFAULT NULL COMMENT '父级ID',
  `menu_type` varchar(32) NOT NULL DEFAULT 'menu' COMMENT '菜单类型',
  `path` varchar(256) DEFAULT NULL COMMENT '路径',
  `icon` varchar(64) DEFAULT NULL COMMENT '图标',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `permission_code` varchar(128) DEFAULT NULL COMMENT '权限编码',
  `is_visible` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否可见',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`menu_id`),
  UNIQUE KEY `uk_menu_code` (`menu_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统菜单';

CREATE TABLE IF NOT EXISTS `sys_permission` (
  `permission_id` char(36) NOT NULL COMMENT 'UUID主键',
  `permission_code` varchar(128) NOT NULL COMMENT '权限编码',
  `permission_name` varchar(128) NOT NULL COMMENT '权限名称',
  `resource_type` varchar(32) DEFAULT NULL COMMENT '资源类型',
  `resource_path` varchar(256) DEFAULT NULL COMMENT '资源路径',
  `description` varchar(512) DEFAULT NULL COMMENT '描述',
  `parent_id` varchar(32) DEFAULT NULL COMMENT '父级ID',
  `sort_order` int NOT NULL DEFAULT 0 COMMENT '排序',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permission_id`),
  UNIQUE KEY `uk_permission_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统权限';

CREATE TABLE IF NOT EXISTS `sys_role` (
  `role_id` char(36) NOT NULL COMMENT 'UUID主键',
  `role_code` varchar(64) NOT NULL COMMENT '角色编码',
  `role_name` varchar(128) NOT NULL COMMENT '角色名称',
  `description` varchar(512) DEFAULT NULL COMMENT '描述',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统角色';

CREATE TABLE IF NOT EXISTS `sys_role_permission` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `role_id` varchar(36) NOT NULL COMMENT '角色ID',
  `permission_id` varchar(36) NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联';

CREATE TABLE IF NOT EXISTS `sys_user` (
  `user_id` char(36) NOT NULL COMMENT 'UUID主键',
  `username` varchar(64) NOT NULL COMMENT '用户名',
  `password_hash` varchar(256) NOT NULL COMMENT '密码哈希',
  `real_name` varchar(128) DEFAULT NULL COMMENT '真实姓名',
  `email` varchar(32) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(32) DEFAULT NULL COMMENT '电话',
  `status` varchar(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '软删除标记',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统用户';

CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `user_id` varchar(36) NOT NULL COMMENT '用户ID',
  `role_id` varchar(36) NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联';


-- (agent_memory) 路 鈴革笍 鏉ヨ嚜澶囦唤锛堟棤鐙珛Entity/鏃ц〃锛?

CREATE TABLE IF NOT EXISTS `vision_prescription` (
  `prescription_id` varchar(36) NOT NULL,
  `customer_id` varchar(36) NOT NULL,
  `label` varchar(64) DEFAULT NULL,
  `od_sphere` decimal(4,2) DEFAULT NULL,
  `od_cylinder` decimal(4,2) DEFAULT NULL,
  `od_axis` int DEFAULT NULL,
  `od_add` decimal(4,2) DEFAULT NULL,
  `os_sphere` decimal(4,2) DEFAULT NULL,
  `os_cylinder` decimal(4,2) DEFAULT NULL,
  `os_axis` int DEFAULT NULL,
  `os_add` decimal(4,2) DEFAULT NULL,
  `pd_value` decimal(4,1) DEFAULT NULL,
  `source_type` varchar(32) DEFAULT NULL,
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

-- (model_key) · 🆕 模型密钥 · 无独立Entity于Starter

CREATE TABLE IF NOT EXISTS `wholesale_tier` (
  `tier_id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `tier_name` varchar(32) NOT NULL COMMENT '层级名称',
  `tier_code` varchar(16) NOT NULL COMMENT '层级编码',
  `min_quantity` int NOT NULL COMMENT '最低数量',
  `max_quantity` int DEFAULT NULL COMMENT '最高数量',
  `discount_rate` decimal(4,3) NOT NULL COMMENT '折扣率',
  `description` varchar(256) DEFAULT NULL COMMENT '描述',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_id`),
  UNIQUE KEY `uk_tier_code` (`tier_code`),
  INDEX `idx_code` (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='批发阶梯';


-- ==========================================
-- 旧表区 (will be appended manually)
-- ==========================================

-- ==========================================
-- 以下为无独立Entity/Core/字典/透镜旧表
-- 来源：init-structure.sql.bak-20260611
-- 状态：与现有代码兼容
-- ==========================================

-- (agent_memory) from bak
CREATE TABLE IF NOT EXISTS `agent_memory` (
  `memory_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT '记忆标题',
  `content` mediumtext NOT NULL COMMENT '记忆内容（Markdown）',
  `category` varchar(32) NOT NULL DEFAULT 'lesson' COMMENT 'lesson/rule/discovery/preference/context',
  `severity` varchar(16) NOT NULL DEFAULT 'info' COMMENT 'critical/warning/info/success',
  `scope` varchar(32) NOT NULL DEFAULT 'global' COMMENT 'global/task_type/entity/agent',
  `scope_value` varchar(64) DEFAULT NULL COMMENT 'scope=task_type时存 product_listing',
  `owner_agent` varchar(100) DEFAULT NULL COMMENT '所属Agent（null=共享）',
  `visibility` varchar(16) NOT NULL DEFAULT 'private' COMMENT 'private/team/public',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号，每次修改+1',
  `hit_count` int NOT NULL DEFAULT '0' COMMENT '被注入次数',
  `last_hit_at` datetime DEFAULT NULL COMMENT '最近注入时间',
  `source_session` varchar(36) DEFAULT NULL COMMENT '来源 agent_session.id',
  `source_task` varchar(36) DEFAULT NULL COMMENT '来源 agent_task.id',
  `source_error` varchar(36) DEFAULT NULL COMMENT '来源 agent_error_log.id',
  `media_refs` json DEFAULT NULL COMMENT '关联媒体路径（预留视觉模型）',
  `status` varchar(16) NOT NULL DEFAULT 'active' COMMENT 'active/deprecated/archived',
  `deprecated_by` varchar(36) DEFAULT NULL COMMENT '被哪个新版本取代',
  `created_by` varchar(32) NOT NULL DEFAULT 'agent' COMMENT 'agent/human/system',
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

-- (agent_registry) from bak
CREATE TABLE IF NOT EXISTS `agent_registry` (
  `id` varchar(36) NOT NULL,
  `agent_name` varchar(100) NOT NULL,
  `agent_type` varchar(50) NOT NULL,
  `display_name` varchar(128) DEFAULT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `capabilities` json DEFAULT NULL,
  `default_report_to` varchar(36) DEFAULT NULL,
  `allowed_actions` json DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_name` (`agent_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `agent_task`)

-- (agent_task) from bak
CREATE TABLE IF NOT EXISTS `agent_task` (
  `id` varchar(36) NOT NULL,
  `task_no` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `type` varchar(50) NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `report_to` varchar(36) NOT NULL,
  `escalate_to` varchar(36) DEFAULT NULL,
  `escalation_hours` int NOT NULL DEFAULT '48',
  `status` varchar(32) NOT NULL DEFAULT 'drafted',
  `current_phase` int NOT NULL DEFAULT '0',
  `total_phases` int NOT NULL DEFAULT '0',
  `report_frequency` varchar(32) NOT NULL DEFAULT 'every_step',
  `context` json DEFAULT NULL,
  `proposals` json DEFAULT NULL,
  `deliverables` json DEFAULT NULL,
  `agent_id` varchar(100) DEFAULT NULL,
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

-- (cognitive_log) from bak
CREATE TABLE IF NOT EXISTS `cognitive_log` (
  `id` varchar(36) NOT NULL,
  `log_type` varchar(50) NOT NULL,
  `source_module` varchar(50) NOT NULL,
  `source_id` varchar(36) DEFAULT NULL,
  `level` varchar(20) NOT NULL DEFAULT 'info',
  `title` varchar(255) DEFAULT NULL,
  `content` json NOT NULL,
  `agent_id` varchar(100) DEFAULT NULL,
  `actor` varchar(100) DEFAULT NULL,
  `actor_type` varchar(32) NOT NULL DEFAULT 'system',
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_log_type` (`log_type`),
  KEY `idx_source` (`source_module`,`source_id`),
  KEY `idx_agent_id` (`agent_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `color_design_project`)

-- (deliverable_manifest) from bak
CREATE TABLE IF NOT EXISTS `deliverable_manifest` (
  `id` varchar(36) NOT NULL,
  `task_id` varchar(36) NOT NULL,
  `task_title` varchar(200) NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `user_type` varchar(20) NOT NULL DEFAULT 'operator',
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `created_by` varchar(64) NOT NULL,
  `approved_by` varchar(64) DEFAULT NULL,
  `changelog` text,
  `parent_version` int DEFAULT NULL,
  `file_count` int NOT NULL DEFAULT '0',
  `total_size` bigint NOT NULL DEFAULT '0',
  `dir_path` varchar(512) NOT NULL,
  `extra` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_task_version` (`task_id`,`version`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_after_sale_reason`)

-- (dict_after_sale_reason) from bak
CREATE TABLE IF NOT EXISTS `dict_after_sale_reason` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `after_sale_type_code` varchar(64) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_after_sale_status`)

-- (dict_after_sale_status) from bak
CREATE TABLE IF NOT EXISTS `dict_after_sale_status` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_audit_status`)

-- (dict_audit_status) from bak
CREATE TABLE IF NOT EXISTS `dict_audit_status` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_brand`)

-- (dict_brand) from bak
CREATE TABLE IF NOT EXISTS `dict_brand` (
  `id` varchar(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(50) NOT NULL,
  `brand_type` varchar(20) DEFAULT 'third_party' COMMENT 'own/third_party',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_code_spec`)

-- (dict_code_spec) from bak
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

-- (dict_compatibility_level) from bak
CREATE TABLE IF NOT EXISTS `dict_compatibility_level` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_contact_role`)

-- (dict_contact_role) from bak
CREATE TABLE IF NOT EXISTS `dict_contact_role` (
  `code` varchar(32) NOT NULL COMMENT '角色编码',
  `name` varchar(64) NOT NULL COMMENT '角色名称',
  `description` varchar(256) DEFAULT NULL COMMENT '描述',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认角色',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系人角色字典';

-- (first-time-only: `dict_customer_level`)

-- (dict_customer_level) from bak
CREATE TABLE IF NOT EXISTS `dict_customer_level` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_customer_status`)

-- (dict_customer_status) from bak
CREATE TABLE IF NOT EXISTS `dict_customer_status` (
  `code` varchar(32) NOT NULL COMMENT '鐘舵?缂栫爜',
  `name` varchar(64) NOT NULL COMMENT '鐘舵?鍚嶇О',
  `description` varchar(256) DEFAULT NULL COMMENT '鎻忚堪',
  `color` varchar(16) DEFAULT NULL COMMENT 'UI鏍囩?棰滆壊: success/warning/danger/info',
  `sort_order` int DEFAULT '0' COMMENT '鎺掑簭',
  `is_active` tinyint DEFAULT '1' COMMENT '鏄?惁鍚?敤',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='瀹㈡埛鐘舵?瀛楀吀';

-- (first-time-only: `dict_customer_type`)

-- (dict_customer_type) from bak
CREATE TABLE IF NOT EXISTS `dict_customer_type` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_effect_tag`)

-- (dict_lens_coating) from bak
CREATE TABLE IF NOT EXISTS `dict_lens_coating` (
  `id` varchar(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(50) NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_lens_function`)

-- (dict_lens_function) from bak
CREATE TABLE IF NOT EXISTS `dict_lens_function` (
  `id` varchar(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL COMMENT '功能名',
  `display_name` varchar(50) NOT NULL COMMENT '消费者展示名',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_lens_material`)

-- (dict_lens_material) from bak
CREATE TABLE IF NOT EXISTS `dict_lens_material` (
  `id` varchar(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(50) NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_logistics_company`)

-- (dict_logistics_company) from bak
CREATE TABLE IF NOT EXISTS `dict_logistics_company` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `english_name` varchar(128) DEFAULT NULL,
  `tracking_url_template` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_logistics_status`)

-- (dict_logistics_status) from bak
CREATE TABLE IF NOT EXISTS `dict_logistics_status` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_logistics_trace_type`)

-- (dict_logistics_trace_type) from bak
CREATE TABLE IF NOT EXISTS `dict_logistics_trace_type` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_nose_pad`)

-- (dict_order_status) from bak
CREATE TABLE IF NOT EXISTS `dict_order_status` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_payment_method`)

-- (dict_payment_method) from bak
CREATE TABLE IF NOT EXISTS `dict_payment_method` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_payment_scene`)

-- (dict_payment_scene) from bak
CREATE TABLE IF NOT EXISTS `dict_payment_scene` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_payment_status`)

-- (dict_payment_status) from bak
CREATE TABLE IF NOT EXISTS `dict_payment_status` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_product_status`)

-- (dict_product_status) from bak
CREATE TABLE IF NOT EXISTS `dict_product_status` (
  `code` varchar(32) NOT NULL COMMENT '????: draft/on_sale/off_sale',
  `name` varchar(64) NOT NULL COMMENT '????',
  `description` varchar(256) DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???????';

-- (first-time-only: `dict_product_tier`)

-- (dict_product_tier) from bak
CREATE TABLE IF NOT EXISTS `dict_product_tier` (
  `tier_code` varchar(20) NOT NULL,
  `tier_name` varchar(20) NOT NULL,
  `tier_desc` text,
  `sort_order` int NOT NULL DEFAULT '0',
  `icon_color` varchar(16) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_product_type`)

-- (dict_product_type) from bak
CREATE TABLE IF NOT EXISTS `dict_product_type` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_promotion_status`)

-- (dict_promotion_status) from bak
CREATE TABLE IF NOT EXISTS `dict_promotion_status` (
  `code` varchar(32) NOT NULL COMMENT '????: draft/active/paused/expired',
  `name` varchar(64) NOT NULL COMMENT '????',
  `description` varchar(256) DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???????';

-- (first-time-only: `dict_referral_source`)

-- (dict_referral_source) from bak
CREATE TABLE IF NOT EXISTS `dict_referral_source` (
  `code` varchar(32) NOT NULL COMMENT '渠道编码',
  `name` varchar(64) NOT NULL COMMENT '渠道名称',
  `description` varchar(256) DEFAULT NULL COMMENT '描述',
  `channel_group` varchar(32) DEFAULT NULL COMMENT '渠道分组: social/video/search/offline/partner/other',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户来源渠道字典';

-- (first-time-only: `dict_refractive_index`)

-- (dict_refractive_index) from bak
CREATE TABLE IF NOT EXISTS `dict_refractive_index` (
  `id` varchar(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL COMMENT '技术名',
  `display_name` varchar(50) NOT NULL COMMENT '消费者展示名',
  `value` decimal(4,2) NOT NULL COMMENT '折射率数值',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_review_status`)

-- (dict_review_status) from bak
CREATE TABLE IF NOT EXISTS `dict_review_status` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_review_tag`)

-- (dict_review_tag) from bak
CREATE TABLE IF NOT EXISTS `dict_review_tag` (
  `dict_id` varchar(32) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `category` varchar(64) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_sku_color`)

-- (dict_sku_status) from bak
CREATE TABLE IF NOT EXISTS `dict_sku_status` (
  `code` varchar(32) NOT NULL COMMENT '????: active/inactive/discontinued',
  `name` varchar(64) NOT NULL COMMENT '????',
  `description` varchar(256) DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SKU?????';

-- (first-time-only: `dict_spu_color`)

-- (dict_spu_color) from bak
CREATE TABLE IF NOT EXISTS `dict_spu_color` (
  `dict_id` varchar(32) NOT NULL,
  `color_code` varchar(64) NOT NULL,
  `color_name` varchar(128) NOT NULL,
  `color_name_en` varchar(128) DEFAULT NULL,
  `pinyin_name` varchar(128) DEFAULT NULL COMMENT '中文名拼音（如 "fen hong"）',
  `pinyin_initial` varchar(16) DEFAULT NULL COMMENT '拼音首字母（如 "fh"）',
  `color_family` varchar(32) DEFAULT NULL,
  `color_type` varchar(32) DEFAULT 'solid',
  `pattern_type` varchar(32) DEFAULT NULL,
  `hex_value` varchar(16) DEFAULT NULL,
  `pantone_ref` varchar(32) DEFAULT NULL COMMENT 'Pantone 参考编号',
  `hex_values` json DEFAULT NULL,
  `swatch_image` varchar(512) DEFAULT NULL,
  `trend_score` decimal(3,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `color_code` (`color_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `dict_subscription_status`)

-- (dict_subscription_status) from bak
CREATE TABLE IF NOT EXISTS `dict_subscription_status` (
  `code` varchar(32) NOT NULL COMMENT '状态编码',
  `name` varchar(64) NOT NULL COMMENT '状态名称',
  `description` varchar(256) DEFAULT NULL COMMENT '描述',
  `color` varchar(16) DEFAULT NULL COMMENT 'el-tag 颜色',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅状态字典';

-- (first-time-only: `dict_surface_treatment`)

-- (dict_unit) from bak
CREATE TABLE IF NOT EXISTS `dict_unit` (
  `id` varchar(36) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(20) NOT NULL,
  `display_name` varchar(20) NOT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft`)

-- (draft_spu) from bak
CREATE TABLE IF NOT EXISTS `draft_spu` (
  `draft_id` varchar(36) NOT NULL,
  `batch_id` varchar(36) DEFAULT NULL,
  `gender` varchar(20) NOT NULL,
  `shape_code` varchar(20) NOT NULL,
  `series_code` varchar(20) NOT NULL,
  `structure_standard_code` varchar(20) NOT NULL,
  `spu_name` varchar(200) NOT NULL,
  `spu_description` text,
  `display_name_template` varchar(500) DEFAULT NULL,
  `source` varchar(20) NOT NULL DEFAULT 'ai',
  `status` varchar(20) NOT NULL DEFAULT 'draft',
  `aesthetic_score` decimal(5,2) DEFAULT NULL,
  `aesthetic_level` varchar(10) DEFAULT NULL,
  `review_notes` text,
  `rejected_reason` text,
  `published_spu_id` varchar(36) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `reviewed_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`draft_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `draft_task`)

-- (erdl_proposal) from bak
CREATE TABLE IF NOT EXISTS `erdl_proposal` (
  `id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `proposal_type` varchar(32) NOT NULL,
  `module` varchar(64) NOT NULL,
  `proposed_by` varchar(64) NOT NULL,
  `changes` json NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `reviewed_by` varchar(64) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `erdl_rule_record`)

-- (erdl_rule_record) from bak
CREATE TABLE IF NOT EXISTS `erdl_rule_record` (
  `id` varchar(36) NOT NULL,
  `rule_name` varchar(128) NOT NULL,
  `module` varchar(64) NOT NULL,
  `entity` varchar(64) NOT NULL,
  `expression` text NOT NULL,
  `description` text,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `version` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `erdl_snapshot`)

-- (erdl_snapshot) from bak
CREATE TABLE IF NOT EXISTS `erdl_snapshot` (
  `id` varchar(36) NOT NULL,
  `snapshot_name` varchar(200) NOT NULL,
  `module` varchar(64) NOT NULL,
  `content` json NOT NULL,
  `created_by` varchar(64) NOT NULL,
  `description` text,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `external_barcode_mapping`)

-- (knowledge_entry) from bak
CREATE TABLE IF NOT EXISTS `knowledge_entry` (
  `id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `visibility` varchar(32) NOT NULL DEFAULT 'public',
  `type` varchar(32) NOT NULL DEFAULT 'EXPERIENCE',
  `tags` json NOT NULL,
  `content` text NOT NULL,
  `weight` float NOT NULL DEFAULT '0.3',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `attachments` json DEFAULT NULL,
  `contributor` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_visibility` (`visibility`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_compatibility`)

-- (lens_compatibility) from bak
CREATE TABLE IF NOT EXISTS `lens_compatibility` (
  `compat_id` varchar(36) NOT NULL,
  `product_sku_id` varchar(36) NOT NULL,
  `compatibility_level` varchar(16) NOT NULL,
  `notes` varchar(512) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `lens_standard_code` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`compat_id`),
  UNIQUE KEY `uk_lens_sku` (`product_sku_id`),
  KEY `idx_lens_standard` (`lens_standard_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_material`)

-- (lens_material) from bak
CREATE TABLE IF NOT EXISTS `lens_material` (
  `material_code` varchar(16) NOT NULL,
  `material_name` varchar(64) NOT NULL,
  `material_name_en` varchar(64) DEFAULT NULL,
  `category` varchar(32) DEFAULT NULL,
  `description` varchar(512) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_series`)

-- (lens_series) from bak
CREATE TABLE IF NOT EXISTS `lens_series` (
  `series_code` varchar(8) NOT NULL,
  `series_name` varchar(32) NOT NULL,
  `series_name_en` varchar(32) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`series_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_shape`)

-- (lens_shape) from bak
CREATE TABLE IF NOT EXISTS `lens_shape` (
  `shape_code` varchar(8) NOT NULL,
  `shape_name` varchar(32) NOT NULL,
  `shape_name_en` varchar(32) NOT NULL,
  `icon` varchar(256) DEFAULT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`shape_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_standard`)

-- (lens_standard) from bak
CREATE TABLE IF NOT EXISTS `lens_standard` (
  `standard_id` varchar(36) NOT NULL,
  `external_code` varchar(16) NOT NULL,
  `internal_code` varchar(64) DEFAULT NULL,
  `shape_code` varchar(32) DEFAULT NULL,
  `series_code` varchar(32) DEFAULT NULL,
  `width` decimal(5,1) DEFAULT NULL,
  `height` decimal(5,1) DEFAULT NULL,
  `bridge_width` decimal(5,1) DEFAULT NULL,
  `circumference` decimal(6,1) DEFAULT NULL,
  `base_curve` decimal(8,1) DEFAULT NULL,
  `surface_types` json DEFAULT NULL,
  `refractive_indexes` json DEFAULT NULL,
  `lens_material_codes` json DEFAULT NULL,
  `description` text,
  `status` varchar(32) DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`standard_id`),
  UNIQUE KEY `uk_external_code` (`external_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `lens_standard_attachment`)

-- (lens_standard_attachment) from bak
CREATE TABLE IF NOT EXISTS `lens_standard_attachment` (
  `attachment_id` varchar(36) NOT NULL,
  `standard_id` varchar(36) NOT NULL,
  `file_name` varchar(256) NOT NULL,
  `file_url` varchar(512) NOT NULL,
  `file_type` varchar(32) DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_standard_id` (`standard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `member_level`)

-- (publish_package) from bak
CREATE TABLE IF NOT EXISTS `publish_package` (
  `id` varchar(36) NOT NULL,
  `task_id` varchar(36) DEFAULT NULL,
  `package_no` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `product_ids` json DEFAULT NULL,
  `platforms` json DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_package_no` (`package_no`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `report_target`)

-- (report_target) from bak
CREATE TABLE IF NOT EXISTS `report_target` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(100) NOT NULL,
  `level` varchar(32) NOT NULL,
  `scope` json DEFAULT NULL,
  `parent_id` varchar(36) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `review`)

-- (skill_key_vault) from bak
CREATE TABLE IF NOT EXISTS `skill_key_vault` (
  `id` varchar(36) NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `key_name` varchar(100) NOT NULL,
  `key_label` varchar(200) NOT NULL,
  `encrypted_value` text,
  `is_required` tinyint NOT NULL DEFAULT '0',
  `is_masked` tinyint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `skill_registry`)

-- (skill_registry) from bak
CREATE TABLE IF NOT EXISTS `skill_registry` (
  `id` varchar(36) NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `display_name` varchar(200) NOT NULL,
  `version` varchar(20) NOT NULL DEFAULT '1.0.0',
  `category` varchar(30) NOT NULL,
  `author` varchar(100) NOT NULL,
  `description` text,
  `icon` varchar(500) DEFAULT NULL,
  `entrypoint` varchar(200) NOT NULL,
  `runtime` varchar(20) NOT NULL DEFAULT 'node18',
  `pricing_model` varchar(20) NOT NULL DEFAULT 'free',
  `pricing_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `pricing_period` varchar(10) DEFAULT NULL,
  `kb_refs` json DEFAULT NULL,
  `mirror_refs` json DEFAULT NULL,
  `permissions` json NOT NULL,
  `dependencies` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `auto_upgrade` varchar(10) NOT NULL DEFAULT 'prompt',
  `installed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_run_at` timestamp NULL DEFAULT NULL,
  `run_count` int NOT NULL DEFAULT '0',
  `error_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_skill_name` (`skill_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `sku_effect_recommend`)

-- (spec_template) from bak
CREATE TABLE IF NOT EXISTS `spec_template` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(32) NOT NULL COMMENT 'lens/fabric/material',
  `params_schema` json DEFAULT NULL COMMENT '参数定义 JSON Schema',
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_type` (`type`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_compatibility`)

-- (structure_material) from bak
CREATE TABLE IF NOT EXISTS `structure_material` (
  `material_code` varchar(16) NOT NULL,
  `material_name` varchar(64) NOT NULL,
  `material_name_en` varchar(64) DEFAULT NULL,
  `category` varchar(32) DEFAULT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_series`)

-- (structure_series) from bak
CREATE TABLE IF NOT EXISTS `structure_series` (
  `series_code` varchar(8) NOT NULL,
  `series_name` varchar(32) NOT NULL,
  `series_name_en` varchar(32) NOT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`series_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_shape`)

-- (structure_shape) from bak
CREATE TABLE IF NOT EXISTS `structure_shape` (
  `shape_code` varchar(8) NOT NULL,
  `shape_name` varchar(32) NOT NULL,
  `shape_name_en` varchar(32) NOT NULL,
  `icon` varchar(256) DEFAULT NULL,
  `description` varchar(512) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`shape_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (first-time-only: `structure_standard`)

-- (system_module_registry) from bak
CREATE TABLE IF NOT EXISTS `system_module_registry` (
  `id` varchar(36) NOT NULL,
  `module_name` varchar(100) NOT NULL,
  `module_type` varchar(50) NOT NULL,
  `version` varchar(20) NOT NULL DEFAULT '0.0.0',
  `status` varchar(32) NOT NULL DEFAULT 'registered',
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

-- (sys_model_key) · Core Entity 对齐
CREATE TABLE IF NOT EXISTS `sys_model_key` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `provider_code` varchar(32) NOT NULL COMMENT 'Provider编码',
  `agent_code` varchar(64) NOT NULL DEFAULT 'global' COMMENT 'Agent编码',
  `label` varchar(64) DEFAULT NULL COMMENT '标签',
  `api_key_enc` text NOT NULL COMMENT 'AES-256-GCM密文',
  `iv` varchar(48) NOT NULL COMMENT '初始化向量',
  `auth_tag` varchar(48) NOT NULL COMMENT '认证标签',
  `base_url` varchar(256) DEFAULT NULL COMMENT '覆盖Provider默认baseUrl',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_provider_agent` (`provider_code`, `agent_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Provider级别API Key';

-- (sys_model_key_models) · Core Entity 对齐
CREATE TABLE IF NOT EXISTS `sys_model_key_models` (
  `key_id` varchar(36) NOT NULL COMMENT '密钥ID',
  `registry_id` varchar(36) NOT NULL COMMENT '模型注册ID',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否默认模型',
  PRIMARY KEY (`key_id`, `registry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Key关联模型';

-- (sys_model_registry) · Core Entity 对齐
CREATE TABLE IF NOT EXISTS `sys_model_registry` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `provider_code` varchar(32) NOT NULL COMMENT 'Provider编码',
  `model_code` varchar(64) NOT NULL COMMENT '模型编码',
  `model_name` varchar(64) NOT NULL COMMENT '模型显示名',
  `category` enum('TEXT','VISION','IMAGE','VIDEO') NOT NULL COMMENT '模型类别',
  `context_window` int NOT NULL DEFAULT 0 COMMENT '上下文窗口',
  `max_tokens` int NOT NULL DEFAULT 0 COMMENT '最大输出token',
  `supports_reasoning` tinyint(1) NOT NULL DEFAULT 0 COMMENT '支持推理',
  `supports_streaming` tinyint(1) NOT NULL DEFAULT 1 COMMENT '支持流式',
  `supports_tools` tinyint(1) NOT NULL DEFAULT 1 COMMENT '支持工具调用',
  `cost_input` decimal(12,6) NOT NULL DEFAULT 0 COMMENT '输入成本/单位',
  `cost_output` decimal(12,6) NOT NULL DEFAULT 0 COMMENT '输出成本/单位',
  `cost_unit` varchar(10) NOT NULL DEFAULT '1M' COMMENT '计费单位',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否Provider默认',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_provider` (`provider_code`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型注册中心';

-- (sys_model_provider) · Core Entity 对齐
CREATE TABLE IF NOT EXISTS `sys_model_provider` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `providerCode` varchar(32) NOT NULL COMMENT 'Provider编码',
  `providerName` varchar(64) NOT NULL COMMENT 'Provider显示名',
  `baseUrl` varchar(256) NOT NULL COMMENT 'API endpoint',
  `apiType` varchar(20) NOT NULL DEFAULT 'openai' COMMENT 'API类型',
  `description` varchar(256) DEFAULT NULL COMMENT '描述',
  `iconUrl` varchar(256) DEFAULT NULL COMMENT '图标URL',
  `isBuiltin` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否内置',
  `isEnabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_providerCode` (`providerCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型提供方';

-- (sys_token_usage) · Core Entity 对齐
CREATE TABLE IF NOT EXISTS `sys_token_usage` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `agentCode` varchar(64) NOT NULL COMMENT 'Agent编码',
  `modelCode` varchar(64) NOT NULL COMMENT '模型编码',
  `providerCode` varchar(32) NOT NULL COMMENT 'Provider编码',
  `inputTokens` int NOT NULL DEFAULT 0 COMMENT '输入token',
  `outputTokens` int NOT NULL DEFAULT 0 COMMENT '输出token',
  `totalTokens` int NOT NULL DEFAULT 0 COMMENT '总token',
  `costInput` decimal(12,6) NOT NULL DEFAULT 0 COMMENT '输入成本',
  `costOutput` decimal(12,6) NOT NULL DEFAULT 0 COMMENT '输出成本',
  `costTotal` decimal(12,6) NOT NULL DEFAULT 0 COMMENT '总成本',
  `taskId` varchar(36) DEFAULT NULL COMMENT '关联Task',
  `chatSessionId` varchar(36) DEFAULT NULL COMMENT '关联ChatSession',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_agent_time` (`agentCode`, `createdAt`),
  INDEX `idx_provider_time` (`providerCode`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token用量追踪';

-- (sys_model_connection_log) · Core Entity 对齐
CREATE TABLE IF NOT EXISTS `sys_model_connection_log` (
  `id` varchar(36) NOT NULL COMMENT 'UUID主键',
  `modelRegistryId` varchar(36) NOT NULL COMMENT '模型注册ID',
  `status` enum('ok','timeout','auth_error','network_error','unknown') NOT NULL COMMENT '状态',
  `latencyMs` int DEFAULT NULL COMMENT '延迟毫秒',
  `errorMessage` varchar(500) DEFAULT NULL COMMENT '错误消息',
  `testedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '测试时间',
  PRIMARY KEY (`id`),
  INDEX `idx_registry` (`modelRegistryId`),
  INDEX `idx_tested` (`testedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型连接测试日志';

