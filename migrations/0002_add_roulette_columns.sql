-- ルーレット機能用のカラム追加
ALTER TABLE thanks ADD COLUMN bonus_multiplier REAL DEFAULT 1.0;
ALTER TABLE thanks ADD COLUMN final_points INTEGER DEFAULT 10;
