const express = require('express');
const cors = require('cors');
const { 
  validateAuthSecret, 
  validateUploadUrl, 
  fetchWithRetry,
  sanitizeSvgContent // Optional here as helpers do it, but good for early validation
} = require('./lib/utils');
const { 
  generateThumbnailBuffer, 
  generateOgBuffer, 
  generatePdfBuffer 
} = require('./lib/generators');
const { 
  initQueues, 
  waitForQueues, 
  processQueue, 
  getProcessQueueStatus, 
  queues 
} = require('./lib/queue');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Queues
initQueues();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(validateAuthSecret);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'huepress-processing' });
});

// Wakeup & Queue Trigger
app.get('/wakeup', async (req, res) => {
  if (req.headers['x-set-internal-token']) {
     process.env.INTERNAL_API_TOKEN = req.headers['x-set-internal-token'];
     console.log('[Config] Updated INTERNAL_API_TOKEN via wakeup');
  }
  if (req.headers['x-set-auth-secret']) {
     process.env.CONTAINER_AUTH_SECRET = req.headers['x-set-auth-secret'];
     console.log('[Config] Updated CONTAINER_AUTH_SECRET via wakeup');
  }

  console.log('[Queue] Wakeup received');
  res.json({ status: 'awake', processing: getProcessQueueStatus() });
  
  if (!getProcessQueueStatus()) {
    processQueue().catch(err => console.error('[Queue] Processing error:', err));
  }
});

// Endpoint: Thumbnails
app.post('/thumbnail', async (req, res) => {
  try {
    const { svgContent, width = 1024, uploadUrl, uploadToken, uploadKey, assetId } = req.body;

    if (!svgContent) return res.status(400).json({ error: 'Missing svgContent' });
    validateUploadUrl(uploadUrl);

    // Logic wrapped in queue for concurrency control
    const processTask = async () => {
      console.log(`[Thumbnail] Generating (width: ${width})...`);
      return generateThumbnailBuffer(svgContent, assetId || '', width);
    };

    // Async Mode
    if (uploadUrl && uploadToken && uploadKey) {
      // Add to queue instead of running immediately
      const { thumbnailQueue } = queues;
      
      // Fire and forget (but constrained by queue)
      thumbnailQueue.add(async () => {
          try {
            const buffer = await processTask();
            const res = await fetchWithRetry(`${uploadUrl}?key=${encodeURIComponent(uploadKey)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${uploadToken}`, 'X-Content-Type': 'image/webp' },
                body: buffer
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            console.log(`[Thumbnail] Async upload success: ${uploadKey}`);
          } catch(e) { console.error(`[Thumbnail] Async error:`, e); }
      });

      res.status(202).json({ status: 'accepted', message: 'Thumbnail queued' });
      return;
    }

    // Sync Mode (still queued to protect resources)
    const { thumbnailQueue } = queues;
    const buffer = await thumbnailQueue.add(() => processTask());
    
    res.json({
      success: true,
      imageBase64: buffer.toString('base64'),
      mimeType: 'image/webp'
    });
  } catch (error) {
    console.error('[Thumbnail] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: OG Image
app.post('/og-image', async (req, res) => {
  try {
    const { title, svgContent, uploadUrl, uploadToken, uploadKey } = req.body;
    
    if (!svgContent && !req.body.thumbnailBase64) return res.status(400).json({ error: 'svgContent is required' });
    validateUploadUrl(uploadUrl);

    const processTask = async () => {
        if (!svgContent) throw new Error('svgContent is required for high-quality OG generation');
        return generateOgBuffer(svgContent, title);
    };

    // Async Mode
    if (uploadUrl && uploadToken && uploadKey) {
      const { ogQueue } = queues;
      ogQueue.add(async () => {
        try {
          const buffer = await processTask();
          const res = await fetchWithRetry(`${uploadUrl}?key=${encodeURIComponent(uploadKey)}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${uploadToken}`, 'X-Content-Type': 'image/webp' },
            body: buffer
          });
          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
          console.log(`[OG] Async upload success: ${uploadKey}`);
        } catch (e) { console.error(`[OG] Async error:`, e); }
      });
      
      res.status(202).json({ status: 'accepted', message: 'OG queued' });
      return;
    }

    // Sync Mode
    const { ogQueue } = queues;
    const buffer = await ogQueue.add(() => processTask());
    
    res.json({
      success: true,
      imageBase64: buffer.toString('base64'),
      mimeType: 'image/webp'
    });
  } catch (error) {
    console.error('[OG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: PDF
app.post('/pdf', async (req, res) => {
  try {
    const { svgContent, filename, metadata, uploadUrl, uploadToken, uploadKey } = req.body;

    if (!svgContent) return res.status(400).json({ error: 'Missing svgContent' });
    validateUploadUrl(uploadUrl);

    const processTask = async () => {
      const asset = {
          asset_id: metadata?.assetId || 'UNKNOWN',
          title: metadata?.title,
          description: metadata?.description
      };
      return generatePdfBuffer(svgContent, asset, null);
    };

    // Async Mode
    if (uploadUrl && uploadToken && uploadKey) {
       const { pdfQueue } = queues;
       pdfQueue.add(async () => {
         try {
           const buffer = await processTask();
           const res = await fetchWithRetry(`${uploadUrl}?key=${encodeURIComponent(uploadKey)}`, {
             method: 'PUT',
             headers: { 
                 'Authorization': `Bearer ${uploadToken}`,
                 'X-Content-Type': 'application/pdf',
                 'X-Filename': filename || 'document.pdf'
             },
             body: buffer
           });
           if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
           console.log(`[PDF] Async upload success: ${uploadKey}`);
         } catch(e) { console.error(`[PDF] Async error:`, e); }
       });
       
       res.status(202).json({ status: 'accepted', message: 'PDF queued' });
       return;
    }

    // Sync Mode
    const { pdfQueue } = queues;
    const buffer = await pdfQueue.add(() => processTask());

    res.json({
      success: true,
      pdfBase64: buffer.toString('base64'),
      mimeType: 'application/pdf',
      filename: filename || 'document.pdf'
    });
  } catch (error) {
    console.error('[PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Generate All
app.post('/generate-all', async (req, res) => {
  const startTime = Date.now();
  const results = { thumbnail: null, og: null, pdf: null };
  
  try {
    const {
      svgContent, title, assetId, description = '', slug,
      thumbnailUploadUrl, thumbnailUploadKey,
      ogUploadUrl, ogUploadKey,
      pdfUploadUrl, pdfUploadKey, pdfFilename,
      uploadToken
    } = req.body;

    if (!svgContent) return res.status(400).json({ error: 'Missing svgContent' });
    if (!uploadToken) return res.status(400).json({ error: 'Missing uploadToken' });

    validateUploadUrl(thumbnailUploadUrl);
    validateUploadUrl(ogUploadUrl);
    validateUploadUrl(pdfUploadUrl);

    await waitForQueues();
    const { thumbnailQueue, ogQueue, pdfQueue } = queues;
    const publicUrl = slug ? `https://huepress.co/coloring-pages/${slug}-${assetId}` : `https://huepress.co`;

    console.log(`[GenerateAll] Starting for "${title}" (${assetId})...`);

    // Helper: Sanitization handled inside helpers, but we can do it once here if we want optimization?
    // But helpers re-sanitize. It's fast enough.
    const safeSvg = sanitizeSvgContent(svgContent); // We do it here to catch errors early

    // Executing Sequentially to save memory
    let thumbnailResult = null;
    let ogResult = null;

    if (thumbnailUploadUrl) {
       thumbnailResult = await thumbnailQueue.add(async () => {
        try {
            const buffer = await generateThumbnailBuffer(safeSvg, assetId);
            const res = await fetchWithRetry(`${thumbnailUploadUrl}?key=${encodeURIComponent(thumbnailUploadKey)}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${uploadToken}`, 'X-Content-Type': 'image/webp' },
              body: buffer
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            console.log(`[GenerateAll] Thumbnail uploaded`);
            return { success: true, size: buffer.length };
        } catch(e) {
            console.error(`[GenerateAll] Thumbnail failed:`, e.message);
            return { success: false, error: e.message };
        }
      });
    }

    if (ogUploadUrl) {
       ogResult = await ogQueue.add(async () => {
        try {
            const buffer = await generateOgBuffer(safeSvg, title);
            const res = await fetchWithRetry(`${ogUploadUrl}?key=${encodeURIComponent(ogUploadKey)}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${uploadToken}`, 'X-Content-Type': 'image/webp' },
              body: buffer
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            console.log(`[GenerateAll] OG uploaded`);
            return { success: true, size: buffer.length };
        } catch(e) {
            console.error(`[GenerateAll] OG failed:`, e.message);
            return { success: false, error: e.message };
        }
      });
    }

    results.thumbnail = thumbnailResult;
    results.og = ogResult;

    if (pdfUploadUrl && pdfUploadKey) {
        try {
            results.pdf = await pdfQueue.add(async () => {
                try {
                    const buffer = await generatePdfBuffer(safeSvg, { asset_id: assetId, title, description }, publicUrl);
                    const res = await fetchWithRetry(`${pdfUploadUrl}?key=${encodeURIComponent(pdfUploadKey)}`, {
                      method: 'PUT',
                      headers: { 
                          'Authorization': `Bearer ${uploadToken}`, 
                          'X-Content-Type': 'application/pdf',
                          'X-Filename': pdfFilename || 'document.pdf'
                      },
                      body: buffer
                    });
                    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
                    console.log(`[GenerateAll] PDF uploaded`);
                    return { success: true, size: buffer.length };
                } catch(e) {
                    console.error(`[GenerateAll] PDF failed:`, e.message);
                    return { success: false, error: e.message };
                }
            });
        } catch(e) {
            console.error(`[GenerateAll] PDF schedule failed:`, e.message);
            results.pdf = { success: false, error: e.message };
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[GenerateAll] Complete in ${elapsed}ms`);
    res.json({ success: true, results, elapsedMs: elapsed });

  } catch (error) {
    console.error('[GenerateAll] Error:', error);
    res.status(500).json({ error: error.message, results });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Processing] Server running on port ${PORT} (v2.0 - Refactored Modules)`);
  
  if (!getProcessQueueStatus()) {
    processQueue().catch(err => console.error('[Queue] Startup error:', err));
  }
});
