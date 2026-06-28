SET NAMES utf8mb4;

-- ============================================
-- V1.5.1 DB Migration: season_tags 字段
-- 回滚: ALTER TABLE product_spu DROP COLUMN season_tags;
-- ============================================

-- Step 1: 新增 season_tags JSON 列
ALTER TABLE product_spu
ADD COLUMN season_tags JSON NULL COMMENT '适用季节'
AFTER scene_tags;

-- Step 2: 从 attributes JSON 迁移季节数据到 season_tags 列
UPDATE product_spu
SET season_tags = JSON_EXTRACT(attributes, '$.season')
WHERE JSON_EXTRACT(attributes, '$.season') IS NOT NULL;

-- Step 3: 验证
SELECT spu_code, season_tags, attributes
FROM product_spu
WHERE season_tags IS NOT NULL
ORDER BY spu_code
LIMIT 12;

SELECT 'Migration complete' AS status;
