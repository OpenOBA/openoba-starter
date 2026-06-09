-- ============================================
-- Migration: lens → structure 命名一致性统一
-- 
-- 背景：结构标准库原名为"镜片标准库"，后更名为"结构标准库"
-- 但 DB 中的字典表名仍使用 lens_ 前缀。
-- 本次 migration 将三个字典表重命名为 structure_ 前缀。
-- 
-- 表名变更：
--   lens_shape    → structure_shape
--   lens_series   → structure_series
--   lens_material → structure_material
-- 
-- 涉及的代码（已修改）：
--   dict-constants.ts, dict.service.ts, dict.controller.ts,
--   structure.service.ts, naming-engine.ts, naming-engine.ts
-- 
-- 不影响（保留 lens 作商品名）：
--   CustomerLens, OrderItem.lens_status, barcode spec
-- ============================================

-- 重命名字典表
RENAME TABLE lens_shape TO structure_shape;
RENAME TABLE lens_series TO structure_series;
RENAME TABLE lens_material TO structure_material;
