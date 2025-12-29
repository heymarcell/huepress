-- Create FTS5 virtual table for efficient text search
-- We include columns that are frequently searched: title, description, tags, category
CREATE VIRTUAL TABLE IF NOT EXISTS assets_fts USING fts5(
    id UNINDEXED, -- Keep reference to original ID
    title, 
    description, 
    tags, 
    category,
    tokenize='porter' -- Use porter stemmer for better matching (e.g. "coloring" matches "color")
);

-- Triggers to keep FTS table in sync with main assets table

-- INSERT Trigger
CREATE TRIGGER IF NOT EXISTS assets_ai AFTER INSERT ON assets BEGIN
  INSERT INTO assets_fts(id, title, description, tags, category) 
  VALUES (new.id, new.title, new.description, new.tags, new.category);
END;

-- DELETE Trigger
CREATE TRIGGER IF NOT EXISTS assets_ad AFTER DELETE ON assets BEGIN
  DELETE FROM assets_fts WHERE id = old.id;
END;

-- UPDATE Trigger
CREATE TRIGGER IF NOT EXISTS assets_au AFTER UPDATE ON assets BEGIN
  DELETE FROM assets_fts WHERE id = old.id;
  INSERT INTO assets_fts(id, title, description, tags, category) 
  VALUES (new.id, new.title, new.description, new.tags, new.category);
END;

-- Populate FTS table with existing data
INSERT INTO assets_fts(id, title, description, tags, category)
SELECT id, title, description, tags, category FROM assets;
