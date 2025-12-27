-- Migration: 010_add_missing_categories.sql
-- Add missing categories from docs/first_500.json

-- Food & Drinks
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('cat-food-drinks', 'Food & Drinks', 'category', 'food-and-drinks', 'Delicious meals, snacks, and beverages', 9);

-- People
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('cat-people', 'People', 'category', 'people', 'Family, friends, and community helpers', 10);

-- Patterns
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('cat-patterns', 'Patterns', 'category', 'patterns', 'Repeating designs and mosaics', 11);

-- Pop Culture
INSERT OR IGNORE INTO tags (id, name, type, slug, description, display_order) VALUES
  ('cat-pop-culture', 'Pop Culture', 'category', 'pop-culture', 'Themes inspired by modern trends and fun characters', 12);
