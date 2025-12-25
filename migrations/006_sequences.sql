-- Migration: Add sequence counter table for non-reusable asset IDs
-- This table stores counters that only ever increment

CREATE TABLE IF NOT EXISTS sequences (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

-- Initialize the asset_id counter with the current max value
INSERT OR IGNORE INTO sequences (name, value)
SELECT 'asset_id', COALESCE(MAX(CAST(asset_id AS INTEGER)), 0)
FROM assets
WHERE length(asset_id) = 5 AND asset_id GLOB '[0-9][0-9][0-9][0-9][0-9]';
