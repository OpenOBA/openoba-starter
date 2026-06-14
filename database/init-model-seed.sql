-- ============================================
-- OpenOBA 1.1.0 · 种子数据 — Provider + 模型
-- 执行步骤: Step 2
-- ============================================

-- 3 个内置 Provider
INSERT IGNORE INTO sys_model_provider (id, provider_code, provider_name, base_url, api_type, description, is_builtin, is_enabled)
VALUES
  (UUID(), 'deepseek', 'DeepSeek', 'https://api.deepseek.com', 'openai', '深度求索', 1, 1),
  (UUID(), 'qwen',     'Qwen / 阿里云百炼', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'openai', '通义千问', 1, 1),
  (UUID(), 'openai',   'OpenAI', 'https://api.openai.com/v1', 'openai', 'GPT 系列', 1, 1);

-- DeepSeek 模型 (TEXT, 2个)
INSERT IGNORE INTO sys_model_registry (id, provider_code, model_code, model_name, category, api_key_enc, iv, auth_tag, context_window, max_tokens, supports_reasoning, is_default, is_enabled)
VALUES
  (UUID(), 'deepseek', 'deepseek-v4-pro',   'DeepSeek V4 Pro',   'TEXT', '', '', '', 1000000, 384000, 1, 1, 1),
  (UUID(), 'deepseek', 'deepseek-v4-flash', 'DeepSeek V4 Flash', 'TEXT', '', '', '', 1000000, 384000, 0, 0, 1);

-- Qwen 模型 (TEXT, 4个)
INSERT IGNORE INTO sys_model_registry (id, provider_code, model_code, model_name, category, api_key_enc, iv, auth_tag, context_window, max_tokens, supports_reasoning, is_default, is_enabled)
VALUES
  (UUID(), 'qwen', 'qwen3.6-plus', 'Qwen 3.6 Plus', 'TEXT', '', '', '', 131072, 8192, 1, 1, 1),
  (UUID(), 'qwen', 'qwen-plus',  'Qwen Plus',  'TEXT', '', '', '', 131072, 8192, 0, 0, 1),
  (UUID(), 'qwen', 'qwen-max',   'Qwen Max',   'TEXT', '', '', '', 32768,  8192, 0, 0, 1),
  (UUID(), 'qwen', 'qwen-turbo', 'Qwen Turbo', 'TEXT', '', '', '', 131072, 8192, 0, 0, 1);

-- OpenAI 模型 (TEXT, 2个)
INSERT IGNORE INTO sys_model_registry (id, provider_code, model_code, model_name, category, api_key_enc, iv, auth_tag, context_window, max_tokens, supports_reasoning, is_default, is_enabled)
VALUES
  (UUID(), 'openai', 'gpt-4o',       'GPT-4o',       'TEXT', '', '', '', 128000, 16384, 0, 1, 1),
  (UUID(), 'openai', 'gpt-4o-mini',  'GPT-4o Mini',  'TEXT', '', '', '', 128000, 16384, 0, 0, 1);

-- P1-1 D1: GLM / MiniMax / Kimi 补充（与 erdl-llm-providers.js 硬编码对齐）

INSERT IGNORE INTO sys_model_provider (id, provider_code, provider_name, base_url, api_type, description, is_builtin, is_enabled)
VALUES
  (UUID(), 'glm',     'GLM / 智谱',   'https://open.bigmodel.cn/api/paas/v4', 'openai', '智谱清言', 1, 1),
  (UUID(), 'minimax', 'MiniMax',      'https://api.minimax.chat/v1',           'openai', 'MiniMax / 海螺', 1, 1),
  (UUID(), 'kimi',    'Kimi',         'https://api.moonshot.cn/v1',            'openai', '月之暗面', 1, 1);

-- GLM 模型 (TEXT, 2个)
INSERT IGNORE INTO sys_model_registry (id, provider_code, model_code, model_name, category, api_key_enc, iv, auth_tag, context_window, max_tokens, supports_reasoning, is_default, is_enabled)
VALUES
  (UUID(), 'glm', 'glm-4.7',  'GLM 4.7',  'TEXT', '', '', '', 128000, 8192, 0, 1, 1),
  (UUID(), 'glm', 'glm-5.1',  'GLM 5.1',  'TEXT', '', '', '', 1000000, 8192, 1, 0, 1);

-- MiniMax 模型 (TEXT, 1个)
INSERT IGNORE INTO sys_model_registry (id, provider_code, model_code, model_name, category, api_key_enc, iv, auth_tag, context_window, max_tokens, supports_reasoning, is_default, is_enabled)
VALUES
  (UUID(), 'minimax', 'minimax-m3', 'MiniMax M3', 'TEXT', '', '', '', 1000000, 8192, 0, 1, 1);

-- Kimi 模型 (TEXT, 1个)
INSERT IGNORE INTO sys_model_registry (id, provider_code, model_code, model_name, category, api_key_enc, iv, auth_tag, context_window, max_tokens, supports_reasoning, is_default, is_enabled)
VALUES
  (UUID(), 'kimi', 'moonshot-auto', 'Kimi (auto)', 'TEXT', '', '', '', 128000, 8192, 0, 1, 1);
