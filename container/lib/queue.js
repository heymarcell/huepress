const { fetchWithRetry } = require('./utils');
const { generateThumbnailBuffer, generateOgBuffer, generatePdfBuffer } = require('./generators');

let thumbnailQueue, ogQueue, pdfQueue;
let isProcessingQueue = false;
const JOB_TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout per job

// Helper: Upload file via Signed URL (no token needed, signature is in URL)
// Helper: Upload file via Signed URL (no token needed, signature is in URL)
async function uploadFile(uploadUrl, buffer, contentType, authToken = null) {
  if (!uploadUrl) {
      throw new Error("Missing upload URL");
  }
  
  // The URL already contains ?key=...&sig=...&expires=...
  const res = await fetchWithRetry(uploadUrl, {
    method: 'PUT',
    headers: {
      'X-Content-Type': contentType,
      // NOTE: Do NOT send Authorization header for signed URLs as it conflicts with Clerk middleware
      // and the signature is sufficient for auth.
    },
    body: buffer
  });
  
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }
  return res;
}

// Initialize queues
async function initQueues() {
  const PQueue = (await import('p-queue')).default; // Dynamic import for ESM
  
  thumbnailQueue = new PQueue({ concurrency: 1 });
  ogQueue = new PQueue({ concurrency: 1 });
  pdfQueue = new PQueue({ concurrency: 1 });
  
  console.log('[Queue] Processing queues initialized (concurrency: 1 each - Manual batching uses concurrency: 2)');
  
  // Monitor
  setInterval(() => {
    if (!thumbnailQueue) return;
    const pending = thumbnailQueue.pending + ogQueue.pending + pdfQueue.pending;
    const size = thumbnailQueue.size + ogQueue.size + pdfQueue.size;
    if (pending > 0 || size > 0) {
      console.log(`[Queue] Status - Thumb: ${thumbnailQueue.size}, OG: ${ogQueue.size}, PDF: ${pdfQueue.size}`);
    }
  }, 10000);
}

// Wait helper
async function waitForQueues() {
  while (!thumbnailQueue || !ogQueue || !pdfQueue) {
    await new Promise(r => setTimeout(r, 100));
  }
}

// Process Queue
async function processQueue() {
  if (isProcessingQueue) {
    console.log('[Queue] Already processing, skipping');
    return;
  }
  
  isProcessingQueue = true;
  console.log('[Queue] Starting queue processing...');
  
  try {
    const apiUrl = process.env.API_URL || 'https://api.huepress.co';
    // Get token for fetching pending jobs
    let internalToken = process.env.INTERNAL_API_TOKEN;
    
    if (!internalToken) {
      console.error('[Queue] INTERNAL_API_TOKEN not set');
      return;
    }
    
    // Fetch pending jobs
    const jobsRes = await fetchWithRetry(`${apiUrl}/api/internal/queue/pending`, {
      headers: { 'Authorization': `Bearer ${internalToken}` }
    });
    
    if (!jobsRes.ok) {
        console.error(`[Queue] Failed to fetch jobs: ${jobsRes.status}`);
        return;
    }
    
    const { jobs: rawJobs } = await jobsRes.json();
    // Randomize job order to prevent race conditions (409s)
    const jobs = (rawJobs || []).sort(() => Math.random() - 0.5);
    console.log(`[Queue] Found ${jobs.length} pending jobs`);
    
    // Ensure queues are ready
    if (!thumbnailQueue) await initQueues();

    // Use a local queue for this batch to limit concurrency
    const PQueue = (await import('p-queue')).default;
    const jobBatchQueue = new PQueue({ concurrency: 2 });

    const processJob = async (job) => {
      try {
        const memUsage = process.memoryUsage();
        const rss = (memUsage.rss / 1024 / 1024).toFixed(2);
        const heap = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        console.log(`[Queue] Processing job ${job.id} for asset ${job.asset_id} (RSS: ${rss}MB, Heap: ${heap}MB)`);
        
        // Refresh token in case it rotated during processing
        internalToken = process.env.INTERNAL_API_TOKEN;

        // Mark Processing
        const statusRes = await fetchWithRetry(`${apiUrl}/api/internal/queue/${job.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'processing' })
        });
        
        if (!statusRes.ok) throw new Error(`Failed to set processing status: ${statusRes.status}`);
        
        // Fetch Asset Data (SVG Content)
        // We still use the API to get the SVG content as we haven't implemented Signed GETs for source yet 
        // (and it's a read, so token auth is acceptable/safe)
        const assetRes = await fetchWithRetry(`${apiUrl}/api/internal/assets/${job.asset_id}`, {
             headers: { 'Authorization': `Bearer ${internalToken}` }
        });
        
        if (!assetRes.ok) throw new Error(`Failed to fetch asset: ${assetRes.status}`);
        
        const { asset, svgContent } = await assetRes.json();
        
        if (!svgContent) throw new Error('No SVG content found');
        
        // Extract Signed Upload URLs from job payload
        // Also extract upload token if present (it should be in the job payload for secure uploads)
        const { thumbnail: thumbUrl, og: ogUrl, pdf: pdfUrl } = job.upload_urls || {};
        const uploadToken = job.upload_token || internalToken; // Fallback to internal token if specific upload token missing
        
        if (!thumbUrl && !ogUrl && !pdfUrl) {
            console.warn('[Queue] No upload URLs provided in job. Legacy mode or error?');
            // If strictly legacy, we could fallback, but we are enforcing new mode.
            // Throwing error to surface the issue.
            throw new Error('No signed upload URLs provided');
        }

        // Wrapp processing in timeout
        const processPromise = async () => {
            console.log(`[Queue] Generating files for ${asset.asset_id}...`);
            
            // 1. Thumbnail
            if (thumbUrl) {
                const thumbnailBuffer = await generateThumbnailBuffer(svgContent, asset.asset_id);
                await uploadFile(thumbUrl, thumbnailBuffer, 'image/webp', uploadToken);
            }
            
            // 2. OG
            if (ogUrl) {
                const ogBuffer = await generateOgBuffer(svgContent, asset.title);
                await uploadFile(ogUrl, ogBuffer, 'image/webp', uploadToken);
            }
            
            // 3. PDF
            if (pdfUrl) {
                const pdfBuffer = await generatePdfBuffer(svgContent, asset);
                await uploadFile(pdfUrl, pdfBuffer, 'application/pdf', uploadToken);
            }
        };

        // Execute with timeout race
        await Promise.race([
            processPromise(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Job timed out (> 5m)")), JOB_TIMEOUT))
        ]);
        
        // Complete
        const completeRes = await fetchWithRetry(`${apiUrl}/api/internal/queue/${job.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
        if (!completeRes.ok) throw new Error(`Failed to set completed status: ${completeRes.status}`);
        
        console.log(`[Queue] Job ${job.id} completed successfully`);
        
      } catch (err) {
        console.error(`[Queue] Job ${job.id} failed:`, err.message);
        // Fail status
        const newStatus = (job.attempts || 0) >= (job.max_attempts || 3) ? 'failed' : 'pending';
        await fetchWithRetry(`${apiUrl}/api/internal/queue/${job.id}`, {
           method: 'PATCH',
           headers: { 'Authorization': `Bearer ${internalToken}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ status: newStatus, error: err.message })
        }).catch(() => {});
      }
    };

    // Add all jobs to queue
    const promises = (jobs || []).map(job => jobBatchQueue.add(() => processJob(job)));
    
    // Wait for all to finish
    await Promise.all(promises);

  } catch (err) {
      console.error('[Queue] Global Error:', err);
  } finally {
    isProcessingQueue = false;
    console.log('[Queue] Processing cycle complete');
  }
}

// Wakeup handler logic helper
function getProcessQueueStatus() {
    return isProcessingQueue;
}

module.exports = {
    initQueues,
    waitForQueues,
    processQueue,
    getProcessQueueStatus,
    // Expose queues for generate-all?
    get queues() { return { thumbnailQueue, ogQueue, pdfQueue }; }
};
