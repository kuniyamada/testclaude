-- Thanks Garden 初期スキーマ

-- 部署テーブル
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#10B981',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  daily_seeds INTEGER DEFAULT 3,
  total_points INTEGER DEFAULT 0,
  tree_level INTEGER DEFAULT 1,
  last_seed_reset DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 感謝テーブル
CREATE TABLE IF NOT EXISTS thanks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  is_cross_department INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- 月別カンパニーツリー
CREATE TABLE IF NOT EXISTS monthly_company_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL UNIQUE,
  tree_level INTEGER DEFAULT 1,
  total_thanks_count INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  cross_department_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 月別部署統計
CREATE TABLE IF NOT EXISTS monthly_department_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  thanks_sent INTEGER DEFAULT 0,
  thanks_received INTEGER DEFAULT 0,
  points_sent INTEGER DEFAULT 0,
  points_received INTEGER DEFAULT 0,
  cross_department_sent INTEGER DEFAULT 0,
  branch_level INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  UNIQUE(year_month, department_id)
);

-- 部署間ブリッジ
CREATE TABLE IF NOT EXISTS department_bridges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL,
  from_department_id INTEGER NOT NULL,
  to_department_id INTEGER NOT NULL,
  thanks_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_department_id) REFERENCES departments(id),
  FOREIGN KEY (to_department_id) REFERENCES departments(id),
  UNIQUE(year_month, from_department_id, to_department_id)
);

-- 庭の状態
CREATE TABLE IF NOT EXISTS garden_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL UNIQUE,
  garden_level INTEGER DEFAULT 1,
  garden_size INTEGER DEFAULT 3,
  tree_count INTEGER DEFAULT 0,
  flower_beds INTEGER DEFAULT 0,
  mushroom_count INTEGER DEFAULT 0,
  has_pond INTEGER DEFAULT 0,
  has_fountain INTEGER DEFAULT 0,
  has_gazebo INTEGER DEFAULT 0,
  has_building INTEGER DEFAULT 0,
  residents_count INTEGER DEFAULT 0,
  wildlife_count INTEGER DEFAULT 0,
  total_thanks_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 庭の要素
CREATE TABLE IF NOT EXISTS garden_elements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL,
  element_type TEXT NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year_month, position_x, position_y)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_thanks_sender ON thanks(sender_id);
CREATE INDEX IF NOT EXISTS idx_thanks_receiver ON thanks(receiver_id);
CREATE INDEX IF NOT EXISTS idx_thanks_created ON thanks(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_yearmonth ON monthly_department_stats(year_month);
CREATE INDEX IF NOT EXISTS idx_garden_yearmonth ON garden_state(year_month);
