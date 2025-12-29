const { fetchWithRetry } = require('./utils');
const { generateThumbnailBuffer, generateOgBuffer, generatePdfBuffer } = require('./generators');

let thumbnailQueue, ogQueue, pdfQueue;
let isProcessingQueue = false;

// Helper: Upload file via Signed URL (no token needed, signature is in URL)
async function uploadFile(uploadUrl, buffer, contentType) {
  if (!uploadUrl) {
      throw new Error("Missing upload URL");
  }
  
  // The URL already contains ?key=...&sig=...&expires=...
  const res = await fetchWithRetry(uploadUrl, {
    method: 'PUT',
    headers: {
      'X-Content-Type': contentType
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
  
  console.log('[Queue] Processing queues initialized (concurrency: 1 each)');
  
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
    const internalToken = process.env.INTERNAL_API_TOKEN;
    
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
    
    const { jobs } = await jobsRes.json();
    console.log(`[Queue] Found ${jobs?.length || 0} pending jobs`);
    
    // Ensure queues are ready
    if (!thumbnailQueue) await initQueues();

    for (const job of (jobs || [])) {
      try {
        console.log(`[Queue] Processing job ${job.id} for asset ${job.asset_id}`);
        
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
        const { thumbnail: thumbUrl, og: ogUrl, pdf: pdfUrl } = job.upload_urls || {};
        
        if (!thumbUrl && !ogUrl && !pdfUrl) {
            console.warn('[Queue] No upload URLs provided in job. Legacy mode or error?');
            // If strictly legacy, we could fallback, but we are enforcing new mode.
            // Throwing error to surface the issue.
            throw new Error('No signed upload URLs provided');
        }

        console.log(`[Queue] Generating files for ${asset.asset_id}...`);
        
        // 1. Thumbnail
        if (thumbUrl) {
            const thumbnailBuffer = await generateThumbnailBuffer(svgContent, asset.asset_id);
            await uploadFile(thumbUrl, thumbnailBuffer, 'image/webp');
        }
        
        // 2. OG
        if (ogUrl) {
            const ogBuffer = await generateOgBuffer(svgContent, asset.title);
            await uploadFile(ogUrl, ogBuffer, 'image/webp');
        }
        
        // 3. PDF
        if (pdfUrl) {
            const pdfBuffer = await generatePdfBuffer(svgContent, asset);
            await uploadFile(pdfUrl, pdfBuffer, 'application/pdf');
        }
        
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
    }
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
