-- 秒镜科技 · ERDL 数据库 Migration
-- 文件: 35-create-erdl-tables.sql
-- 作者: 唐浩然
-- 日期: 2026-05-01
-- 描述: 创建 ERDL 核心数据表（规则定义 / 知识源 / Agent 能力 / Schema 缓存）

-- ============================================
-- ERDL 规则定义表
-- ============================================
CREATE TABLE IF NOT EXISTS erdl_rule_definition (
  id VARCHAR(36) PRIMARY KEY COMMENT '规则唯一标识 (UUID)',
  name VARCHAR(128) NOT NULL COMMENT '规则名称',
  namespace VARCHAR(128) NOT NULL DEFAULT 'com.miaojing' COMMENT '命名空间',
  entity VARCHAR(64) NOT NULL COMMENT '关联实体类型 (如 ProductSku)',
  trigger_type VARCHAR(64) COMMENT '触发类型 (如 Product.price.calculate)',
  priority INT NOT NULL DEFAULT 100 COMMENT '优先级 (数字越小优先级越高)',
  tier VARCHAR(32) NOT NULL DEFAULT 'policy' COMMENT '层级: validation/policy',
  condition_json JSON NOT NULL COMMENT '条件体 (RuleConditionGroup JSON)',
  actions_json JSON NOT NULL COMMENT '动作体 (RuleAction[] JSON)',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否激活',
  version INT NOT NULL DEFAULT 1 COMMENT '版本号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  INDEX idx_entity (entity),
  INDEX idx_namespace (namespace),
  INDEX idx_trigger (trigger_type),
  INDEX idx_active_priority (is_active, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERDL 规则定义表';

-- ============================================
-- ERDL 知识源定义表
-- ============================================
CREATE TABLE IF NOT EXISTS erdl_knowledge_source (
  id VARCHAR(36) PRIMARY KEY COMMENT '知识源唯一标识 (UUID)',
  source_name VARCHAR(128) NOT NULL COMMENT '知识源名称',
  source_type ENUM('STRUCTURED', 'FILE', 'API') NOT NULL COMMENT '类型',
  source_config JSON NOT NULL COMMENT '源配置 (路径/端点/格式等)',
  entity_type VARCHAR(64) COMMENT '关联实体类型',
  namespace VARCHAR(128) NOT NULL DEFAULT 'com.miaojing' COMMENT '命名空间',
  category VARCHAR(64) COMMENT '分类 (product/customer/order/faq)',
  description VARCHAR(512) COMMENT '知识源描述',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  INDEX idx_entity (entity_type),
  INDEX idx_category (category),
  INDEX idx_namespace (namespace)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERDL 知识源定义表';

-- ============================================
-- ERDL Agent 能力注册表
-- ============================================
CREATE TABLE IF NOT EXISTS erdl_agent_capability (
  id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识 (UUID)',
  capability_id VARCHAR(128) NOT NULL UNIQUE COMMENT '能力唯一标识',
  tool_name VARCHAR(128) NOT NULL COMMENT 'MCP 工具名',
  agent_name VARCHAR(128) COMMENT '所属 Agent 名称',
  namespace VARCHAR(128) NOT NULL DEFAULT 'com.miaojing' COMMENT '命名空间',
  entity_type VARCHAR(64) COMMENT '关联实体类型',
  knowledge_bases JSON COMMENT '关联知识库列表',
  permissions JSON COMMENT '权限定义 (canRead/canWrite)',
  description VARCHAR(512) COMMENT '能力描述',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否激活',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  INDEX idx_capability (capability_id),
  INDEX idx_namespace (namespace),
  INDEX idx_agent (agent_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERDL Agent 能力注册表';

-- ============================================
-- ERDL Schema 缓存表
-- ============================================
CREATE TABLE IF NOT EXISTS erdl_schema_cache (
  id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识 (UUID)',
  namespace VARCHAR(128) NOT NULL COMMENT '命名空间',
  entity_name VARCHAR(64) NOT NULL COMMENT 'Entity 名称',
  schema_json JSON NOT NULL COMMENT '表单 Schema JSON',
  version INT NOT NULL DEFAULT 1 COMMENT '版本号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  UNIQUE KEY uk_ns_entity (namespace, entity_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ERDL Schema 缓存表';

-- ============================================
-- 种子数据：示例知识源
-- ============================================
INSERT INTO erdl_knowledge_source (id, source_name, source_type, source_config, entity_type, namespace, category, description) VALUES
('ks-001-product-knowledge', '商品热销知识', 'STRUCTURED', '{"query": "SELECT spu_name, avg_sales FROM product_stats WHERE days=30 ORDER BY avg_sales DESC LIMIT 20"}', 'Product', 'com.miaojing.eyewear', 'product', '近30天热销商品排名'),
('ks-002-effect-thesaurus', '效果词知识库', 'STRUCTURED', '{"endpoint": "/api/dict-effect-tags"}', 'DictEffectTag', 'com.miaojing.eyewear', 'product', '肤色效果词与脸型效果词库'),
('ks-003-faq', 'FAQ 知识库', 'STRUCTURED', '{"query": "SELECT question, answer FROM faq WHERE is_active=1"}', NULL, 'com.miaojing.eyewear', 'faq', '常见问题 FAQ');
