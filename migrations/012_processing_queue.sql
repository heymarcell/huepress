-- Processing Queue for background asset generation
-- Jobs are inserted by Worker, processed by Container

CREATE TABLE IF NOT EXISTS processing_queue (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'generate_all',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Index for fast queue polling
CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created ON processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_asset ON processing_queue(asset_id);
