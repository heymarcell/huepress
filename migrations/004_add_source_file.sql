-- Migration: Add r2_key_source column to assets table
ALTER TABLE assets ADD COLUMN r2_key_source TEXT;
