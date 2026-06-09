-- 为 dict_payment_scene 和 dict_logistics_trace_type 添加 sort_order 列
-- 修复字典常量加载失败问题
-- 执行时间: 2026-04-20 16:36

ALTER TABLE dict_payment_scene ADD COLUMN sort_order INT DEFAULT 0 AFTER is_active;
ALTER TABLE dict_logistics_trace_type ADD COLUMN sort_order INT DEFAULT 0 AFTER is_active;

-- 设置排序值
UPDATE dict_payment_scene SET sort_order = CASE code 
    WHEN 'order_pay' THEN 1 
    WHEN 'proxy_pay' THEN 2 
    WHEN 'refund' THEN 3 
    WHEN 'deposit' THEN 4 
END;

UPDATE dict_logistics_trace_type SET sort_order = CASE code 
    WHEN 'pickup' THEN 1 
    WHEN 'in_transit' THEN 2 
    WHEN 'arrived' THEN 3 
    WHEN 'delivering' THEN 4 
    WHEN 'delivered' THEN 5 
    WHEN 'rejected' THEN 6 
    WHEN 'returned' THEN 7 
END;
