-- Migration: Add processed_stripe_events table for webhook idempotency
-- Prevents duplicate processing when Stripe retries webhook delivery

CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for quick lookup by event_id
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_event_id ON processed_stripe_events(event_id);

-- Index for cleanup queries (old events can be pruned)
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at ON processed_stripe_events(processed_at);
