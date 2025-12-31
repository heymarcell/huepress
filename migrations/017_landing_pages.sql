-- Landing Pages for Programmatic SEO
CREATE TABLE IF NOT EXISTS landing_pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- e.g. "coloring-pages-for-anxiety"
  target_keyword TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  intro_content TEXT, -- AI written markdown content
  asset_ids TEXT NOT NULL, -- JSON string of asset IDs: ["id1", "id2"]
  is_published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_keyword ON landing_pages(target_keyword);
