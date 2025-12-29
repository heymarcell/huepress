import { Hono, Context, Next } from "hono";
import { Bindings } from "../types";
import { generateSignedUploadUrl, verifySignedRequest } from "../lib/signature";

const app = new Hono<{ Bindings: Bindings }>();

// Simple Bearer Auth middleware (Still used for queue management controls)
const auth = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    // Allow if env token matches (ensure token is set!)
    if (!c.env.INTERNAL_API_TOKEN || !authHeader || authHeader !== `Bearer ${c.env.INTERNAL_API_TOKEN}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
};

/**
 * [F-002] Signed Upload Endpoint
 * PUT /api/internal/upload-signed/:bucket?key=...&expires=...&sig=...
 * Does NOT require Bearer token (signature acts as auth)
 */
app.put("/upload-signed/:bucket", async (c) => {
    try {
        const bucketType = c.req.param("bucket");
        const key = c.req.query("key");
        const expires = c.req.query("expires");
        const sig = c.req.query("sig");
        
        if (bucketType !== 'public' && bucketType !== 'private') {
            return c.json({ error: "Invalid bucket" }, 400);
        }
        
        if (!key || !expires || !sig) {
            return c.json({ error: "Missing signature parameters" }, 400);
        }

        const isValid = await verifySignedRequest(c.env, bucketType, key, expires, sig);
        if (!isValid) {
            console.error(`[Signed Upload] Invalid signature for ${key}`);
            return c.json({ error: "Invalid or expired signature" }, 403);
        }

        console.log(`[Signed Upload] Verified signature for ${key} (${bucketType})`);
        
        const body = await c.req.arrayBuffer();
        const contentType = c.req.header("X-Content-Type") || "application/octet-stream";
        const filename = c.req.header("X-Filename");

        if (!body || body.byteLength === 0) {
             return c.json({ error: "Empty body" }, 400);
        }

        const bucket = bucketType === 'public' ? c.env.ASSETS_PUBLIC : c.env.ASSETS_PRIVATE;
        
        await bucket.put(key, body, {
            httpMetadata: {
                contentType,
                contentDisposition: filename ? `attachment; filename="${filename}"` : undefined
            }
        });
        
        console.log(`[Signed Upload] Success: ${key}`);
        return c.json({ success: true });
        
    } catch (err) {
        console.error(`[Signed Upload] Error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

// Legacy Handlers (Deprecated but kept for transition if needed, though we should switch over)
// ... Removed to enforce new security model ...

/**
 * Queue API - Fetch pending jobs
 * [UPDATED] Generates Signed Upload URLs for the container
 */
app.get("/queue/pending", auth, async (c) => {
    try {
        const limit = parseInt(c.req.query("limit") || "10");
        
        const result = await c.env.DB.prepare(`
            SELECT id, asset_id, job_type, attempts, max_attempts, created_at
            FROM processing_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT ?
        `).bind(limit).all();
        
        const jobs = result.results || [];
        
        // Enrich jobs with signed URLs
        const enrichedJobs = await Promise.all(jobs.map(async (job: Record<string, unknown>) => {
             const assetId = job.asset_id as string;
             // We need to fetch asset keys to generate upload URLs
             const asset = await c.env.DB.prepare(
                "SELECT r2_key_public, r2_key_private, r2_key_og, r2_key_source FROM assets WHERE id = ?"
             ).bind(assetId).first<{ r2_key_public: string, r2_key_private: string, r2_key_og: string, r2_key_source: string }>();
             
             if (!asset) return job;
             
             // 5 minute expiration window for the upload
             const ttl = 300; 
             
             return {
                 ...job,
                 upload_urls: {
                     thumbnail: asset.r2_key_public ? await generateSignedUploadUrl(c.env, 'public', asset.r2_key_public, ttl) : null,
                     og: asset.r2_key_og ? await generateSignedUploadUrl(c.env, 'public', asset.r2_key_og, ttl) : null,
                     pdf: asset.r2_key_private ? await generateSignedUploadUrl(c.env, 'private', asset.r2_key_private, ttl) : null
                 }
             };
        }));
        
        console.log(`[Internal API] Served ${enrichedJobs.length} pending jobs with signed URLs`);
        return c.json({ jobs: enrichedJobs });
    } catch (err) {
        console.error(`[Internal API] Queue fetch error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

/**
 * Queue API - Update job status
 */
app.patch("/queue/:id", auth, async (c) => {
    try {
        const id = c.req.param("id");
        const body = await c.req.json() as { status: string; error_message?: string };
        const { status, error_message } = body;
        
        // ... (Logic unchanged) ...
        // Re-implementing compact update logic
        if (!['processing', 'completed', 'failed'].includes(status)) {
            return c.json({ error: "Invalid status" }, 400);
        }
        
        let query = "";
        let params: any[] = [];
        
        if (status === 'processing') {
            query = "UPDATE processing_queue SET status = ?, started_at = datetime('now'), attempts = attempts + 1 WHERE id = ?";
            params = [status, id];
        } else if (status === 'completed') {
            query = "UPDATE processing_queue SET status = ?, completed_at = datetime('now') WHERE id = ?";
            params = [status, id];
        } else {
             query = "UPDATE processing_queue SET status = ?, error_message = ?, completed_at = datetime('now') WHERE id = ?";
             params = [status, error_message || 'Unknown error', id];
        }
        
        await c.env.DB.prepare(query).bind(...params).run();
        return c.json({ success: true });
    } catch (err) {
        console.error(`[Internal API] Queue update error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

/**
 * Queue API - Get asset data for processing
 * [UPDATED] Generates Signed Source URL if needed (for downloading source SVG)
 */
app.get("/assets/:id", auth, async (c) => {
    try {
        const id = c.req.param("id");
        
        const result = await c.env.DB.prepare(`
            SELECT id, asset_id, title, description, r2_key_source, r2_key_public, r2_key_private, r2_key_og
            FROM assets
            WHERE id = ?
        `).bind(id).first();
        
        if (!result) return c.json({ error: "Asset not found" }, 404);
        
        let svgContent = null;
        if (result.r2_key_source) {
            const obj = await c.env.ASSETS_PRIVATE.get(result.r2_key_source as string);
            if (obj) svgContent = await obj.text();
            
            // Note: If we moved to Signed GET URLs for source, the container would fetch it.
            // But streaming it here is fine for reads via the trusted API token channel.
            // The risk F-002 was about WRITE access.
            // READ access via token is acceptable for now as the token allows reads anyway.
        }
        
        return c.json({ 
            asset: result,
            svgContent 
        });
    } catch (err) {
        console.error(`[Internal API] Asset fetch error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

export default app;

