-- Fix FK: product_sku.color_code should reference dict_sku_color.color_code (business code), not color_id (UUID)
-- Run this in the openoba_starter database

ALTER TABLE `product_sku` DROP FOREIGN KEY `FK_9d879ce06c38770c2424390465c`;
ALTER TABLE `product_sku` ADD CONSTRAINT `FK_product_sku_color_code` 
  FOREIGN KEY (`color_code`) REFERENCES `dict_sku_color`(`color_code`);
