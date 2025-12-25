import { Hono } from "hono";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Get all published assets
app.get("/assets", async (c) => {
  const category = c.req.query("category");
  const skill = c.req.query("skill");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  let query = "SELECT * FROM assets WHERE status = 'published'";
  const params: string[] = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (skill) {
    query += " AND skill = ?";
    params.push(skill);
  }

  const tag = c.req.query("tag");
  if (tag) {
    // Filter by tag in the tags JSON array
    query += " AND EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?)";
    params.push(tag);
  }

  const search = c.req.query("search");
  if (search) {
    const term = `%${search}%`;
    query += " AND (title LIKE ? OR description LIKE ? OR asset_id LIKE ? OR EXISTS (SELECT 1 FROM json_each(tags) WHERE value LIKE ?))";
    params.push(term, term, term, term);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit.toString(), offset.toString());

  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
    const assets = results?.map((asset: Record<string, unknown>) => {
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

    return c.json({ assets, count: assets?.length || 0 });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch assets" }, 500);
  }
});

// Get single asset by ID, Asset ID (HP-...), or Slug
app.get("/assets/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const asset = await c.env.DB.prepare(
      "SELECT * FROM assets WHERE (id = ? OR asset_id = ? OR slug = ?) AND status = 'published'"
    )
      .bind(id, id, id)
      .first();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
    const r2Key = asset.r2_key_public as string;
    let imageUrl: string | null = null;
    
    if (r2Key && !r2Key.startsWith("__draft__")) {
      // If already a full URL, use as-is; otherwise prepend CDN
      imageUrl = r2Key.startsWith("http") ? r2Key : `${cdnUrl}/${r2Key}`;
    }
    
    return c.json({
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags as string) : [],
      fun_facts: asset.fun_facts ? JSON.parse(asset.fun_facts as string) : [],
      suggested_activities: asset.suggested_activities ? JSON.parse(asset.suggested_activities as string) : [],
      image_url: imageUrl,
    });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch asset" }, 500);
  }
});

// Download endpoint
app.get("/download/:id", async (c) => {
  const id = c.req.param("id");
  
  // Get Clerk session from header (MVP check)
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // TODO: Verify Clerk JWT token properly with key
  // For MVP refactor, we are keeping behavior same as original

  try {
    const asset = await c.env.DB.prepare("SELECT * FROM assets WHERE id = ?")
      .bind(id)
      .first();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    // Checking private R2 bucket
    const file = await c.env.ASSETS_PRIVATE.get(asset.r2_key_private as string);

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE assets SET download_count = download_count + 1 WHERE id = ?"
    )
      .bind(id)
      .run();

    return new Response(file.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asset.asset_id}-${asset.slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return c.json({ error: "Download failed" }, 500);
  }
});

export default app;
