-- Blog Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT, -- Short summary for SEO and Cards
  content TEXT NOT NULL, -- The Markdown body
  cover_image TEXT, -- URL to image in R2 or external
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  author_id TEXT, -- Optional: Link to specific admin user
  published_at TEXT, -- ISO Date string
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
