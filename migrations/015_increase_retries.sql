-- Increase max_attempts default to 5 in existing records
-- New records are handled by updated logic in admin.ts
UPDATE processing_queue SET max_attempts = 5;

-- Reset failed/stuck 3-attempt jobs to give them a chance with new system (sequential processing)
UPDATE processing_queue 
SET status = 'pending', attempts = 0, started_at = NULL, error_message = NULL 
WHERE (status = 'failed' OR status = 'processing') AND attempts >= 3;
