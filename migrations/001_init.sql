-- HuePress D1 Database Schema

-- Assets table (coloring pages)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  category TEXT NOT NULL,
  skill TEXT,
  r2_key_private TEXT NOT NULL,
  r2_key_public TEXT NOT NULL,
  tags TEXT, -- JSON array stored as text
  is_new INTEGER DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Users table (synced from Clerk)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  clerk_id TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'free' CHECK(subscription_status IN ('free', 'active', 'cancelled', 'past_due')),
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_ends_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Downloads tracking
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  downloaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_created ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_clerk ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
