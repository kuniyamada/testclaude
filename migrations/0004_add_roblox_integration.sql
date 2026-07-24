-- Roblox連携用カラム追加
ALTER TABLE users ADD COLUMN roblox_user_id TEXT;
ALTER TABLE users ADD COLUMN roblox_username TEXT;
ALTER TABLE users ADD COLUMN roblox_linked_at DATETIME;

-- Roblox連携ログ
CREATE TABLE IF NOT EXISTS roblox_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  roblox_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_roblox ON users(roblox_user_id);
CREATE INDEX IF NOT EXISTS idx_roblox_events_user ON roblox_events(user_id);
CREATE INDEX IF NOT EXISTS idx_roblox_events_roblox ON roblox_events(roblox_user_id);
