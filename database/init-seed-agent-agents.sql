-- OpenOBA 1.1.0 · 初始化 Agent（仅 MainAgent）
-- 执行时间: 2026-06-06
-- 其余 Agent 由用户通过 UI 自行创建

INSERT IGNORE INTO sys_agent_manifest (agent_id, agent_code, agent_name, agent_type, security_clearance, capabilities_json, status, created_at, updated_at)
VALUES (UUID(), 'main-agent', 'OpenOBA Main', 'main', 'L4', '{}', 'active', NOW(), NOW());
