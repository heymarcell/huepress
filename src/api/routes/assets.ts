import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { Bindings } from "../types";
import { watermarkPdf } from "../../lib/pdf-watermark";

const app = new Hono<{ Bindings: Bindings }>();

// Get all published assets (with edge caching)
app.get("/assets", async (c) => {
  // Check edge cache first (caches.default is Cloudflare Workers API)
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(c.req.url, { method: "GET" });
  
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    // Clone and add cache hit header for debugging
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set("X-Cache", "HIT");
    return response;
  }

  const category = c.req.query("category")?.trim();
  const skill = c.req.query("skill")?.trim();
  const limit = parseInt(c.req.query("limit") || "24");
  const offset = parseInt(c.req.query("offset") || "0");

  // Build WHERE clause conditions
  let whereClause = "WHERE status = 'published'";
  const params: string[] = [];

  if (category) {
    whereClause += " AND category = ?";
    params.push(category);
  }

  if (skill) {
    whereClause += " AND skill = ?";
    params.push(skill);
  }

  const tagParam = c.req.query("tag")?.trim();
  if (tagParam) {
    const tags = tagParam.split(",").map(t => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      // Filter by ANY of the tags (OR logic)
      const placeholders = tags.map(() => "?").join(",");
      whereClause += ` AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value IN (${placeholders}))`;
      params.push(...tags);
    }
  }

  const search = c.req.query("search");
  if (search) {
    const term = `%${search}%`;
    whereClause += " AND (title LIKE ? OR description LIKE ? OR asset_id LIKE ? OR EXISTS (SELECT 1 FROM json_each(tags) WHERE value LIKE ?))";
    params.push(term, term, term, term);
  }

  try {
    // Run both queries in parallel: data + count
    const [dataResult, countResult] = await Promise.all([
      c.env.DB.prepare(
        `SELECT id, title, category, skill, asset_id, slug, r2_key_public, tags, created_at, description 
         FROM assets ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      ).bind(...params, limit.toString(), offset.toString()).all(),
      
      c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM assets ${whereClause}`
      ).bind(...params).first<{ total: number }>()
    ]);
    
    const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
    const assets = dataResult.results?.map((asset: Record<string, unknown>) => {
      const r2Key = asset.r2_key_public as string;
      let imageUrl: string | null = null;
      
      if (r2Key && !r2Key.startsWith("__draft__")) {
        // If already a full URL, use as-is; otherwise prepend CDN
        imageUrl = r2Key.startsWith("http") ? r2Key : `${cdnUrl}/${r2Key}`;
      }
      
      return {
        ...asset,
        tags: asset.tags ? JSON.parse(asset.tags as string) : [],
        image_url: imageUrl,
      };
    });

    // Build response with caching headers
    const responseData = { 
      assets, 
      total: countResult?.total || 0,
      limit,
      offset,
      count: assets?.length || 0 
    };
    
    const response = c.json(responseData);
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    response.headers.set("X-Cache", "MISS");
    
    // Store in edge cache (clone since response body can only be read once)
    c.executionCtx.waitUntil(
      cache.put(cacheKey, response.clone())
    );
    
    return response;
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch assets" }, 500);
  }
});

// Get single asset by ID, Asset ID (HP-...), or Slug (with edge caching)
app.get("/assets/:id", async (c) => {
  const id = c.req.param("id");
  
  // Check edge cache first (caches.default is Cloudflare Workers API)
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(c.req.url, { method: "GET" });
  
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set("X-Cache", "HIT");
    return response;
  }

  try {
    // Optimization: Detect ID type to use specific index
    // 1. UUID (very distinct format)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    // 2. Asset ID (starts with HP-)
    const isAssetId = id.startsWith("HP-");
    
    let asset: Record<string, unknown> | null = null;

    // Optimized: Use specific indexed queries where possible
    if (isUUID) {
       asset = await c.env.DB.prepare("SELECT * FROM assets WHERE id = ?").bind(id).first();
    } else if (isAssetId) {
       asset = await c.env.DB.prepare("SELECT * FROM assets WHERE asset_id = ?").bind(id).first();
    } else {
       // For slugs and legacy IDs: Check strict equality matches only.
       // We removed the `LIKE %id` wildcard fallback as it causes full table scans.
       // If a user wants to search, they should use the search endpoint.
       asset = await c.env.DB.prepare(`
         SELECT * FROM assets 
         WHERE slug = ? OR asset_id = ?
         LIMIT 1
       `).bind(id, id).first();
    }

    if (!asset || asset.status !== 'published') {
      return c.json({ error: "Asset not found" }, 404);
    }

    const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
    const r2Key = asset.r2_key_public as string;
    const ogKey = asset.r2_key_og as string | null;
    let imageUrl: string | null = null;
    let ogImageUrl: string | null = null;
    
    if (r2Key && !r2Key.startsWith("__draft__")) {
      // If already a full URL, use as-is; otherwise prepend CDN
      imageUrl = r2Key.startsWith("http") ? r2Key : `${cdnUrl}/${r2Key}`;
    }
    
    if (ogKey) {
      ogImageUrl = ogKey.startsWith("http") ? ogKey : `${cdnUrl}/${ogKey}`;
    }
    
    const responseData = {
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags as string) : [],
      fun_facts: asset.fun_facts ? JSON.parse(asset.fun_facts as string) : [],
      suggested_activities: asset.suggested_activities ? JSON.parse(asset.suggested_activities as string) : [],
      image_url: imageUrl,
      thumbnail_url: imageUrl, // Alias for backwards compatibility
      og_image_url: ogImageUrl || imageUrl, // Fallback to thumbnail
    };
    
    const response = c.json(responseData);
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    response.headers.set("X-Cache", "MISS");
    
    // Store in edge cache
    c.executionCtx.waitUntil(
      cache.put(cacheKey, response.clone())
    );
    
    return response;
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch asset" }, 500);
  }
});

// Download endpoint
app.get("/download/:id", async (c) => {
  const id = c.req.param("id");
  
  // Verify authentication via Clerk JWT
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check if admin (bypass subscription)
  let isAdmin = false;
  const sessionClaims = auth.sessionClaims as { publicMetadata?: { role?: string } } | undefined;
  if (sessionClaims?.publicMetadata?.role === 'admin') {
     isAdmin = true;
  }

  // Fetch user record for subscription check and watermarking
  const user = await c.env.DB.prepare(
    "SELECT id, subscription_status FROM users WHERE clerk_id = ?"
  ).bind(auth.userId).first<{ id: string; subscription_status: string }>();

  if (!isAdmin) {
    if (!user || user.subscription_status !== 'active') {
      return c.json({ error: "Active subscription required" }, 403);
    }
  }

  // Use internal UUID for watermarking (more secure than exposing Clerk ID)
  const internalUserId = user?.id || auth.userId;

  try {
    const asset = await c.env.DB.prepare("SELECT * FROM assets WHERE id = ?")
      .bind(id)
      .first();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    // Checking private R2 bucket
    if (!asset.r2_key_private) {
        return c.json({ error: "PDF not available" }, 404);
    }
    const file = await c.env.ASSETS_PRIVATE.get(asset.r2_key_private as string);

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    // [PERF] Defer non-critical writes to prevent D1 lock contention
    // These writes happen AFTER the response is sent
    c.executionCtx.waitUntil(
      c.env.DB.batch([
        c.env.DB.prepare("UPDATE assets SET download_count = download_count + 1 WHERE id = ?").bind(id),
        c.env.DB.prepare("INSERT INTO downloads (id, user_id, asset_id, downloaded_at) VALUES (?, ?, ?, datetime('now'))").bind(crypto.randomUUID(), internalUserId, id)
      ]).catch((err: Error) => console.error("[Deferred Write] Download tracking failed:", err))
    );

    // Apply invisible watermark with internal user UUID for leak tracking
    const watermarkedPdf = await watermarkPdf(
      await file.arrayBuffer(),
      internalUserId
    );

    return new Response(new Uint8Array(watermarkedPdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="huepress-secure-${Date.now()}.pdf"`,
        "Cache-Control": "private, no-store", // CRITICAL: Do not cache user-specific versions
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return c.json({ error: "Download failed" }, 500);
  }
});

export default app;

