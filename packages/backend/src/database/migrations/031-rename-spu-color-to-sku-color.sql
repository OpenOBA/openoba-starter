-- ============================================
-- Migration: dict_spu_color → dict_sku_color 命名统一
-- 
-- 背景：SPU 不管色彩，色彩只属于 SKU。
-- dict_spu_color 是历史遗留命名错误。
-- 本次改名与 lens→structure 同理，一次性改到统一。
--
-- 表名变更：
--   dict_spu_color → dict_sku_color
-- ============================================

RENAME TABLE dict_spu_color TO dict_sku_color;
