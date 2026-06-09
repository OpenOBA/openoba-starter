-- ============================================
-- Migration 40: ERDL 孤儿表清理
-- ============================================
-- 依据：ER-OS-代码基线深度审计报告-V2.0-DSv4.md P2-2
-- 日期：2026-05-04
-- 作者：唐浩然
--
-- 说明：Migration 35 创建的 4 张表（erdl_rule_definition, erdl_knowledge_source,
--       erdl_agent_capability, erdl_schema_cache）在 TypeScript 代码中无对应 Entity
--       文件，是孤儿表。其功能已被 Migration 36 的议会协议表替代：
--         - erdl_rule_definition → erdl_rule_record（不可变规则）
--         - erdl_agent_capability → erdl_proposal（能力通过提案注册）
--         - erdl_knowledge_source → ERDL 文件中的 knowledgeBases 定义
--         - erdl_schema_cache → ERDLSchemaGenerator（运行时生成）

-- 选择：删除孤儿表，保持代码和数据库一致。如需恢复，从迁移历史重新执行即可。

DROP TABLE IF EXISTS `erdl_schema_cache`;
DROP TABLE IF EXISTS `erdl_agent_capability`;
DROP TABLE IF EXISTS `erdl_knowledge_source`;
DROP TABLE IF EXISTS `erdl_rule_definition`;
