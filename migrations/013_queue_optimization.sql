-- Optimization for Queue Polling
-- The worker frequently polls for 'pending' jobs sorted by 'created_at'.
-- A composite index satisfies both the WHERE and ORDER BY clauses, avoiding sort operations.

CREATE INDEX IF NOT EXISTS idx_queue_polling ON processing_queue(status, created_at);
