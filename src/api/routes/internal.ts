import { Hono, Context, Next } from "hono";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Simple Bearer Auth middleware
const auth = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    // Allow if env token matches (ensure token is set!)
    if (!c.env.INTERNAL_API_TOKEN || !authHeader || authHeader !== `Bearer ${c.env.INTERNAL_API_TOKEN}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
};

// Security: Validate Key Paths
const isValidPrivateKey = (key: string) => /^pdfs\/[\w\-.]+$/.test(key);
const isValidPublicKey = (key: string) => /^(thumbnails|og-images)\/[\w\-.]+$/.test(key);

/**
 * Internal Upload Route for Containers - PRIVATE Bucket (PDFs, Sources)
 * PUT /api/internal/upload-private?key=xxx
 * Header: X-Filename (optional), X-Content-Type (optional)
 * Body: Raw Binary
 */
app.put("/upload-private", auth, async (c) => {
    try {
        const key = c.req.query("key");
        console.log(`[Internal API] Received PRIVATE upload for key: ${key}`);
        
        const body = await c.req.arrayBuffer();
        const filename = c.req.header("X-Filename");
        const contentType = c.req.header("X-Content-Type") || "application/pdf";
        
        if (!key || !body || body.byteLength === 0) {
            console.error(`[Internal API] Invalid data: key=${key}, bodySize=${body?.byteLength}`);
            return c.json({ error: "Invalid data" }, 400);
        }

        if (!isValidPrivateKey(key)) {
            console.error(`[Internal API] Rejected invalid PRIVATE key: ${key}`);
            return c.json({ error: "Invalid key path" }, 403);
        }

        await c.env.ASSETS_PRIVATE.put(key, body, {
            httpMetadata: {
                contentType,
                contentDisposition: filename ? `attachment; filename="${filename}"` : undefined
            }
        });
        console.log(`[Internal API] PRIVATE Write Success: ${key} (${body.byteLength} bytes)`);

        return c.json({ success: true });
    } catch (err) {
        console.error(`[Internal API] PRIVATE Upload Error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

// Legacy alias for PDF uploads
app.put("/upload-pdf", auth, async (c) => {
    try {
        const key = c.req.query("key");
        console.log(`[Internal API] Received PDF upload for key: ${key}`);
        
        const body = await c.req.arrayBuffer();
        const filename = c.req.header("X-Filename");
        
        if (!key || !body || body.byteLength === 0) {
            console.error(`[Internal API] Invalid data: key=${key}, bodySize=${body?.byteLength}`);
            return c.json({ error: "Invalid data" }, 400);
        }

        if (!isValidPrivateKey(key)) {
            console.error(`[Internal API] Rejected invalid PDF key: ${key}`);
            return c.json({ error: "Invalid key path" }, 403);
        }

        await c.env.ASSETS_PRIVATE.put(key, body, {
            httpMetadata: {
                contentType: "application/pdf",
                contentDisposition: filename ? `attachment; filename="${filename}"` : undefined
            }
        });
        console.log(`[Internal API] PDF Write Success: ${key}`);

        return c.json({ success: true });
    } catch (err) {
        console.error(`[Internal API] PDF Upload Error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

/**
 * Internal Upload Route for Containers - PUBLIC Bucket (Thumbnails, OG Images)
 * PUT /api/internal/upload-public?key=xxx
 * Header: X-Content-Type (required)
 * Body: Raw Binary
 */
app.put("/upload-public", auth, async (c) => {
    try {
        const key = c.req.query("key");
        console.log(`[Internal API] Received PUBLIC upload for key: ${key}`);
        
        const body = await c.req.arrayBuffer();
        const contentType = c.req.header("X-Content-Type") || "image/png";
        
        if (!key || !body || body.byteLength === 0) {
            console.error(`[Internal API] Invalid data: key=${key}, bodySize=${body?.byteLength}`);
            return c.json({ error: "Invalid data" }, 400);
        }

        if (!isValidPublicKey(key)) {
            console.error(`[Internal API] Rejected invalid PUBLIC key: ${key}`);
            return c.json({ error: "Invalid key path" }, 403);
        }

        await c.env.ASSETS_PUBLIC.put(key, body, {
            httpMetadata: { contentType }
        });
        console.log(`[Internal API] PUBLIC Write Success: ${key} (${body.byteLength} bytes)`);

        return c.json({ success: true });
    } catch (err) {
        console.error(`[Internal API] PUBLIC Upload Error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

/**
 * Queue API - Fetch pending jobs
 * GET /api/internal/queue/pending?limit=10
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
        
        console.log(`[Internal API] Found ${result.results?.length || 0} pending jobs`);
        return c.json({ jobs: result.results || [] });
    } catch (err) {
        console.error(`[Internal API] Queue fetch error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

/**
 * Queue API - Update job status
 * PATCH /api/internal/queue/:id
 * Body: { status: 'processing' | 'completed' | 'failed', error_message?: string }
 */
app.patch("/queue/:id", auth, async (c) => {
    try {
        const id = c.req.param("id");
        const body = await c.req.json() as { status: string; error_message?: string };
        const { status, error_message } = body;
        
        if (!['processing', 'completed', 'failed'].includes(status)) {
            return c.json({ error: "Invalid status" }, 400);
        }
        
        let query: string;
        let params: (string | number)[];
        
        if (status === 'processing') {
            query = `
                UPDATE processing_queue 
                SET status = ?, started_at = datetime('now'), attempts = attempts + 1
                WHERE id = ?
            `;
            params = [status, id];
        } else if (status === 'completed') {
            query = `
                UPDATE processing_queue 
                SET status = ?, completed_at = datetime('now')
                WHERE id = ?
            `;
            params = [status, id];
        } else {
            query = `
                UPDATE processing_queue 
                SET status = ?, error_message = ?, completed_at = datetime('now')
                WHERE id = ?
            `;
            params = [status, error_message || 'Unknown error', id];
        }
        
        await c.env.DB.prepare(query).bind(...params).run();
        console.log(`[Internal API] Job ${id} updated to ${status}`);
        return c.json({ success: true });
    } catch (err) {
        console.error(`[Internal API] Queue update error:`, err);
        return c.json({ error: "Internal Server Error", message: String(err) }, 500);
    }
});

/**
 * Queue API - Get asset data for processing
 * GET /api/internal/assets/:id
 */
app.get("/assets/:id", auth, async (c) => {
    try {
        const id = c.req.param("id");
        
        const result = await c.env.DB.prepare(`
            SELECT id, asset_id, title, description, r2_key_source, r2_key_public, r2_key_private, r2_key_og
            FROM assets
            WHERE id = ?
        `).bind(id).first();
        
        if (!result) {
            return c.json({ error: "Asset not found" }, 404);
        }
        
        // Fetch SVG content from R2 if source_key exists
        let svgContent = null;
        if (result.r2_key_source) {
            const obj = await c.env.ASSETS_PRIVATE.get(result.r2_key_source as string);
            if (obj) {
                svgContent = await obj.text();
            }
        }
        
        console.log(`[Internal API] Fetched asset ${id} for processing`);
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

