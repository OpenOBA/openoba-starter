-- ============================================
-- OpenOBA 1.1.0 · 模型管理体系 · 建表
-- 执行步骤: Step 1
-- ============================================

-- 1. 模型提供方
CREATE TABLE IF NOT EXISTS sys_model_provider (
  id             VARCHAR(36) PRIMARY KEY,
  provider_code  VARCHAR(32) NOT NULL UNIQUE COMMENT 'deepseek|qwen|openai|kling|custom-xxx|openoba',
  provider_name  VARCHAR(64) NOT NULL COMMENT '显示名',
  base_url       VARCHAR(256) NOT NULL COMMENT 'API endpoint',
  api_type       VARCHAR(20) DEFAULT 'openai' COMMENT 'openai-completions|openai-images|custom',
  description    VARCHAR(256),
  icon_url       VARCHAR(256),
  is_builtin     TINYINT(1) DEFAULT 0 COMMENT '0=自定义 1=内置',
  is_enabled     TINYINT(1) DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 模型注册中心（核心表）
CREATE TABLE IF NOT EXISTS sys_model_registry (
  id                VARCHAR(36) PRIMARY KEY,
  provider_code     VARCHAR(32) NOT NULL COMMENT 'FK → sys_model_provider',
  model_code        VARCHAR(64) NOT NULL COMMENT 'deepseek-v4-pro|qwen-plus|dall-e-3',
  model_name        VARCHAR(64) NOT NULL COMMENT '显示名',
  category          ENUM('TEXT','VISION','IMAGE','VIDEO') NOT NULL COMMENT '模型类别',

  -- 连接配置 (AES-256-GCM)
  api_key_enc       TEXT NOT NULL,
  iv                VARCHAR(48) NOT NULL,
  auth_tag          VARCHAR(48) NOT NULL,

  -- 能力参数
  context_window    INT DEFAULT 0,
  max_tokens        INT DEFAULT 0,
  supports_reasoning TINYINT(1) DEFAULT 0,
  supports_streaming TINYINT(1) DEFAULT 1,
  supports_tools    TINYINT(1) DEFAULT 1,

  -- 计费
  cost_input        DECIMAL(12,6) DEFAULT 0 COMMENT '每百万token',
  cost_output       DECIMAL(12,6) DEFAULT 0,
  cost_unit         VARCHAR(10) DEFAULT '1M' COMMENT '1M|per_image|per_second',

  -- 绑定
  agent_code        VARCHAR(64) DEFAULT 'global' COMMENT 'global=共享, 可绑定Agent',
  is_default        TINYINT(1) DEFAULT 0,
  is_enabled        TINYINT(1) DEFAULT 1,

  -- 连接状态
  last_test_at      DATETIME,
  last_test_status  VARCHAR(20) COMMENT 'ok|timeout|auth_error|network_error',

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_model (provider_code, model_code, agent_code),
  INDEX idx_category (category),
  INDEX idx_agent (agent_code),
  INDEX idx_provider (provider_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Token 用量追踪
CREATE TABLE IF NOT EXISTS sys_token_usage (
  id              VARCHAR(36) PRIMARY KEY,
  agent_code      VARCHAR(64) NOT NULL,
  model_code      VARCHAR(64) NOT NULL,
  provider_code   VARCHAR(32) NOT NULL,
  input_tokens    INT DEFAULT 0,
  output_tokens   INT DEFAULT 0,
  total_tokens    INT DEFAULT 0,
  cost_input      DECIMAL(12,6) DEFAULT 0,
  cost_output     DECIMAL(12,6) DEFAULT 0,
  cost_total      DECIMAL(12,6) DEFAULT 0,
  task_id         VARCHAR(36),
  chat_session_id VARCHAR(36),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_agent_date (agent_code, created_at),
  INDEX idx_provider_date (provider_code, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 连接测试日志
CREATE TABLE IF NOT EXISTS sys_model_connection_log (
  id                VARCHAR(36) PRIMARY KEY,
  model_registry_id VARCHAR(36) NOT NULL,
  status            ENUM('ok','timeout','auth_error','network_error','unknown') NOT NULL,
  latency_ms        INT,
  error_message     VARCHAR(500),
  tested_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_registry (model_registry_id),
  INDEX idx_tested (tested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
