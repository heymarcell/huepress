import { Hono } from "hono";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Simple Bearer Auth middleware
const auth = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    // Allow if env token matches (ensure token is set!)
    if (!c.env.INTERNAL_API_TOKEN || !authHeader || authHeader !== `Bearer ${c.env.INTERNAL_API_TOKEN}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    await next();
};

/**
 * Internal Upload Route for Containers
 * PUT /api/internal/upload-pdf/:key
 * Header: X-Filename (optional)
 * Body: Raw PDF Binary
 */
app.put("/upload-pdf/:key", auth, async (c) => {
    const rawKey = c.req.param("key");
    const key = decodeURIComponent(rawKey);
    const body = await c.req.arrayBuffer();
    const filename = c.req.header("X-Filename");
    
    if (!key || !body) return c.json({ error: "Invalid data" }, 400);

    // Upload to Private R2
    // We expect the key to comprise the path, e.g. "pdfs/UUID"
    await c.env.ASSETS_PRIVATE.put(key, body, {
        httpMetadata: {
            contentType: "application/pdf",
            // If filename provided, set Content-Disposition
            contentDisposition: filename ? `attachment; filename="${filename}"` : undefined
        }
    });

    return c.json({ success: true });
});

export default app;
