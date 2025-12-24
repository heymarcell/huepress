-- SEO Enhancements Migration
-- Migration: 003_seo_enhancements.sql

-- Add new fields to assets table (without UNIQUE constraint on ALTER)
ALTER TABLE assets ADD COLUMN asset_id TEXT;
ALTER TABLE assets ADD COLUMN slug TEXT;
ALTER TABLE assets ADD COLUMN extended_description TEXT;
ALTER TABLE assets ADD COLUMN fun_facts TEXT; -- JSON array
ALTER TABLE assets ADD COLUMN suggested_activities TEXT; -- JSON array
ALTER TABLE assets ADD COLUMN coloring_tips TEXT;
ALTER TABLE assets ADD COLUMN therapeutic_benefits TEXT;
ALTER TABLE assets ADD COLUMN meta_keywords TEXT; -- Comma-separated for SEO

-- Create indexes for the new columns (ensures uniqueness checking at query time)
CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_slug ON assets(slug);

-- Tags table for structured categorization
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('category', 'theme', 'age_group', 'skill')),
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Asset-Tag junction table (no foreign keys to avoid constraint issues)
CREATE TABLE IF NOT EXISTS asset_tags (
  asset_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (asset_id, tag_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag_id);

-- Seed initial tags
-- Categories
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('cat-animals', 'Animals', 'category', 'animals', 'Wildlife, pets, and sea creatures', 1),
  ('cat-nature', 'Nature', 'category', 'nature', 'Plants, landscapes, and weather', 2),
  ('cat-vehicles', 'Vehicles', 'category', 'vehicles', 'Cars, planes, boats, and more', 3),
  ('cat-fantasy', 'Fantasy', 'category', 'fantasy', 'Unicorns, dragons, and magical creatures', 4),
  ('cat-holidays', 'Holidays', 'category', 'holidays', 'Seasonal celebrations and events', 5),
  ('cat-educational', 'Educational', 'category', 'educational', 'Letters, numbers, and shapes', 6),
  ('cat-mandalas', 'Mandalas', 'category', 'mandalas', 'Geometric patterns and designs', 7),
  ('cat-characters', 'Characters', 'category', 'characters', 'People and professions', 8);

-- Themes
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('theme-calm', 'Calm', 'theme', 'calm', 'Relaxing and therapeutic designs', 1),
  ('theme-adventurous', 'Adventurous', 'theme', 'adventurous', 'Action and exploration themes', 2),
  ('theme-educational', 'Educational', 'theme', 'educational-theme', 'Learning-focused content', 3),
  ('theme-seasonal', 'Seasonal', 'theme', 'seasonal', 'Time-specific designs', 4),
  ('theme-cute', 'Cute', 'theme', 'cute', 'Kawaii and adorable styles', 5),
  ('theme-realistic', 'Realistic', 'theme', 'realistic', 'Detailed and lifelike designs', 6);

-- Age Groups
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('age-toddler', 'Toddler (2-4)', 'age_group', 'toddler', 'Very simple shapes for tiny hands', 1),
  ('age-preschool', 'Preschool (4-6)', 'age_group', 'preschool', 'Simple designs with some detail', 2),
  ('age-elementary', 'Elementary (6-10)', 'age_group', 'elementary', 'Moderate complexity for developing skills', 3),
  ('age-tween', 'Tween+ (10+)', 'age_group', 'tween-plus', 'Detailed designs for older kids and adults', 4);

-- Skill Levels
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('skill-easy', 'Easy', 'skill', 'easy', 'Bold lines and large coloring areas', 1),
  ('skill-medium', 'Medium', 'skill', 'medium', 'Moderate detail and smaller areas', 2),
  ('skill-detailed', 'Detailed', 'skill', 'detailed', 'Fine lines and intricate patterns', 3);
