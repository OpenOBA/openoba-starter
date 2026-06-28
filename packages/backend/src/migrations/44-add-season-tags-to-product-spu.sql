-- ============================================
-- Migration 44: 商品 SPU 表新增「适用季节」字段
-- 日期: 2026-07-04
-- 说明: 新增 season_tags JSON 列，存储季节标签数组
--       如 ["春季","夏季","秋季","冬季","四季通用"]
-- ============================================

ALTER TABLE product_spu
ADD COLUMN season_tags JSON NULL COMMENT '适用季节'
AFTER scene_tags;
