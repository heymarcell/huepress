import { Hono } from "hono";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Admin check using environment variable
function isAdmin(email: string | undefined, adminEmails: string): boolean {
  if (!email) return false;
  const allowedEmails = adminEmails.split(',').map(e => e.trim().toLowerCase());
  return allowedEmails.includes(email.toLowerCase());
}

// ADMIN: Create Draft Asset (called on SVG upload)
// Saves all current form data and returns the generated assetId & slug
app.post("/create-draft", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.parseBody() as Record<string, string>;
  const { title, description, category, skill, tags } = body;
  
  if (!title || !category) {
    return c.json({ error: "Title and Category are required" }, 400);
  }

  // Generate Asset ID: Sequential 5-digit number (e.g., 00001)
  const lastAsset = await c.env.DB.prepare(
    "SELECT asset_id FROM assets WHERE length(asset_id) = 5 ORDER BY asset_id DESC LIMIT 1"
  ).first<{ asset_id: string }>();

  let sequence = 1;
  if (lastAsset?.asset_id && /^\d+$/.test(lastAsset.asset_id)) {
    sequence = parseInt(lastAsset.asset_id, 10) + 1;
  }

  const assetId = sequence.toString().padStart(5, '0');
  
  // Generate Slug
  const slugify = (text: string) => text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
  const slug = slugify(title);
  
  // Create Draft with placeholder R2 keys (will be updated on final save)
  const id = crypto.randomUUID();
  const placeholderKey = `__draft__/${assetId}-${slug}`;
  
  // Parse tags
  const tagsArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const tagsJson = JSON.stringify(tagsArray);
  
  try {
    await c.env.DB.prepare(`
      INSERT INTO assets (
        id, asset_id, slug, title, description, category, skill,
        status, r2_key_private, r2_key_public, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, datetime('now'))
    `).bind(
      id, assetId, slug, title, description || '', category, skill || '',
      placeholderKey, placeholderKey, tagsJson
    ).run();
    
    return c.json({ assetId, slug, id });
  } catch (err) {
    console.error("Draft creation failed", err);
    return c.json({ error: "Failed to create draft" }, 500);
  }
});

// ADMIN: Get all assets (including drafts)
app.get("/assets", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM assets ORDER BY created_at DESC"
    ).all();
    
    const assets = results?.map((asset: Record<string, unknown>) => ({
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags as string) : [],
    }));

    return c.json({ assets });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch assets" }, 500);
  }
});

// ADMIN: Get single asset by ID
app.get("/assets/:id", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.param();

  try {
    const asset = await c.env.DB.prepare(
      "SELECT * FROM assets WHERE id = ?"
    ).bind(id).first<Record<string, unknown>>();
    
    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    return c.json({ 
      asset: {
        ...asset,
        tags: asset.tags ? JSON.parse(asset.tags as string) : [],
        fun_facts: asset.fun_facts ? JSON.parse(asset.fun_facts as string) : [],
        suggested_activities: asset.suggested_activities ? JSON.parse(asset.suggested_activities as string) : [],
      }
    });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch asset" }, 500);
  }
});

// ADMIN: Update asset status (publish/draft)
app.patch("/assets/:id/status", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.param();
  const { status } = await c.req.json<{ status: 'published' | 'draft' }>();

  if (!status || !['published', 'draft'].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  try {
    await c.env.DB.prepare(
      "UPDATE assets SET status = ? WHERE id = ?"
    ).bind(status, id).run();

    return c.json({ success: true, status });
  } catch (error) {
    console.error("Update status error:", error);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// ADMIN: Create new asset
// ADMIN: Create or Update asset
app.post("/assets", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.parseBody();
    
    // Category Code Map and Slugify
    const CATEGORY_CODES: Record<string, string> = {
      "Animals": "ANM",
      "Nature": "NAT",
      "Vehicles": "VEH",
      "Fantasy": "FAN",
      "Holidays": "HOL",
      "Educational": "EDU",
      "Mandalas": "MAN",
      "Characters": "CHR",
      "Food": "FOD"
    };

    // Extract fields
    const title = body["title"] as string;
    const description = body["description"] as string;
    const category = body["category"] as string;
    const skill = body["skill"] as string;
    const tags = body["tags"] as string;
    const status = body["status"] as string;
    
    // Extract files (safely check types)
    const thumbnailFile = body["thumbnail"];
    const pdfFile = body["pdf"];
    const sourceFile = body["source"];

    const slugify = (text: string) => text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');

    // Extract new SEO fields
    const extendedDescription = body["extended_description"] as string || null;
    const coloringTips = body["coloring_tips"] as string || null;
    const therapeuticBenefits = body["therapeutic_benefits"] as string || null;
    const metaKeywords = body["meta_keywords"] as string || null;
    
    // JSON fields (ensure they are arrays)
    const funFacts = body["fun_facts"] as string || "[]";
    const suggestedActivities = body["suggested_activities"] as string || "[]";
    
    // Check if this is an update vs new create
    const providedAssetId = body["asset_id"] as string;
    
    // Validation
    // For NEW assets, we generally require files, unless it's a draft being saved?
    // Let's be lenient: checks are better done on frontend. Backend should just save what it gets.
    // However, for a functionality asset, title/category are essential.
    if (!title || !category) {
       return c.json({ error: "Title and Category are required" }, 400);
    }

    // 1. Generate SEO ID and Slug
    const code = CATEGORY_CODES[category] || "GEN";
    const prefix = `HP-${code}-`;

    let assetId = providedAssetId; 
    
    // If not provided, calculate it (fallback)
    if (!assetId) {
      // Find last sequence for this category
      const lastAsset = await c.env.DB.prepare(
        "SELECT asset_id FROM assets WHERE asset_id LIKE ? ORDER BY asset_id DESC LIMIT 1"
      ).bind(`${prefix}%`).first<{ asset_id: string }>();

      let sequence = 1;
      if (lastAsset?.asset_id) {
        const parts = lastAsset.asset_id.split("-");
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
      }
      assetId = `${prefix}${sequence.toString().padStart(4, '0')}`;
    }

    const slug = slugify(title);

    // 2. Handle File Uploads (Independent)
    let thumbnailKey: string | null = null;
    let pdfKey: string | null = null;
    let sourceKey: string | null = null;
    
    // Process Thumbnail
    if (thumbnailFile && thumbnailFile instanceof File) {
      console.log(`Uploading thumbnail for ${assetId}...`);
      thumbnailKey = `thumbnails/${assetId}-${slug}.webp`;
      await c.env.ASSETS_PUBLIC.put(thumbnailKey, thumbnailFile);
    }

    // Process PDF
    if (pdfFile && pdfFile instanceof File) {
       console.log(`Uploading PDF for ${assetId}...`);
       pdfKey = `pdfs/${assetId}-${slug}.pdf`;
       await c.env.ASSETS_PRIVATE.put(pdfKey, pdfFile);
    }

    // Process Source (SVG) - NEW
    if (sourceFile && sourceFile instanceof File) {
       console.log(`Uploading Source SVG for ${assetId}...`);
       sourceKey = `sources/${assetId}-${slug}.svg`;
       await c.env.ASSETS_PRIVATE.put(sourceKey, sourceFile);
    }
    
    // 3. Insert or Update into D1
    const tagsArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const tagsJson = JSON.stringify(tagsArray);

    let id: string = crypto.randomUUID();
    
    // Check if updating a reserved asset
    if (providedAssetId) {
      const existing = await c.env.DB.prepare("SELECT id FROM assets WHERE asset_id = ?").bind(providedAssetId).first<{ id: string }>();
      
      if (existing) {
        id = existing.id;
        
        // Build Dynamic Update Query
        // We only update R2 keys if new files were uploaded
        const fields: string[] = [];
        const values: unknown[] = [];

        // Always update metadata
        fields.push("slug = ?");
        values.push(slug);
        
        fields.push("title = ?"); values.push(title);
        fields.push("description = ?"); values.push(description);
        fields.push("category = ?"); values.push(category);
        fields.push("skill = ?"); values.push(skill);
        fields.push("status = ?"); values.push(status);
        fields.push("tags = ?"); values.push(tagsJson);
        fields.push("extended_description = ?"); values.push(extendedDescription);
        fields.push("fun_facts = ?"); values.push(funFacts);
        fields.push("suggested_activities = ?"); values.push(suggestedActivities);
        fields.push("coloring_tips = ?"); values.push(coloringTips);
        fields.push("therapeutic_benefits = ?"); values.push(therapeuticBenefits);
        fields.push("meta_keywords = ?"); values.push(metaKeywords);

        if (thumbnailKey) {
          fields.push("r2_key_public = ?");
          values.push(thumbnailKey);
        }

        if (pdfKey) {
          fields.push("r2_key_private = ?");
          values.push(pdfKey);
        }

        if (sourceKey) {
          fields.push("r2_key_source = ?");
          values.push(sourceKey);
        }

        // Add WHERE clause ID
        values.push(providedAssetId);

        const query = `UPDATE assets SET ${fields.join(", ")} WHERE asset_id = ?`;
        
        await c.env.DB.prepare(query).bind(...values).run();

      } else {
         // Provided ID but not found in DB? Insert it.
         // This happens if a Draft was "created" in memory but DB failed, or just a new manual entry with ID.
         await c.env.DB.prepare(`
          INSERT INTO assets (
            id, asset_id, slug, title, description, category, skill, 
            r2_key_public, r2_key_private, r2_key_source, status, tags, 
            extended_description, fun_facts, suggested_activities, 
            coloring_tips, therapeutic_benefits, meta_keywords,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          id, assetId, slug, title, description, category, skill,
          thumbnailKey || "__draft__", pdfKey || "__draft__", sourceKey || null, status, tagsJson,
          extendedDescription, funFacts, suggestedActivities,
          coloringTips, therapeuticBenefits, metaKeywords
        ).run();
      }
    } else {
      // Standard Insert (New asset flow without ID)
      await c.env.DB.prepare(`
        INSERT INTO assets (
          id, asset_id, slug, title, description, category, skill, 
          r2_key_public, r2_key_private, r2_key_source, status, tags, 
          extended_description, fun_facts, suggested_activities, 
          coloring_tips, therapeutic_benefits, meta_keywords,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, assetId, slug, title, description, category, skill,
        thumbnailKey, pdfKey, sourceKey || null, status, tagsJson,
        extendedDescription, funFacts, suggestedActivities,
        coloringTips, therapeuticBenefits, metaKeywords
      ).run();
    }

    return c.json({ success: true, id, assetId });
  } catch (error) {
    console.error("Asset creation error:", error);
    // Be verbose on error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: `Failed to create/update asset: ${errorMessage}` }, 500);
  }
});

// ADMIN: Get Dashboard Stats
app.get("/stats", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // 1. Total Assets
    const assetsCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM assets").first<{ count: number }>();
    
    // 2. Total Downloads
    const downloadsCount = await c.env.DB.prepare("SELECT SUM(download_count) as count FROM assets").first<{ count: number }>();
    
    // 3. New Assets This Week
    const newAssetsCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM assets 
      WHERE created_at >= datetime('now', '-7 days')
    `).first<{ count: number }>();

    // 4. Total Subscribers (Active)
    const subscribersCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE subscription_status = 'active'
    `).first<{ count: number }>();

    return c.json({
      totalAssets: assetsCount?.count || 0,
      totalDownloads: downloadsCount?.count || 0,
      totalSubscribers: subscribersCount?.count || 0,
      newAssetsThisWeek: newAssetsCount?.count || 0
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// ADMIN: Delete single asset
app.delete("/assets/:id", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.param();

  try {
    // Get asset to find R2 keys
    const asset = await c.env.DB.prepare(
      "SELECT r2_key_private, r2_key_public, r2_key_source FROM assets WHERE id = ?"
    ).bind(id).first<{ r2_key_private: string; r2_key_public: string; r2_key_source: string }>();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    // Delete from R2
    if (asset.r2_key_private && !asset.r2_key_private.startsWith("__draft__")) {
      await c.env.ASSETS_PRIVATE.delete(asset.r2_key_private);
    }
    if (asset.r2_key_public && !asset.r2_key_public.startsWith("__draft__")) {
      await c.env.ASSETS_PUBLIC.delete(asset.r2_key_public);
    }
    if (asset.r2_key_source) {
      await c.env.ASSETS_PRIVATE.delete(asset.r2_key_source);
    }

    // Delete from database
    await c.env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return c.json({ error: "Failed to delete asset" }, 500);
  }
});

// ADMIN: Get Asset Source (SVG)
app.get("/assets/:id/source", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.param();

  try {
    const asset = await c.env.DB.prepare(
      "SELECT r2_key_source FROM assets WHERE id = ?"
    ).bind(id).first<{ r2_key_source: string }>();

    if (!asset || !asset.r2_key_source) {
      return c.json({ error: "Source file not found" }, 404);
    }

    const file = await c.env.ASSETS_PRIVATE.get(asset.r2_key_source);

    if (!file) {
      return c.json({ error: "File not found in storage" }, 404);
    }

    const headers = new Headers();
    file.writeHttpMetadata(headers);
    headers.set("Content-Type", "image/svg+xml");
    headers.set("Cache-Control", "no-cache");

    return new Response(file.body, { headers });
  } catch (error) {
    console.error("Fetch source error:", error);
    return c.json({ error: "Failed to fetch source" }, 500);
  }
});

// ADMIN: Bulk delete assets
app.post("/assets/bulk-delete", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { ids } = await c.req.json<{ ids: string[] }>();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "No IDs provided" }, 400);
    }

    let deletedCount = 0;

    for (const id of ids) {
      const asset = await c.env.DB.prepare(
        "SELECT r2_key_private, r2_key_public, r2_key_source FROM assets WHERE id = ?"
      ).bind(id).first<{ r2_key_private: string; r2_key_public: string; r2_key_source: string }>();

      if (asset) {
        // Delete from R2
        if (asset.r2_key_private && !asset.r2_key_private.startsWith("__draft__")) {
          await c.env.ASSETS_PRIVATE.delete(asset.r2_key_private);
        }
        if (asset.r2_key_public && !asset.r2_key_public.startsWith("__draft__")) {
          await c.env.ASSETS_PUBLIC.delete(asset.r2_key_public);
        }
        if (asset.r2_key_source) {
          await c.env.ASSETS_PRIVATE.delete(asset.r2_key_source);
        }

        // Delete from database
        await c.env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
        deletedCount++;
      }
    }

    return c.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return c.json({ error: "Failed to delete assets" }, 500);

// ADMIN: Get Design Requests
app.get("/requests", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) return c.json({ error: "Unauthorized" }, 401);

  const { status } = c.req.query();
  
  let query = "SELECT * FROM design_requests";
  let params: any[] = [];
  
  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }
  
  query += " ORDER BY created_at DESC";
  
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

// ADMIN: Update Design Request
app.patch("/requests/:id", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) return c.json({ error: "Unauthorized" }, 401);
  
  const id = c.req.param("id");
  const { status, admin_notes } = await c.req.json<{ status?: string, admin_notes?: string }>();
  
  // Dynamic update
  let updates: string[] = [];
  let params: any[] = [];
  
  if (status) {
    updates.push("status = ?");
    params.push(status);
  }
  if (admin_notes !== undefined) {
    updates.push("admin_notes = ?");
    params.push(admin_notes);
  }
  
  updates.push("updated_at = datetime('now')");
  
  if (updates.length > 1) { // 1 is just updated_at
      params.push(id);
      
      await c.env.DB.prepare(
        `UPDATE design_requests SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...params).run();
  }
  
  return c.json({ success: true });
});

export default app;

