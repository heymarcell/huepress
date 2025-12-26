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

export default app;

