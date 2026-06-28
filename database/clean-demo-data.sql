SET NAMES utf8mb4;

DELETE FROM order_item WHERE item_id LIKE 'orditem-demo-%';
DELETE FROM `order` WHERE order_id LIKE 'ord-demo-%';
DELETE FROM customer_address WHERE address_id LIKE 'addr-demo-%';
DELETE FROM customer WHERE customer_id LIKE 'cust-demo-%';
DELETE FROM inventory_transaction WHERE id LIKE 'invtx-demo-%';
DELETE FROM inventory WHERE id LIKE 'inv-demo-%';
DELETE FROM product_sku WHERE sku_id LIKE 'sku-demo-%';
DELETE FROM product_spu WHERE spu_id LIKE 'spu-demo-%';
DELETE FROM agent_task WHERE id LIKE 'task-demo-%';
DELETE FROM cognitive_log WHERE id LIKE 'cog-demo-%';

SELECT 'Data cleaned.' AS status;
