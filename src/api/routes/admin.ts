import { Hono } from "hono";
import { Bindings } from "../types";
// Helper for base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
import { generateOgImageViaContainer, generatePdfViaContainer, generateThumbnailViaContainer } from "../../lib/processing-container";

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

  // Generate Asset ID: Use sequences table for guaranteed unique, never-reused IDs
  // Atomic increment: ensures no duplicates even with concurrent requests
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO sequences (name, value) VALUES ('asset_id', 0)"
  ).run();
  
  const result = await c.env.DB.prepare(
    "UPDATE sequences SET value = value + 1 WHERE name = 'asset_id' RETURNING value"
  ).first<{ value: number }>();
  
  const sequence = result?.value || 1;
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

    // 3. Resolve UUID (Moved up for immutable file naming)
    let id: string;
    
    if (providedAssetId) {
      // Create vs Update check
      // Ideally we should check if it exists in DB
      const existing = await c.env.DB.prepare("SELECT id FROM assets WHERE asset_id = ?").bind(providedAssetId).first<{ id: string }>();
      
      if (existing) {
        id = existing.id;
      } else {
        // Fallback or error - if we have asset_id but no DB record, assume new but pre-assigned ID? 
        // For safety, let's treat it as new if not found, but we should log this.
        console.warn(`Asset ID ${providedAssetId} provided but not found in DB. Creating new UUID.`);
        id = crypto.randomUUID();
      }
    } else {
      id = crypto.randomUUID();
    }

    // 2. Handle File Uploads (Independent) using UUID for keys
    // 2. Handle File Uploads (Optimistic Keys + Async Processing)
    // Deterministic Keys based on UUID
    const idPath = id; 
    let thumbnailKey: string | null = null;
    let pdfKey: string | null = null;
    let sourceKey: string | null = null;
    let ogKey: string | null = null;

    // Detect what we have
    const hasThumbnailUpload = thumbnailFile && thumbnailFile instanceof File;
    const hasPdfUpload = pdfFile && pdfFile instanceof File;
    const hasSourceUpload = sourceFile && sourceFile instanceof File;

    // Set keys optimistically if we have the file OR can generate it (Source available)
    if (hasThumbnailUpload || hasSourceUpload) {
      thumbnailKey = `thumbnails/${idPath}.webp`;
      ogKey = `og-images/${idPath}.png`; // OG generated if thumbnail exists/generated
    }
    if (hasPdfUpload || hasSourceUpload) {
      pdfKey = `pdfs/${idPath}.pdf`;
    }
    if (hasSourceUpload) {
      sourceKey = `sources/${idPath}.svg`;
    }

    // A. Synchronous Uploads (Fast R2 PUTs)
    let sourceSvgContent: string | null = null;

    if (hasThumbnailUpload) {
       console.log(`Uploading provided thumbnail for ${assetId}...`);
       await c.env.ASSETS_PUBLIC.put(thumbnailKey!, thumbnailFile as File);
    }
    if (hasPdfUpload) {
       console.log(`Uploading provided PDF for ${assetId}...`);
       await c.env.ASSETS_PRIVATE.put(pdfKey!, pdfFile as File);
    }
    if (hasSourceUpload) {
       console.log(`[Sync] Reading & Uploading Source SVG for ${assetId}...`);
       // Read content into memory to ensure availability for background task
       sourceSvgContent = await (sourceFile as File).text();
       await c.env.ASSETS_PRIVATE.put(sourceKey!, sourceSvgContent);
    }

    // B. Background Processing (Slow Container Calls)
    // We use c.executionCtx.waitUntil to ensure this runs after response is returned
    c.executionCtx.waitUntil((async () => {
      try {
        console.log(`[Background] Starting processing for ${assetId} (UUID: ${idPath})...`);
        
        // 1. Get Source Content
        // Use the content we already read synchronously
        const svgContent = sourceSvgContent;
        
        if (hasSourceUpload && !svgContent) {
           console.error(`[Background] Error: Has source upload but content is missing!`);
        } else if (svgContent) {
           console.log(`[Background] Source content available (${svgContent.length} chars).`);
        }

        let currentThumbnailBase64: string | null = null;
        let currentThumbnailMime = "image/webp";

        // Define parallel tasks
        const thumbnailAndOgTask = async () => {
            try {
                // 2. Generate Thumbnail (if missing and have source)
                if (!hasThumbnailUpload && hasSourceUpload && svgContent && thumbnailKey) {
                   console.log(`[Background] Generating Thumbnail for ${assetId}...`);
                   // Use 600px width for better performance
                   const res = await generateThumbnailViaContainer(c.env, svgContent, 600);
                   
                   const buf = Uint8Array.from(atob(res.imageBase64), x => x.charCodeAt(0));
                   await c.env.ASSETS_PUBLIC.put(thumbnailKey, buf, { 
                     httpMetadata: { contentType: res.mimeType } 
                   });
                   
                   currentThumbnailBase64 = res.imageBase64;
                   currentThumbnailMime = res.mimeType;
                } else if (hasThumbnailUpload && thumbnailKey) {
                   // Read uploaded thumbnail for OG generation
                   const obj = await c.env.ASSETS_PUBLIC.get(thumbnailKey);
                   if (obj) {
                     const buf = await obj.arrayBuffer();
                     currentThumbnailBase64 = arrayBufferToBase64(buf);
                   }
                }

                // 3. Generate OG Image (needs thumbnail)
                if (currentThumbnailBase64 && ogKey) {
                   console.log(`[Background] Generating OG for ${assetId}...`);
                   const { imageBase64 } = await generateOgImageViaContainer(c.env, title, currentThumbnailBase64, currentThumbnailMime);
                   const buf = Uint8Array.from(atob(imageBase64), x => x.charCodeAt(0));
                   await c.env.ASSETS_PUBLIC.put(ogKey, buf, { httpMetadata: { contentType: "image/png" } });
                }
            } catch (err) {
                console.error(`[Background] Thumbnail/OG Task failed:`, err);
            }
        };

        const pdfTask = async () => {
            try {
                // 4. Generate PDF (if missing and have source)
                if (!hasPdfUpload && hasSourceUpload && svgContent && pdfKey) {
                   console.log(`[Background] Generating PDF for ${assetId}...`);
                   const { pdfBase64 } = await generatePdfViaContainer(
                     c.env,
                     svgContent,
                     `${assetId}-${slug}`,
                     {
                       title: (title as string) || "",
                       assetId: idPath,
                       description: (description as string) || "",
                       qrCodeUrl: "https://huepress.co/review"
                     }
                   );
                   const buf = Uint8Array.from(atob(pdfBase64), x => x.charCodeAt(0));
                   await c.env.ASSETS_PRIVATE.put(pdfKey, buf, {
                     httpMetadata: {
                       contentType: "application/pdf",
                       contentDisposition: `attachment; filename="${assetId}-${slug}.pdf"`
                     }
                   });
                }
            } catch (err) {
                 console.error(`[Background] PDF Task failed:`, err);
            }
        };

        // Run tasks in parallel to avoid timeout
        await Promise.allSettled([thumbnailAndOgTask(), pdfTask()]);
        
        console.log(`[Background] Processing complete for ${assetId}`);

      } catch (err) {
        console.error(`[Background] Error processing ${assetId}:`, err);
      }
    })());
    
    // 4. Insert or Update into D1
    const tagsArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const tagsJson = JSON.stringify(tagsArray);

    // ID is already resolved above
    
    // Check if updating a reserved asset (re-using logic but simplified since we have ID)
    if (providedAssetId) {
      // We already resolved 'id'
      const existing = await c.env.DB.prepare("SELECT id FROM assets WHERE id = ?").bind(id).first();
      
      if (existing) {
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

        if (ogKey) {
          fields.push("r2_key_og = ?");
          values.push(ogKey);
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
            r2_key_public, r2_key_private, r2_key_source, r2_key_og, status, tags, 
            extended_description, fun_facts, suggested_activities, 
            coloring_tips, therapeutic_benefits, meta_keywords,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          id, assetId, slug, title, description, category, skill,
          thumbnailKey || "__draft__", pdfKey || "__draft__", sourceKey || null, ogKey || null, status, tagsJson,
          extendedDescription, funFacts, suggestedActivities,
          coloringTips, therapeuticBenefits, metaKeywords
        ).run();
      }
    } else {
      // Standard Insert (New asset flow without ID)
      await c.env.DB.prepare(`
        INSERT INTO assets (
          id, asset_id, slug, title, description, category, skill, 
          r2_key_public, r2_key_private, r2_key_source, r2_key_og, status, tags, 
          extended_description, fun_facts, suggested_activities, 
          coloring_tips, therapeutic_benefits, meta_keywords,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, assetId, slug, title, description, category, skill,
        thumbnailKey, pdfKey, sourceKey || null, ogKey || null, status, tagsJson,
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
  }
});


// ADMIN: Get Design Requests
app.get("/requests", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  if (!isAdmin(adminEmail, c.env.ADMIN_EMAILS)) return c.json({ error: "Unauthorized" }, 401);

  const { status } = c.req.query();
  
  let query = "SELECT * FROM design_requests";
  const params: string[] = [];
  
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
  const updates: string[] = [];
  const params: string[] = [];
  
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

