-- MySQL dump 10.13  Distrib 9.6.0, for Win64 (x86_64)
--
-- Host: localhost    Database: openoba_starter
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '8ea537d9-3654-11f1-8c8c-b48655f53e17:1-19296';

--
-- Table structure for table `product_spu`
--

DROP TABLE IF EXISTS `product_spu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_spu` (
  `spu_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `spu_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SPU编码',
  `spu_name` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'spu 名称',
  `structure_standard_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '结构标准锚点（裸框=兼容标准，眼镜=内置标准）',
  `product_tier` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品层级',
  `series_code` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '系列编码',
  `gender` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unisex' COMMENT '款式：female=女款, male=男款, unisex=中性, limited=限量',
  `scene_tags` json DEFAULT NULL COMMENT '场景标签',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `main_image` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '主图URL',
  `images` json DEFAULT NULL COMMENT '图片列表JSON',
  `attributes` json DEFAULT NULL COMMENT '扩展属性JSON',
  `compatibility_levels` json DEFAULT NULL COMMENT '兼容等级列表',
  `status` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '状态',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `is_deleted` tinyint NOT NULL DEFAULT '0',
  `category_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`spu_id`),
  UNIQUE KEY `IDX_e0ba5939b57a953fb4504e733c` (`spu_code`),
  KEY `FK_b401e458471c73bc19d7dfbca71` (`category_id`),
  CONSTRAINT `FK_b401e458471c73bc19d7dfbca71` FOREIGN KEY (`category_id`) REFERENCES `product_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_spu`
--

LOCK TABLES `product_spu` WRITE;
/*!40000 ALTER TABLE `product_spu` DISABLE KEYS */;
INSERT INTO `product_spu` VALUES ('1d2e6fff-dde0-48df-a6f9-93989d4de0b3','S5248-WEL-0001','秒镜 S5248 · 威灵顿框时尚系列','S5248-163-19-200C','color','FSH','female','[\"职场\", \"约会\", \"拍照\", \"派对\", \"休闲\"]',NULL,NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-04-29 05:32:37.000000','2026-06-28 15:47:03.481669',0,'00db6851-670e-492c-8414-41c427e541a6'),('5d127730-ba10-4933-9d8d-467e58afa207','S5344-RND-0001','秒镜 S5344 · 圆框经典系列','S5344-159-19-200C','style','CLS','female','[\"通勤\", \"职场\", \"拍照\", \"约会\"]',NULL,NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-04-29 13:50:48.000000','2026-06-28 15:47:07.446645',0,'00db6851-670e-492c-8414-41c427e541a6'),('66c133fd-7753-4de2-a87a-38c314be29a5','MJS5445-SQR-0001','秒镜 SS5445-SQR · 方框时尚系列','S5445-SQR-164-20-200C','texture','FSH','male','\"通勤,职场,约会,休闲\"','枪灰色方框男士眼镜，线条利落修饰方脸，中性百搭不挑肤色。通勤约会休闲全场景适用。',NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-06-19 15:27:11.596266','2026-06-28 15:47:10.279219',0,'00db6851-670e-492c-8414-41c427e541a6'),('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d','MJS5145-RND-0001','秒镜 SS5145-RND · 圆框经典系列','S5145-RND-159-19-200C','color','CLS','female','[\"约会\", \"运动\", \"旅行\"]',NULL,NULL,NULL,'{\"season\": \"春夏\", \"seasonCode\": \"spring_summer\"}',NULL,'on_sale','2026-06-07 16:22:52.000000','2026-06-28 15:47:13.275699',0,'00db6851-670e-492c-8414-41c427e541a6'),('e245f113-597d-49ee-a85b-14ab992958c0','MJS4237-SQR-0001','秒镜 SS4237-SQR · 方框时尚系列','S4237-SQR-130-17-200C','style','FSH','female','[\"通勤\", \"约会\", \"旅行\"]',NULL,NULL,NULL,NULL,NULL,'on_sale','2026-06-19 15:26:42.948581','2026-06-19 15:26:42.948581',0,'00db6851-670e-492c-8414-41c427e541a6'),('spu-demo-001','S5145-BRC-0001','秒镜 SS5145-RND · 圆框系列','S5145-RND-159-19-200C','color','S5145','female','[\"office\", \"casual\", \"trendy\"]','经典眉线框设计，上缘加粗勾勒眉形，下缘无边框轻盈通透。适合职场女性的日常百搭款，显气质不显老气。镜腿采用β钛合金，仅重16g，全天佩戴无压感。',NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-06-28 13:35:18.675729','2026-06-28 15:47:15.278849',0,'00db6851-670e-492c-8414-41c427e541a6'),('spu-demo-002','S4534-CAT-0001','秒镜 SS4534-CAT · 猫眼系列','S4534-CAT-131-17-200C','style','S4534','female','[\"vintage\", \"party\", \"fashion\"]','50年代复古猫眼设计，上扬的眼角线条自带气场。搭配金属镜腿与醋酸纤维前框，完美平衡复古与现代。配赠防蓝光镜片，看屏不累眼。',NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-06-28 13:35:18.675729','2026-06-28 15:47:17.695938',0,'00db6851-670e-492c-8414-41c427e541a6'),('spu-demo-003','S5442-AVI-0001','秒镜 SS5442-OVL · 椭圆框系列','S5442-OVL-159-20-200C','texture','S5442','male','[\"outdoor\", \"sports\", \"driving\"]','经典飞行员框型，大镜片带来超宽视野。TR90 镜架极轻且耐冲击，配备偏光镜片，有效过滤路面眩光。户外驾驶、钓鱼、骑行首选。',NULL,NULL,'{\"season\": \"春夏\", \"seasonCode\": \"spring_summer\"}',NULL,'on_sale','2026-06-28 13:35:18.675729','2026-06-28 15:47:19.582507',0,'00db6851-670e-492c-8414-41c427e541a6'),('spu-demo-004','S4238-RND-0001','秒镜 SS4238-RND · 圆框系列','S4238-RND-132-17-200C','light-luxury','S4238','unisex','[\"vintage\", \"artsy\", \"daily\"]','致敬约翰·列侬的经典小圆框，纯钛镜架手工打磨，每一副都是独立编号。搭配蔡司定制镜片，既是眼镜也是态度。文艺青年的不二之选。',NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-06-28 13:35:18.675729','2026-06-28 15:47:21.531394',0,'00db6851-670e-492c-8414-41c427e541a6'),('spu-demo-005','S5043-SQR-0001','秒镜 SS5043-SQR · 方框系列','S5043-SQR-153-18-200C','color','S5043','male','[\"business\", \"formal\", \"daily\"]','为商务人士打造的经典方框，线条利落不凌厉。哑光枪灰配色低调高级，搭配渐进多焦点镜片，看近看远一副解决。',NULL,NULL,'{\"season\": \"四季通用\", \"seasonCode\": \"all\"}',NULL,'on_sale','2026-06-28 13:35:18.675729','2026-06-28 15:47:23.580142',0,'00db6851-670e-492c-8414-41c427e541a6');
/*!40000 ALTER TABLE `product_spu` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-28 16:57:51
