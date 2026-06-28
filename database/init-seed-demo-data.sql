-- ============================================
-- OpenOBA 官网截图用 · 演示种子数据
-- 目标：丰富商品/库存/客户/订单/任务数据，让官网截图不空洞
-- 执行：mysql -u root -p openoba_starter < init-seed-demo-data.sql
-- 合规声明：所有数据均为虚构，不含真实个人信息
-- ============================================

SET NAMES utf8mb4;

-- ════════════════════════════════════════════
-- Part 1: 补充商品 SPU（+4 个，新增眉线框 BRC / 猫眼 CAT / 雷朋风 AVI / 复古圆框）
-- ════════════════════════════════════════════

INSERT IGNORE INTO product_spu (spu_id, spu_code, spu_name, structure_standard_code, product_tier, series_code, gender, scene_tags, description, status) VALUES

-- 眉线框（BRC）· 女款 · 色彩级
('spu-demo-001', 'S5145-BRC-0001', '秒镜 S5145 · 眉线框经典系列',
 'S5145-RND-159-19-200C', 'color', 'S5145', 'female',
 JSON_ARRAY('office','casual','trendy'),
 '经典眉线框设计，上缘加粗勾勒眉形，下缘无边框轻盈通透。适合职场女性的日常百搭款，显气质不显老气。镜腿采用β钛合金，仅重16g，全天佩戴无压感。',
 'on_sale'),

-- 猫眼框（CAT）· 女款 · 风格级
('spu-demo-002', 'S4534-CAT-0001', '秒镜 S4534 · 猫眼框复古系列',
 'S4534-CAT-131-17-200C', 'style', 'S4534', 'female',
 JSON_ARRAY('vintage','party','fashion'),
 '50年代复古猫眼设计，上扬的眼角线条自带气场。搭配金属镜腿与醋酸纤维前框，完美平衡复古与现代。配赠防蓝光镜片，看屏不累眼。',
 'on_sale'),

-- 飞行员框（AVI）· 男款 · 质感级
('spu-demo-003', 'S5442-AVI-0001', '秒镜 S5442 · 飞行员框探险系列',
 'S5442-OVL-159-20-200C', 'texture', 'S5442', 'male',
 JSON_ARRAY('outdoor','sports','driving'),
 '经典飞行员框型，大镜片带来超宽视野。TR90 镜架极轻且耐冲击，配备偏光镜片，有效过滤路面眩光。户外驾驶、钓鱼、骑行首选。',
 'on_sale'),

-- 复古圆框（RND）· 中性款 · 轻奢级
('spu-demo-004', 'S4238-RND-0001', '秒镜 S4238 · 约翰列侬复古圆框',
 'S4238-RND-132-17-200C', 'light-luxury', 'S4238', 'unisex',
 JSON_ARRAY('vintage','artsy','daily'),
 '致敬约翰·列侬的经典小圆框，纯钛镜架手工打磨，每一副都是独立编号。搭配蔡司定制镜片，既是眼镜也是态度。文艺青年的不二之选。',
 'on_sale'),

-- 大方框（SQR）· 男款 · 色彩级 · 补一个不同系列的
('spu-demo-005', 'S5043-SQR-0001', '秒镜 S5043 · 商务方框精英系列',
 'S5043-SQR-153-18-200C', 'color', 'S5043', 'male',
 JSON_ARRAY('business','formal','daily'),
 '为商务人士打造的经典方框，线条利落不凌厉。哑光枪灰配色低调高级，搭配渐进多焦点镜片，看近看远一副解决。',
 'on_sale');

-- ════════════════════════════════════════════
-- Part 2: 补充商品 SKU（每个 SPU 配 2-3 个 SKU，不同颜色）
-- ════════════════════════════════════════════

INSERT IGNORE INTO product_sku (sku_id, sku_code, spu_id, sku_name, color_code, structure_standard_code, product_tier, retail_price, cost_price, stock_quantity, warning_quantity, status, frame_type, frame_material, weight_g, suitable_face_shapes, uv_protection) VALUES

-- S5145-BRC 眉线框 SKU（3 个颜色）
('sku-demo-001a', 'S5145-BRC-0001-001', 'spu-demo-001', '秒镜 S5145 · 冷白皮显嫩 · 圆脸显瘦 · 经典黑 · 眉线框 · 女款',
 'classic_black', 'S5145-RND-159-19-200C', 'color', 329.00, 120.00, 85, 10, 'active', 'full-rim', 'acetate', 16.0, '["round","oval"]', 'UV400'),
('sku-demo-001b', 'S5145-BRC-0001-002', 'spu-demo-001', '秒镜 S5145 · 暖黄皮显白 · 方脸柔和 · 琥珀棕 · 眉线框 · 女款',
 'amber', 'S5145-RND-159-19-200C', 'color', 329.00, 120.00, 60, 10, 'active', 'full-rim', 'acetate', 16.0, '["square","diamond"]', 'UV400'),
('sku-demo-001c', 'S5145-BRC-0001-003', 'spu-demo-001', '秒镜 S5145 · 所有肤色友好 · 百搭银灰 · 眉线框 · 女款',
 'silver_gray', 'S5145-RND-159-19-200C', 'color', 299.00, 110.00, 40, 10, 'active', 'full-rim', 'acetate', 16.0, '["round","oval","heart"]', 'UV400'),

-- S4534-CAT 猫眼框 SKU（2 个颜色）
('sku-demo-002a', 'S4534-CAT-0001-001', 'spu-demo-002', '秒镜 S4534 · 冷白皮惊艳 · 心形脸绝配 · 豆沙粉 · 猫眼框 · 女款',
 'dusty_rose', 'S4534-CAT-131-17-200C', 'style', 399.00, 150.00, 50, 10, 'active', 'full-rim', 'acetate', 18.0, '["heart","oval"]', 'UV400'),
('sku-demo-002b', 'S4534-CAT-0001-002', 'spu-demo-002', '秒镜 S4534 · 派对女王 · 所有脸型 · 薰衣草紫 · 猫眼框 · 女款',
 'lavender_deep', 'S4534-CAT-131-17-200C', 'style', 399.00, 150.00, 30, 8, 'active', 'full-rim', 'acetate', 18.0, '["heart","oval","round"]', 'UV400'),

-- S5442-AVI 飞行员框 SKU（2 个颜色）
('sku-demo-003a', 'S5442-AVI-0001-001', 'spu-demo-003', '秒镜 S5442 · 户外运动 · 方形脸显瘦 · 枪灰 · 飞行员框 · 男款',
 'gunmetal', 'S5442-OVL-159-20-200C', 'texture', 459.00, 180.00, 70, 10, 'active', 'full-rim', 'TR90', 22.0, '["square","rectangle","diamond"]', 'UV400'),
('sku-demo-003b', 'S5442-AVI-0001-002', 'spu-demo-003', '秒镜 S5442 · 驾驶首选 · 圆形脸修饰 · 宝蓝 · 飞行员框 · 男款',
 'royal_blue', 'S5442-OVL-159-20-200C', 'texture', 459.00, 180.00, 45, 10, 'active', 'full-rim', 'TR90', 22.0, '["round","oval"]', 'UV400'),

-- S4238-RND 复古圆框 SKU（2 个颜色）
('sku-demo-004a', 'S4238-RND-0001-001', 'spu-demo-004', '秒镜 S4238 · 文艺范 · 方脸柔和 · 焦糖色 · 复古圆框 · 中性',
 'caramel', 'S4238-RND-132-17-200C', 'light-luxury', 699.00, 280.00, 25, 5, 'active', 'full-rim', 'pure-titanium', 12.0, '["square","diamond","rectangle"]', 'UV400'),
('sku-demo-004b', 'S4238-RND-0001-002', 'spu-demo-004', '秒镜 S4238 · 知性优雅 · 圆脸显瘦 · 雾霾蓝 · 复古圆框 · 中性',
 'misty_blue', 'S4238-RND-132-17-200C', 'light-luxury', 699.00, 280.00, 20, 5, 'active', 'full-rim', 'pure-titanium', 12.0, '["round","oval","heart"]', 'UV400'),

-- S5043-SQR 商务方框 SKU（2 个颜色）
('sku-demo-005a', 'S5043-SQR-0001-001', 'spu-demo-005', '秒镜 S5043 · 商务精英 · 方脸修饰 · 枪灰 · 商务方框 · 男款',
 'gunmetal', 'S5043-SQR-153-18-200C', 'color', 359.00, 130.00, 55, 10, 'active', 'full-rim', 'titanium-alloy', 19.0, '["square","rectangle","diamond"]', 'UV400'),
('sku-demo-005b', 'S5043-SQR-0001-002', 'spu-demo-005', '秒镜 S5043 · 年轻有为 · 圆脸显瘦 · 经典黑 · 商务方框 · 男款',
 'classic_black', 'S5043-SQR-153-18-200C', 'color', 329.00, 120.00, 80, 10, 'active', 'full-rim', 'titanium-alloy', 19.0, '["round","oval","heart"]', 'UV400');

-- ════════════════════════════════════════════
-- Part 3: 补充库存记录（为新 SKU 创建库存，含流水）
-- ════════════════════════════════════════════

INSERT IGNORE INTO inventory (id, sku_id, sku_code, structure_standard_code, warehouse_code, current_quantity, available_quantity, locked_quantity, warning_quantity) VALUES
('inv-demo-001a', 'sku-demo-001a', 'S5145-BRC-0001-001', 'S5145-RND-159-19-200C', 'WH-MAIN', 85, 85, 0, 10),
('inv-demo-001b', 'sku-demo-001b', 'S5145-BRC-0001-002', 'S5145-RND-159-19-200C', 'WH-MAIN', 60, 60, 0, 10),
('inv-demo-001c', 'sku-demo-001c', 'S5145-BRC-0001-003', 'S5145-RND-159-19-200C', 'WH-MAIN', 40, 40, 0, 10),
('inv-demo-002a', 'sku-demo-002a', 'S4534-CAT-0001-001', 'S4534-CAT-131-17-200C', 'WH-MAIN', 50, 50, 0, 10),
('inv-demo-002b', 'sku-demo-002b', 'S4534-CAT-0001-002', 'S4534-CAT-131-17-200C', 'WH-MAIN', 30, 30, 0, 8),
('inv-demo-003a', 'sku-demo-003a', 'S5442-AVI-0001-001', 'S5442-OVL-159-20-200C', 'WH-MAIN', 70, 70, 0, 10),
('inv-demo-003b', 'sku-demo-003b', 'S5442-AVI-0001-002', 'S5442-OVL-159-20-200C', 'WH-MAIN', 45, 45, 0, 10),
('inv-demo-004a', 'sku-demo-004a', 'S4238-RND-0001-001', 'S4238-RND-132-17-200C', 'WH-MAIN', 25, 25, 0, 5),
('inv-demo-004b', 'sku-demo-004b', 'S4238-RND-0001-002', 'S4238-RND-132-17-200C', 'WH-MAIN', 20, 20, 0, 5),
('inv-demo-005a', 'sku-demo-005a', 'S5043-SQR-0001-001', 'S5043-SQR-153-18-200C', 'WH-MAIN', 55, 55, 0, 10),
('inv-demo-005b', 'sku-demo-005b', 'S5043-SQR-0001-002', 'S5043-SQR-153-18-200C', 'WH-MAIN', 80, 80, 0, 10);

-- 库存流水（入库记录）
INSERT IGNORE INTO inventory_transaction (id, sku_id, sku_code, structure_standard_code, warehouse_code, transaction_type, quantity, quantity_before, quantity_after, reference_type, operator_id, remark) VALUES
('invtx-demo-001a', 'sku-demo-001a', 'S5145-BRC-0001-001', 'S5145-RND-159-19-200C', 'WH-MAIN', 'stock_in', 100, 0, 100, 'purchase', 'a0000001-0001-0001-0001-000000000001', '首批采购入库 - 眉线框经典黑'),
('invtx-demo-001b', 'sku-demo-001b', 'S5145-BRC-0001-002', 'S5145-RND-159-19-200C', 'WH-MAIN', 'stock_in', 80, 0, 80, 'purchase', 'a0000001-0001-0001-0001-000000000001', '首批采购入库 - 眉线框琥珀棕'),
('invtx-demo-002a', 'sku-demo-002a', 'S4534-CAT-0001-001', 'S4534-CAT-131-17-200C', 'WH-MAIN', 'stock_in', 60, 0, 60, 'purchase', 'a0000001-0001-0001-0001-000000000001', '首批采购入库 - 猫眼框豆沙粉'),
('invtx-demo-003a', 'sku-demo-003a', 'S5442-AVI-0001-001', 'S5442-OVL-159-20-200C', 'WH-MAIN', 'stock_in', 80, 0, 80, 'purchase', 'a0000001-0001-0001-0001-000000000001', '首批采购入库 - 飞行员框枪灰'),
('invtx-demo-004a', 'sku-demo-004a', 'S4238-RND-0001-001', 'S4238-RND-132-17-200C', 'WH-MAIN', 'stock_in', 30, 0, 30, 'purchase', 'a0000001-0001-0001-0001-000000000001', '首批采购入库 - 复古圆框焦糖色'),
('invtx-demo-005a', 'sku-demo-005a', 'S5043-SQR-0001-001', 'S5043-SQR-153-18-200C', 'WH-MAIN', 'stock_in', 60, 0, 60, 'purchase', 'a0000001-0001-0001-0001-000000000001', '首批采购入库 - 商务方框枪灰');

-- 模拟销售出库流水（基于现有订单）
INSERT IGNORE INTO inventory_transaction (id, sku_id, sku_code, structure_standard_code, warehouse_code, transaction_type, quantity, quantity_before, quantity_after, reference_type, reference_id, operator_id, remark) VALUES
('invtx-demo-sale01', '28c23c84-3169-4bfd-b221-ddffc5539c60', 'S5440-GEN-0001-001', 'S5145-RND-159-19-200C', 'WH-MAIN', 'stock_out', 1, 100, 99, 'order', '840e6279-a16b-4730-88e1-981cfc400adf', 'a0000001-0001-0001-0001-000000000001', '订单 MJ-20260425-0001 出库'),
('invtx-demo-sale02', '2cb4cf70-74de-448d-9943-eedfff0bbfd1', 'S5248-WEL-0001-001', 'S5248-163-19-200C', 'WH-MAIN', 'stock_out', 1, 100, 99, 'order', 'a3c8b5cf-4f82-4866-a503-785565225979', 'a0000001-0001-0001-0001-000000000001', '订单 MJ-20260502-0001 出库');

-- ════════════════════════════════════════════
-- Part 4: 补充客户（+3 个，让客户列表更丰富）
-- ════════════════════════════════════════════

INSERT IGNORE INTO customer (customer_id, customer_code, customer_type, customer_level, company_name, contact_name, phone, email, wechat, address, city, province, subscription_status, member_discount_rate, points_balance, total_orders, total_amount, status, referral_source, preferred_style, notes) VALUES

-- 批发客户
('cust-demo-001', 'MJ-BUS-000002', 'business', 'gold', '深圳视界光学科技有限公司', '陈建华', '13922887766', 'jhchen@shijie-optics.cn', 'jhchen_wx', '深圳市龙华区民治街道星河World大厦A座12层', '深圳市', '广东省', 'active', 0.85, 3500, 8, 15600.00, 'active', 'exhibition', 'business', '2025深圳眼镜展合作客户，月均采购额约4000元，主要拿眉线框和圆框系列'),

-- 零售高价值客户
('cust-demo-002', 'MJ-CUS-000222', 'retail', 'vip', NULL, '林小雨', '18675551234', 'xiaoyu.lin@gmail.com', 'linxy_designer', '深圳市南山区粤海街道科技园南区A3栋', '深圳市', '广东省', 'subscribed', 0.90, 8200, 12, 4580.00, 'active', 'friend', 'cat-eye', '资深UI设计师，对眼镜美学要求极高。偏好猫眼框和小圆框，每次上新都会第一时间购买。已推荐3位同事成为客户。'),

-- 合作伙伴
('cust-demo-003', 'MJ-PTN-000002', 'partner', 'normal', '杭州明朗眼镜连锁', '赵志远', '15988887777', 'zzy@minglang-eyewear.com', 'zzy_minglang', '杭州市西湖区文三路478号华星时代广场', '杭州市', '浙江省', 'active', 0.88, 12000, 25, 32500.00, 'active', 'agent', 'all', '杭州地区代理商，覆盖5家门店。核心售卖方框和飞行员框，终端客户以25-40岁男性为主。');

-- ════════════════════════════════════════════
-- Part 5: 补充客户地址（给新客户）
-- ════════════════════════════════════════════

INSERT IGNORE INTO customer_address (address_id, customer_id, province, city, district, detail_address, receiver_name, receiver_phone, is_default) VALUES
('addr-demo-001', 'cust-demo-001', '广东省', '深圳市', '龙华区', '民治街道星河World大厦A座12层', '陈建华', '13922887766', 1),
('addr-demo-002', 'cust-demo-002', '广东省', '深圳市', '南山区', '粤海街道科技园南区A3栋1502', '林小雨', '18675551234', 1),
('addr-demo-003', 'cust-demo-003', '浙江省', '杭州市', '西湖区', '文三路478号华星时代广场8层', '赵志远', '15988887777', 1);

-- ════════════════════════════════════════════
-- Part 6: 补充订单（为新客户创建 + 不同状态丰富度）
-- ════════════════════════════════════════════

INSERT IGNORE INTO `order` (order_id, order_no, customer_id, customer_name, customer_phone, customer_type, order_type, status, payment_method, payment_status, total_amount, discount_amount, shipping_fee, actual_amount, total_retail_price, source, remark, created_at) VALUES

-- 林小雨的订单（已完成 + 待发货）
('ord-demo-001', 'MJ-20260601-0001', 'cust-demo-002', '林小雨', '18675551234', 'retail', 'retail', 'completed', 'wechat_pay', 'paid', 399.00, 0.00, 0.00, 399.00, 399.00, 'manual', '猫眼框豆沙粉，自取', '2026-06-01 10:30:00'),
('ord-demo-002', 'MJ-20260615-0001', 'cust-demo-002', '林小雨', '18675551234', 'retail', 'retail', 'paid', 'alipay', 'paid', 699.00, 0.00, 0.00, 699.00, 699.00, 'manual', '复古圆框焦糖色 备货中', '2026-06-15 15:20:00'),

-- 陈建华批发订单
('ord-demo-003', 'MJ-20260605-0001', 'cust-demo-001', '陈建华', '13922887766', 'business', 'wholesale', 'shipped', 'bank_transfer', 'paid', 4800.00, 200.00, 50.00, 4650.00, 4800.00, 'manual', '批发眉线框×10 商务方框×5 已发货顺丰', '2026-06-05 09:00:00'),

-- 赵志远代理商订单
('ord-demo-004', 'MJ-20260610-0001', 'cust-demo-003', '赵志远', '15988887777', 'partner', 'wholesale', 'completed', 'bank_transfer', 'paid', 8900.00, 500.00, 120.00, 8520.00, 8900.00, 'manual', '月度补货 飞行员框×15 猫眼框×10', '2026-06-10 11:00:00'),

-- 艾青新增订单（待处理）
('ord-demo-005', 'MJ-20260620-0001', 'cust-1776860519358-a0fv', '艾青', '13520013001', 'retail', 'retail', 'pending', NULL, 'unpaid', 329.00, 0.00, 0.00, 329.00, 329.00, 'manual', '眉线框经典黑 待确认颜色', '2026-06-20 16:45:00'),

-- 李丽新增订单（已付款待发货）
('ord-demo-006', 'MJ-20260622-0001', 'cust-1776861102494-y5dm', '李丽', '13656982235', 'partner', 'retail', 'paid', 'wechat_pay', 'paid', 758.00, 0.00, 0.00, 758.00, 758.00, 'manual', '猫眼框薰衣草紫+眉线框琥珀棕', '2026-06-22 14:10:00');

-- ════════════════════════════════════════════
-- Part 7: 补充订单项（order_item）
-- ════════════════════════════════════════════

INSERT IGNORE INTO order_item (item_id, order_id, product_type, product_id, product_name, sku_code, quantity, unit_price, retail_price, subtotal, structure_standard_code, product_tier) VALUES
('orditem-demo-001', 'ord-demo-001', 'sku', 'sku-demo-002a', '秒镜 S4534 · 冷白皮惊艳 · 心形脸绝配 · 豆沙粉 · 猫眼框 · 女款', 'S4534-CAT-0001-001', 1, 399.00, 399.00, 399.00, 'S4534-CAT-131-17-200C', 'style'),
('orditem-demo-002', 'ord-demo-002', 'sku', 'sku-demo-004a', '秒镜 S4238 · 文艺范 · 方脸柔和 · 焦糖色 · 复古圆框 · 中性', 'S4238-RND-0001-001', 1, 699.00, 699.00, 699.00, 'S4238-RND-132-17-200C', 'light-luxury'),
('orditem-demo-003a', 'ord-demo-003', 'sku', 'sku-demo-001a', '秒镜 S5145 · 冷白皮显嫩 · 圆脸显瘦 · 经典黑 · 眉线框 · 女款', 'S5145-BRC-0001-001', 10, 300.00, 329.00, 3000.00, 'S5145-RND-159-19-200C', 'color'),
('orditem-demo-003b', 'ord-demo-003', 'sku', 'sku-demo-005a', '秒镜 S5043 · 商务精英 · 方脸修饰 · 枪灰 · 商务方框 · 男款', 'S5043-SQR-0001-001', 5, 360.00, 359.00, 1800.00, 'S5043-SQR-153-18-200C', 'color'),
('orditem-demo-004a', 'ord-demo-004', 'sku', 'sku-demo-003a', '秒镜 S5442 · 户外运动 · 方形脸显瘦 · 枪灰 · 飞行员框 · 男款', 'S5442-AVI-0001-001', 15, 380.00, 459.00, 5700.00, 'S5442-OVL-159-20-200C', 'texture'),
('orditem-demo-004b', 'ord-demo-004', 'sku', 'sku-demo-002b', '秒镜 S4534 · 派对女王 · 所有脸型 · 薰衣草紫 · 猫眼框 · 女款', 'S4534-CAT-0001-002', 10, 320.00, 399.00, 3200.00, 'S4534-CAT-131-17-200C', 'style'),
('orditem-demo-005', 'ord-demo-005', 'sku', 'sku-demo-001b', '秒镜 S5145 · 暖黄皮显白 · 方脸柔和 · 琥珀棕 · 眉线框 · 女款', 'S5145-BRC-0001-002', 1, 329.00, 329.00, 329.00, 'S5145-RND-159-19-200C', 'color'),
('orditem-demo-006a', 'ord-demo-006', 'sku', 'sku-demo-002b', '秒镜 S4534 · 派对女王 · 所有脸型 · 薰衣草紫 · 猫眼框 · 女款', 'S4534-CAT-0001-002', 1, 399.00, 399.00, 399.00, 'S4534-CAT-131-17-200C', 'style'),
('orditem-demo-006b', 'ord-demo-006', 'sku', 'sku-demo-001c', '秒镜 S5145 · 所有肤色友好 · 百搭银灰 · 眉线框 · 女款', 'S5145-BRC-0001-003', 1, 299.00, 299.00, 299.00, 'S5145-RND-159-19-200C', 'color');

-- ════════════════════════════════════════════
-- Part 8: 补充 Agent Task（任务看板用）
-- ════════════════════════════════════════════

INSERT IGNORE INTO agent_task (id, task_no, title, type, created_by, report_to, status, current_phase, total_phases, report_frequency, context, agent_id, created_at, updated_at) VALUES

-- 已完成：创建眉线框 SPU
('task-demo-001', 'TASK-20260601-001', '创建新款眉线框 SPU 并上架', 'product_creation',
 'a0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
 'completed', 4, 4, 'every_step',
 '{"user_request":"创建一款眉线框女款SPU，命名为秒镜 S5145 眉线框经典系列，配经典黑/琥珀棕/银灰三个颜色","result":"已创建SPU S5145-BRC-0001，3个SKU，库存总计185副","steps":[{"phase":1,"action":"查询现有眉线框品类","result":"无眉线框SPU，为新品类"},{"phase":2,"action":"选择结构标准","result":"选用S5145-RND-159-19-200C"},{"phase":3,"action":"创建SPU+3色SKU","result":"SPU+S5145-BRC-0001-001/002/003已创建"},{"phase":4,"action":"录入库存+设置上架状态","result":"库存185副，状态已设on_sale"}]}',
 'main-agent', '2026-06-01 09:00:00', '2026-06-01 09:03:00'),

-- 已完成：批量入库
('task-demo-002', 'TASK-20260602-001', '新品首批采购入库：眉线框+猫眼框+飞行员框', 'inventory_in',
 'a0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
 'completed', 2, 2, 'per_phase',
 '{"user_request":"将新到的眉线框100副、猫眼框60副、飞行员框80副录入库存","result":"3项SKU库存已更新，入库流水已记录","steps":[{"phase":1,"action":"验证SKU编码并生成入库单","result":"确认S5145-BRC/S4534-CAT/S5442-AVI对应SKU"},{"phase":2,"action":"执行入库并更新库存","result":"库存已更新，生成入库流水invtx-demo-xxx"}]}',
 'main-agent', '2026-06-02 14:00:00', '2026-06-02 14:02:00'),

-- 已完成：客户分析报告
('task-demo-003', 'TASK-20260603-001', '生成6月第一周销售分析报告', 'report_generation',
 'a0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
 'completed', 3, 3, 'daily_digest',
 '{"user_request":"生成6月第一周（6/1-6/7）销售分析报告，包含畅销款TOP5、客户复购率、库存预警","result":"报告已生成，可下载查看","steps":[{"phase":1,"action":"查询6/1-6/7订单数据","result":"共15笔订单,总额¥23,450"},{"phase":2,"action":"分析畅销款和客户复购","result":"TOP1:眉线框经典黑×8副;复购率:VIP客户68%"},{"phase":3,"action":"检查库存预警","result":"猫眼框豆沙粉库存<50，建议补货"}]}',
 'main-agent', '2026-06-08 10:00:00', '2026-06-08 10:04:00'),

-- 执行中：新品策划
('task-demo-004', 'TASK-20260625-001', '策划夏季新品：钛合金超轻系列', 'product_planning',
 'a0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
 'executing', 2, 4, 'every_step',
 '{"user_request":"策划一个夏季钛合金超轻系列，目标价399-599，面向25-35岁职场人群","result":null,"steps":[{"phase":1,"action":"分析夏季镜架市场趋势","result":"2026夏季关键词:超轻/透气/冷色调/可折叠"},{"phase":2,"action":"筛选结构标准","result":"进行中...选择重量<15g的结构标准"}]}',
 'main-agent', '2026-06-25 15:00:00', '2026-06-25 15:02:00'),

-- 待审批：价格调整提案
('task-demo-005', 'TASK-20260626-001', '猫眼框豆沙粉库存告急，建议调整零售价', 'price_adjustment',
 'a0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
 'proposed', 1, 3, 'on_exception',
 '{"user_request":"猫眼框豆沙粉近30天售出22副，库存仅剩28，建议零售价从¥399调至¥459","result":null,"steps":[{"phase":1,"action":"分析销售趋势和库存水平","result":"SKU S4534-CAT-0001-001售罄率78%,市场均价¥420-480,建议提价15%至¥459"}]}',
 'main-agent', '2026-06-26 11:00:00', '2026-06-26 11:01:00'),

-- 已完成：客户触达
('task-demo-006', 'TASK-20260620-001', 'VIP客户林小雨复购提醒：猫眼框新品到货', 'customer_outreach',
 'a0000001-0001-0001-0001-000000000001', 'a0000001-0001-0001-0001-000000000001',
 'completed', 2, 2, 'per_phase',
 '{"user_request":"检测到林小雨偏好猫眼框，新品S4534-CAT已到货，主动触达","result":"已通过微信发送新品推荐，客户已下单","steps":[{"phase":1,"action":"分析客户购买偏好","result":"林小雨购买记录:猫眼框×2,小圆框×1;首选豆沙粉/紫"},{"phase":2,"action":"生成个性化推荐并发送","result":"推荐猫眼框薰衣草紫，微信已送达，客户回复下单"}]}',
 'main-agent', '2026-06-20 09:00:00', '2026-06-20 09:01:00');

-- ════════════════════════════════════════════
-- Part 9: 补充认知审计日志（Cognitive Log）
-- ════════════════════════════════════════════

INSERT IGNORE INTO cognitive_log (id, log_type, source_module, source_id, level, title, content, agent_id, actor, actor_type, created_at) VALUES

('cog-demo-001', 'agent_thought', 'agent_task', 'task-demo-001', 'info', 'ReAct: 分析眉线框品类现状',
 '{"thought":"当前系统中眉线框(BRC)品类为空，这是一个新品类的创建机会。需要先确认是否有合适的结构标准。","action":"query_structure_standards","observation":"查得S5145-RND结构标准，镜宽51mm适合女款眉线框设计"}',
 'main-agent', 'main-agent', 'agent', 1717203600000),

('cog-demo-002', 'agent_action', 'agent_task', 'task-demo-001', 'info', 'Action: 创建SPU S5145-BRC-0001',
 '{"action":"create_spu","params":{"spu_code":"S5145-BRC-0001","spu_name":"秒镜 S5145 · 眉线框经典系列","structure_standard_code":"S5145-RND-159-19-200C","product_tier":"color","gender":"female"},"result":"success","spu_id":"spu-demo-001"}',
 'main-agent', 'main-agent', 'agent', 1717203620000),

('cog-demo-003', 'agent_action', 'agent_task', 'task-demo-001', 'info', 'Action: 批量创建3色SKU',
 '{"action":"batch_create_sku","params":{"spu_id":"spu-demo-001","skus":[{"color":"classic_black","price":329},{"color":"amber","price":329},{"color":"silver_gray","price":299}]},"result":"success","count":3}',
 'main-agent', 'main-agent', 'agent', 1717203640000),

('cog-demo-004', 'agent_action', 'inventory', 'invtx-demo-001a', 'info', '库存入库: 眉线框经典黑 ×100',
 '{"transaction_type":"stock_in","sku_code":"S5145-BRC-0001-001","quantity":100,"quantity_after":100,"warehouse":"WH-MAIN"}',
 'main-agent', 'a0000001-0001-0001-0001-000000000001', 'human', 1717290000000),

('cog-demo-005', 'agent_thought', 'agent_task', 'task-demo-004', 'info', 'ReAct: 夏季钛合金系列市场分析',
 '{"thought":"夏季镜架市场趋势分析：2026年三大关键词——超轻材质(钛/TR90)、冷色调(雾霾蓝/银灰/枪灰)、可折叠便携设计。25-35岁职场人群预算敏感，399-599是黄金价位带。","action":"query_structure_standards_weight","observation":"查得<15g结构标准5个，其中S4238-RND仅12g最轻"}',
 'main-agent', 'main-agent', 'agent', 1719313200000),

('cog-demo-006', 'agent_action', 'customer_outreach', 'cust-demo-002', 'info', '客户触达: 林小雨-猫眼框新品推荐',
 '{"action":"send_wechat_recommendation","customer_id":"cust-demo-002","sku_codes":["S4534-CAT-0001-002"],"message":"Hi小雨，你喜欢的猫眼框出了新色薰衣草紫，要不要来看看？","result":"delivered","customer_response":"好的！下班来试"}',
 'main-agent', 'main-agent', 'agent', 1718845200000),

('cog-demo-007', 'agent_guard', 'action_guard', 'task-demo-001', 'info', 'Guard校验: SKU创建参数校验通过',
 '{"guard":"action_guard","action":"create_sku","checks":{"spu_exists":true,"color_valid":true,"tier_valid":true,"structure_valid":true,"price_range_ok":true},"verdict":"pass"}',
 'system', 'system', 'system', 1717203630000);

-- ════════════════════════════════════════════
-- 执行完毕
-- ════════════════════════════════════════════
SELECT '=== 种子数据导入完成 ===' AS status;
SELECT COUNT(*) AS total_spu FROM product_spu;
SELECT COUNT(*) AS total_sku FROM product_sku;
SELECT COUNT(*) AS total_customer FROM customer;
SELECT COUNT(*) AS total_order FROM `order`;
SELECT COUNT(*) AS total_agent_task FROM agent_task;
SELECT COUNT(*) AS total_cognitive_log FROM cognitive_log;
