-- Optimization: Composite indexes for filtered + sorted queries
-- This allows SQLite to scan directly in the correct order without a separate sort step.

-- For queries like: WHERE category = ? AND status = 'published' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_assets_category_composite ON assets(category, status, created_at DESC);

-- For queries like: WHERE skill = ? AND status = 'published' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_assets_skill_composite ON assets(skill, status, created_at DESC);

-- For queries like: WHERE status = 'published' ORDER BY created_at DESC (Homepage/Recent)
CREATE INDEX IF NOT EXISTS idx_assets_status_created ON assets(status, created_at DESC);

-- For queries like: WHERE user_id = ? ORDER BY downloaded_at DESC (User History)
CREATE INDEX IF NOT EXISTS idx_downloads_user_composite ON downloads(user_id, downloaded_at DESC);

-- For queries like: WHERE user_id = ? ORDER BY created_at DESC (User Likes)
CREATE INDEX IF NOT EXISTS idx_likes_user_composite ON likes(user_id, created_at DESC);
