-- Reviews table for asset ratings and testimonials
-- Migration: 002_reviews.sql

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id),
  UNIQUE(user_id, asset_id)  -- One review per user per asset
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reviews_asset ON reviews(asset_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
