-- RT-04 路 3 涓己澶卞瓧鍏歌〃
-- 鏉ユ簮锛歞ict.service.ts 鐧藉悕鍗曚腑鏈変絾鏁版嵁搴撲腑缂哄け
-- 鎵ц锛歯pm run start:backend 鍚庣敱 MySQL 鐩存帴瀵煎叆

CREATE TABLE IF NOT EXISTS dict_referral_source (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO dict_referral_source (code, name, sort_order) VALUES
('xiaohongshu', '灏忕孩涔?, 1),
('douyin', '鎶栭煶', 2),
('referral', '鏈嬪弸鎺ㄨ崘', 3),
('website', '瀹樼綉', 4),
('offline', '绾夸笅闂ㄥ簵', 5),
('other', '鍏朵粬', 6);

CREATE TABLE IF NOT EXISTS dict_subscription_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO dict_subscription_status (code, name, sort_order) VALUES
('none', '鏈闃?, 1),
('active', '宸茶闃?, 2),
('expired', '宸茶繃鏈?, 3);

CREATE TABLE IF NOT EXISTS dict_contact_role (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO dict_contact_role (code, name, sort_order) VALUES
('primary', '涓昏鑱旂郴浜?, 1),
('billing', '璐㈠姟瀵规帴', 2),
('shipping', '鏀惰揣鑱旂郴浜?, 3),
('tech', '鎶€鏈鎺?, 4),
('other', '鍏朵粬', 5);
