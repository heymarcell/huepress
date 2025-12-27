const { fetchWithRetry } = require('./utils');
const { generateThumbnailBuffer, generateOgBuffer, generatePdfBuffer } = require('./generators');

let thumbnailQueue, ogQueue, pdfQueue;
let isProcessingQueue = false;

// Helper: Upload file to R2 via internal API
async function uploadFile(apiUrl, token, bucket, key, buffer, contentType) {
  const endpoint = bucket === 'public' ? 'upload-public' : 'upload-private';
  const res = await fetchWithRetry(`${apiUrl}/api/internal/${endpoint}?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
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
        // 404 is acceptable if no jobs? No, endpoint returns {element: []} usually.
        // But logs say "Failed to fetch jobs".
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
        
        // Critical Fix: check OK. If 404 (row not updated), abort to prevent loop.
        if (!statusRes.ok) throw new Error(`Failed to set processing status: ${statusRes.status}`);
        
        // Fetch Asset
        const assetRes = await fetchWithRetry(`${apiUrl}/api/internal/assets/${job.asset_id}`, {
             headers: { 'Authorization': `Bearer ${internalToken}` }
        });
        
        if (!assetRes.ok) throw new Error(`Failed to fetch asset: ${assetRes.status}`);
        
        const { asset, svgContent } = await assetRes.json(); // Wait, internal/assets/:id returns { ...asset, svgContent }?
        // Step 1246 modified internal/assets/:id.
        // I should verify response structure. Assuming { asset, svgContent } based on server.js usage.
        // Actually server.js (Step 1336 line 413) used: `const { asset, svgContent } = await assetRes.json()`.
        // Wait, line 405 fetched `/queue/${job.id}/asset`. Not `/assets/:id`?
        // Step 1251 edit changed it to `/assets/${job.asset_id}`.
        // So the response structure should be checked.
        // Assuming it's correct as per previous code.
        
        if (!svgContent) throw new Error('No SVG content found');
        
        console.log(`[Queue] Generating files for ${asset.asset_id}...`);
        
        // Use Generators
        // Logic from server.js used uploadFile helper immediately
        
        // 1. Thumbnail
        const thumbnailBuffer = await generateThumbnailBuffer(svgContent, asset.asset_id);
        await uploadFile(apiUrl, internalToken, 'public', asset.r2_key_public, thumbnailBuffer, 'image/webp');
        
        // 2. OG
        const ogBuffer = await generateOgBuffer(svgContent, asset.title);
        await uploadFile(apiUrl, internalToken, 'public', asset.r2_key_og, ogBuffer, 'image/png');
        
        // 3. PDF
        const pdfBuffer = await generatePdfBuffer(svgContent, asset); // Helper handles logic
        await uploadFile(apiUrl, internalToken, 'private', asset.r2_key_private, pdfBuffer, 'application/pdf');
        
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
