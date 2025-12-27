-- Performance Indexes Migration
-- Adds composite indexes to optimize common query patterns

-- Composite index for status + created_at (common list query for assets)
CREATE INDEX IF NOT EXISTS idx_assets_status_created 
  ON assets(status, created_at DESC);

-- Index reviews for avg calculation (asset_id + rating)
CREATE INDEX IF NOT EXISTS idx_reviews_asset_rating 
  ON reviews(asset_id, rating);

-- Composite for posts list (status + published_at)
CREATE INDEX IF NOT EXISTS idx_posts_status_published 
  ON posts(status, published_at DESC);

-- Index for downloads history query (user + date ordering)
CREATE INDEX IF NOT EXISTS idx_downloads_user_date 
  ON downloads(user_id, downloaded_at DESC);
