-- [PERF] Add missing indexes for frequent lookup columns

-- Optimize: WHERE skill = ?
CREATE INDEX IF NOT EXISTS idx_assets_skill ON assets(skill);

-- Optimize: WHERE asset_id = ? (HP-XXXX)
CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_id);

-- Optimize: WHERE slug = ?
CREATE INDEX IF NOT EXISTS idx_assets_slug ON assets(slug);
