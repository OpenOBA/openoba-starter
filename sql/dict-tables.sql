-- dict_* tables for openoba_starter

CREATE TABLE `dict_after_sale_reason` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `after_sale_type_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_after_sale_status` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_audit_status` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_brand` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'third_party' COMMENT 'own/third_party',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_code_spec` (
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

CREATE TABLE `dict_compatibility_level` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_contact_role` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色编码',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认角色',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系人角色字典';

CREATE TABLE `dict_customer_level` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_customer_status` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '鐘舵?缂栫爜',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '鐘舵?鍚嶇О',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '鎻忚堪',
  `color` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'UI鏍囩?棰滆壊: success/warning/danger/info',
  `sort_order` int DEFAULT '0' COMMENT '鎺掑簭',
  `is_active` tinyint DEFAULT '1' COMMENT '鏄?惁鍚?敤',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='瀹㈡埛鐘舵?瀛楀吀';

CREATE TABLE `dict_customer_type` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_effect_tag` (
  `effect_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `effect_type` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'skin_tone / face_shape',
  `effect_name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '效果名称，如黄皮肤增白',
  `target_value` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '适用对象，如暖白皮/圆脸',
  `recommended_colors` json DEFAULT NULL COMMENT '推荐色彩代码列表',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '效果说明',
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`effect_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='效果标签字典表（供编辑界面参考）';

CREATE TABLE `dict_frame_material` (
  `material_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '?????',
  `material_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '?????',
  `material_category` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??: plastic/metal/hybrid',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '??',
  `is_active` tinyint DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `extra` json DEFAULT NULL COMMENT '??????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??????';

CREATE TABLE `dict_frame_type` (
  `type_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '?????',
  `type_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '?????',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '??',
  `is_active` tinyint DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `extra` json DEFAULT NULL COMMENT '??????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??????';

CREATE TABLE `dict_hinge` (
  `hinge_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hinge_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '?????',
  `hinge_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '?????',
  `features` json DEFAULT NULL COMMENT '????',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '??',
  `is_active` tinyint DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `extra` json DEFAULT NULL COMMENT '??????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hinge_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??????';

CREATE TABLE `dict_lens_coating` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_lens_function` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '功能名',
  `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消费者展示名',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_lens_material` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_logistics_company` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `english_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_url_template` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_logistics_status` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_logistics_trace_type` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_nose_pad` (
  `pad_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pad_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '?????',
  `pad_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '?????',
  `is_adjustable` tinyint DEFAULT '0' COMMENT '?????',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '??',
  `is_active` tinyint DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `extra` json DEFAULT NULL COMMENT '??????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`pad_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??????';

CREATE TABLE `dict_order_status` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_payment_method` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_payment_scene` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_payment_status` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_terminal` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_product_status` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????: draft/on_sale/off_sale',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???????';

CREATE TABLE `dict_product_tier` (
  `tier_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier_name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tier_desc` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `icon_color` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_product_type` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_promotion_status` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????: draft/active/paused/expired',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='???????';

CREATE TABLE `dict_referral_source` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道编码',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道名称',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `channel_group` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道分组: social/video/search/offline/partner/other',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户来源渠道字典';

CREATE TABLE `dict_refractive_index` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '技术名',
  `display_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消费者展示名',
  `value` decimal(4,2) NOT NULL COMMENT '折射率数值',
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_review_status` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_review_tag` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_sku_color` (
  `color_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name_en` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pinyin_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '中文名拼音',
  `pinyin_initial` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '拼音首字母',
  `color_family` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'solid',
  `hex_value` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pantone_ref` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pantone参考编号',
  `preview_image` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `trend_score` int DEFAULT '50',
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`color_id`),
  UNIQUE KEY `color_code` (`color_code`),
  KEY `idx_family` (`color_family`),
  KEY `idx_type` (`color_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_sku_status` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????: active/inactive/discontinued',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??',
  `sort_order` int DEFAULT '0' COMMENT '??',
  `is_active` tinyint DEFAULT '1' COMMENT '????: 1=??, 0=??',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SKU?????';

CREATE TABLE `dict_spu_color` (
  `dict_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_name_en` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pinyin_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '中文名拼音（如 "fen hong"）',
  `pinyin_initial` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '拼音首字母（如 "fh"）',
  `color_family` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT 'solid',
  `pattern_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hex_value` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pantone_ref` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Pantone 参考编号',
  `hex_values` json DEFAULT NULL,
  `swatch_image` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trend_score` decimal(3,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dict_id`),
  UNIQUE KEY `color_code` (`color_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `dict_subscription_status` (
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态编码',
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态名称',
  `description` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `color` varchar(16) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'el-tag 颜色',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅状态字典';

CREATE TABLE `dict_surface_treatment` (
  `treatment_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `treatment_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '????',
  `treatment_en` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '???',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '??',
  `is_active` tinyint DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `extra` json DEFAULT NULL COMMENT '??????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`treatment_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='??????';

CREATE TABLE `dict_unit` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
