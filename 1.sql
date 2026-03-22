CREATE TABLE user_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  practice_credits INTEGER NOT NULL DEFAULT 5,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  has_claimed_signup_bonus INTEGER NOT NULL DEFAULT 0,
  last_daily_bonus_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);

CREATE TABLE game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  game_mode TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  prize_won INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  time_taken INTEGER,
  is_win INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_history_user_id ON game_history(user_id);