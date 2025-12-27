import { Hono } from "hono";
import { Bindings } from "../types";
import { notifyIndexNow, buildAssetUrl } from "../../lib/indexnow";
import { getContainer } from "@cloudflare/containers";

// Container calls are now fire-and-forget via direct fetch

// Retry helper for container calls (handles cold starts)
async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  maxRetries: number = 5,
  initialDelayMs: number = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      // Check for container not ready errors in response
      if (response.status >= 500) {
        const text = await response.text();
        if (text.includes('not listening') || text.includes('container')) {
          throw new Error(`Container not ready: ${text}`);
        }
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      const errorMsg = (err as Error).message || '';
      // Only retry on container-specific errors
      if (errorMsg.includes('not listening') || errorMsg.includes('container') || errorMsg.includes('Network')) {
        const delay = initialDelayMs * Math.pow(1.5, attempt); // Exponential backoff
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      // For other errors, throw immediately
      throw err;
    }
  }
  throw lastError;
}

const app = new Hono<{ Bindings: Bindings }>();

import { getAuth } from "@hono/clerk-auth";

// Admin Middleware Check
import { Context } from "hono";

// Admin Middleware Check
async function verifyAdmin(c: Context<{ Bindings: Bindings }>): Promise<boolean> {
  const auth = getAuth(c);
  if (!auth?.userId) return false;

  // Try 1: Check Clerk publicMetadata.role from session claims
  // This works if custom claims are configured in Clerk Dashboard
  const sessionClaims = auth.sessionClaims as { publicMetadata?: { role?: string } } | undefined;
  if (sessionClaims?.publicMetadata?.role === 'admin') {
    return true;
  }

  // Try 2: Fallback to Clerk Backend API (if session claims don't include publicMetadata)
  // This is slower but always works
  try {
    const clerkSecretKey = c.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      return false;
    }
    
    const response = await fetch(`https://api.clerk.com/v1/users/${auth.userId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error("Clerk API error:", response.status);
      return false;
    }
    
    const userData = await response.json() as { public_metadata?: { role?: string } };
    return userData?.public_metadata?.role === 'admin';
  } catch (e) {
    console.error("Admin verification failed:", e);
    return false;
  }
}

// ADMIN: Create Draft Asset (called on SVG upload)
// Saves all current form data and returns the generated assetId & slug
app.post("/create-draft", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) return c.json({ error: "Unauthorized" }, 401);

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
  const isAdminUser = await verifyAdmin(c);
  
  if (!isAdminUser) {
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
  const isAdminUser = await verifyAdmin(c);
  
  if (!isAdminUser) {
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
  const isAdminUser = await verifyAdmin(c);
  
  if (!isAdminUser) {
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
  const isAdminUser = await verifyAdmin(c);
  
  if (!isAdminUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }


  let id: string | undefined;
  let isNewAsset = false;

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
    // 3. Resolve UUID (Moved up for immutable file naming)
    
    if (providedAssetId) {
      // Create vs Update check
      const existing = await c.env.DB.prepare("SELECT id FROM assets WHERE asset_id = ?").bind(providedAssetId).first<{ id: string }>();
      
      if (existing) {
        id = existing.id;
      } else {
        console.warn(`Asset ID ${providedAssetId} provided but not found in DB. Creating new UUID.`);
        id = crypto.randomUUID();
        isNewAsset = true;
      }
    } else {
      id = crypto.randomUUID();
      isNewAsset = true;
    }

    const tagsArray = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    const tagsJson = JSON.stringify(tagsArray);

    // 0. PRE-INSERT (Transaction Start)
    // If this is a new asset, insert a "pending" record immediately.
    // This ensures we have a DB row to track the files we are about to upload.
    if (isNewAsset) {
        await c.env.DB.prepare(`
        INSERT INTO assets (
          id, asset_id, slug, title, description, category, skill, 
          r2_key_public, r2_key_private, r2_key_source, r2_key_og, status, tags, 
          extended_description, fun_facts, suggested_activities, 
          coloring_tips, therapeutic_benefits, meta_keywords,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_upload', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        id, assetId, slug, title, description, category, skill,
        "__pending__", "__pending__", null, null, tagsJson,
        extendedDescription, funFacts, suggestedActivities,
        coloringTips, therapeuticBenefits, metaKeywords
      ).run();
      console.log(`[Create] Inserted pending record for ${assetId}`);
    }

    // 2. Handle File Uploads (Independent) using UUID for keys
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


        // A. Parallel Uploads (Fast R2 PUTs - run concurrently)
        let sourceSvgContent: string | null = null;

        // Read SVG content first if needed (required synchronously for background task)
        if (hasSourceUpload) {
           sourceSvgContent = await (sourceFile as File).text();
        }

        // Run all R2 uploads in parallel
        const uploadPromises: Promise<void>[] = [];
        
        if (hasThumbnailUpload) {
           console.log(`Uploading thumbnail for ${assetId}...`);
           uploadPromises.push(c.env.ASSETS_PUBLIC.put(thumbnailKey!, thumbnailFile as File).then(() => {}));
        }
        if (hasPdfUpload) {
           console.log(`Uploading PDF for ${assetId}...`);
           uploadPromises.push(c.env.ASSETS_PRIVATE.put(pdfKey!, pdfFile as File).then(() => {}));
        }
        if (hasSourceUpload && sourceSvgContent) {
           console.log(`Uploading Source SVG for ${assetId}...`);
           uploadPromises.push(c.env.ASSETS_PRIVATE.put(sourceKey!, sourceSvgContent).then(() => {}));
        }

        // Wait for all uploads to complete in parallel
        if (uploadPromises.length > 0) {
           console.log(`[Parallel] Uploading ${uploadPromises.length} files concurrently...`);
           await Promise.all(uploadPromises);
           console.log(`[Parallel] All uploads completed for ${assetId}.`);
        }

        // 4. Upsert / Finalize (Transaction Commit) - DO THIS FIRST
        // Build Dynamic Update Query
        const fields: string[] = [];
        const values: unknown[] = [];

        // Always update metadata
        fields.push("slug = ?"); values.push(slug);
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
          fields.push("r2_key_public = ?"); values.push(thumbnailKey);
        }
        if (pdfKey) {
          fields.push("r2_key_private = ?"); values.push(pdfKey);
        }
        if (sourceKey) {
          fields.push("r2_key_source = ?"); values.push(sourceKey);
        }
        if (ogKey) {
          fields.push("r2_key_og = ?"); values.push(ogKey);
        }

        values.push(id);
        const query = `UPDATE assets SET ${fields.join(", ")} WHERE id = ?`;
        await c.env.DB.prepare(query).bind(...values).run();

        // 5. INSERT JOB INTO PROCESSING QUEUE (if source was uploaded)
        // Check for skip_processing flag (used for auto-saves that shouldn't trigger generation)
        const skipProcessing = body["skip_processing"] === "true";

        if (hasSourceUpload && !skipProcessing) {
          // Check for existing pending job to prevent duplicates (e.g. double submit)
          const existingJob = await c.env.DB.prepare(
            "SELECT id FROM processing_queue WHERE asset_id = ? AND status = 'pending' AND job_type = 'generate_all'"
          ).bind(id).first();

          let jobId;
          if (existingJob) {
             console.log(`[Queue] Pending job already exists for asset ${id}, skipping insert`);
             jobId = existingJob.id;
          } else {
            jobId = crypto.randomUUID();
            await c.env.DB.prepare(`
              INSERT INTO processing_queue (id, asset_id, job_type, status)
              VALUES (?, ?, 'generate_all', 'pending')
            `).bind(jobId, id).run();
            
            console.log(`[Queue] Job ${jobId} created for asset ${assetId}`);
          }
          
          // 6. FIRE LIGHTWEIGHT KICK TO CONTAINER (no waiting, no retries)
          // Container will poll the queue and process jobs
          c.executionCtx.waitUntil((async () => {
            try {
              const container = (await import("@cloudflare/containers")).getContainer(c.env.PROCESSING, "main");
              console.log(`[Queue] Sending wakeup to container for job ${jobId}...`);
              
              const res = await container.fetch("http://container/wakeup", { 
                method: "GET",
                headers: { 
                  "X-Internal-Secret": c.env.CONTAINER_AUTH_SECRET || "",
                  "X-Set-Internal-Token": c.env.INTERNAL_API_TOKEN || "",
                  "X-Set-Auth-Secret": c.env.CONTAINER_AUTH_SECRET || ""
                }
              });
              
              console.log(`[Queue] Wakeup sent. Status: ${res.status}`);
            } catch (err) {
              console.error(`[Queue] Failed to send wakeup signal:`, err);
            }
          })());
        }

        // Notify IndexNow for published assets (fire-and-forget)
        if (status === 'published') {
          c.executionCtx.waitUntil(
            notifyIndexNow(buildAssetUrl(assetId, slug))
              .catch(err => console.error('[IndexNow] Notification failed:', err))
          );
        }

        // 7. RETURN RESPONSE IMMEDIATELY - queue job will be processed in background
        return c.json({ success: true, id, assetId });

    } catch (error) {
        console.error("Asset creation error:", error);
        
        // ROLLBACK: If it was a new asset, delete the pending ID to prevent orphans/zombies
        if (isNewAsset) {
            console.warn(`[Rollback] Deleting pending asset ${id} due to upload failure.`);
            try {
                await c.env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
            } catch (cleanupErr) {
                console.error("Failed to cleanup pending asset:", cleanupErr);
            }
        }
        
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: `Failed to create/update asset: ${errorMessage}` }, 500);
    }
});

// ADMIN: Get Dashboard Stats
app.get("/stats", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  
  if (!isAdminUser) {
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
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.param();

  try {
    // Get asset to find R2 keys
    const asset = await c.env.DB.prepare(
      "SELECT r2_key_private, r2_key_public, r2_key_source, r2_key_og FROM assets WHERE id = ?"
    ).bind(id).first<{ r2_key_private: string | null; r2_key_public: string | null; r2_key_source: string | null; r2_key_og: string | null }>();

    if (!asset) {
      console.log(`[Delete] Asset ${id} not found`);
      return c.json({ error: "Asset not found" }, 404);
    }

    console.log(`[Delete] Deleting Asset ${id}. Keys found: Private=${asset.r2_key_private}, Public=${asset.r2_key_public}, OG=${asset.r2_key_og}, Source=${asset.r2_key_source}`);

    // Delete from R2 - with proper null checks for older assets
    if (asset.r2_key_private && !asset.r2_key_private.startsWith("__draft__") && !asset.r2_key_private.startsWith("__pending__")) {
      await c.env.ASSETS_PRIVATE.delete(asset.r2_key_private);
      console.log(`[Delete] Deleted Private: ${asset.r2_key_private}`);
    }
    if (asset.r2_key_public && !asset.r2_key_public.startsWith("__draft__") && !asset.r2_key_public.startsWith("__pending__")) {
      await c.env.ASSETS_PUBLIC.delete(asset.r2_key_public);
      console.log(`[Delete] Deleted Public: ${asset.r2_key_public}`);
    }
    if (asset.r2_key_og && !asset.r2_key_og.startsWith("__draft__") && !asset.r2_key_og.startsWith("__pending__")) {
       console.log(`[Delete] Attempting to delete OG: ${asset.r2_key_og}`);
       await c.env.ASSETS_PUBLIC.delete(asset.r2_key_og);
       console.log(`[Delete] Deleted OG: ${asset.r2_key_og}`);
    } else {
       console.log(`[Delete] OG key skipped (Missing or Draft): ${asset.r2_key_og}`);
    }
    
    if (asset.r2_key_source && !asset.r2_key_source.startsWith("__draft__") && !asset.r2_key_source.startsWith("__pending__")) {
      await c.env.ASSETS_PRIVATE.delete(asset.r2_key_source);
      console.log(`[Delete] Deleted Source: ${asset.r2_key_source}`);
    }

    // Delete from dependent tables first (Manual Cascade)
    // D1/SQLite FKs might strictly enforce this if CASCADE isn't set
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM downloads WHERE asset_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM reviews WHERE asset_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM likes WHERE asset_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM asset_tags WHERE asset_id = ?").bind(id), // Just in case
      c.env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(id)
    ]);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return c.json({ error: "Failed to delete asset" }, 500);
  }
});

// ADMIN: Get Asset Source (SVG)
app.get("/assets/:id/source", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) {
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
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) {
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
        "SELECT r2_key_private, r2_key_public, r2_key_source, r2_key_og FROM assets WHERE id = ?"
      ).bind(id).first<{ r2_key_private: string | null; r2_key_public: string | null; r2_key_source: string | null; r2_key_og: string | null }>();

      if (asset) {
        console.log(`[Bulk Delete] Deleting Asset ${id}. OG=${asset.r2_key_og}`);

        // Delete from R2 (with null/draft checks)
        if (asset.r2_key_private && !asset.r2_key_private.startsWith("__draft__") && !asset.r2_key_private.startsWith("__pending__")) {
          await c.env.ASSETS_PRIVATE.delete(asset.r2_key_private);
        }
        if (asset.r2_key_public && !asset.r2_key_public.startsWith("__draft__") && !asset.r2_key_public.startsWith("__pending__")) {
          await c.env.ASSETS_PUBLIC.delete(asset.r2_key_public);
        }
        if (asset.r2_key_og && !asset.r2_key_og.startsWith("__draft__") && !asset.r2_key_og.startsWith("__pending__")) {
          await c.env.ASSETS_PUBLIC.delete(asset.r2_key_og);
          console.log(`[Bulk Delete] Deleted OG: ${asset.r2_key_og}`);
        }
        if (asset.r2_key_source && !asset.r2_key_source.startsWith("__draft__") && !asset.r2_key_source.startsWith("__pending__")) {
          await c.env.ASSETS_PRIVATE.delete(asset.r2_key_source);
        }

        // Delete from database (Manual Cascade)
        await c.env.DB.batch([
          c.env.DB.prepare("DELETE FROM downloads WHERE asset_id = ?").bind(id),
          c.env.DB.prepare("DELETE FROM reviews WHERE asset_id = ?").bind(id),
          c.env.DB.prepare("DELETE FROM likes WHERE asset_id = ?").bind(id),
          c.env.DB.prepare("DELETE FROM asset_tags WHERE asset_id = ?").bind(id),
          c.env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(id)
        ]);
        deletedCount++;
      }
    }

    return c.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return c.json({ error: "Failed to delete assets" }, 500);
  }
});

// ADMIN: Bulk update status (publish/unpublish)
app.post("/assets/bulk-status", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { ids, status } = await c.req.json<{ ids: string[]; status: 'published' | 'draft' }>();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "No IDs provided" }, 400);
    }
    
    if (!status || !['published', 'draft'].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    console.log(`[Bulk Status] Updating ${ids.length} assets to ${status}...`);

    // Batch update all assets
    const placeholders = ids.map(() => '?').join(',');
    await c.env.DB.prepare(
      `UPDATE assets SET status = ? WHERE id IN (${placeholders})`
    ).bind(status, ...ids).run();

    console.log(`[Bulk Status] Updated ${ids.length} assets to ${status}`);
    return c.json({ success: true, updatedCount: ids.length });
  } catch (error) {
    console.error("Bulk status error:", error);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// ADMIN: Bulk regenerate assets (thumbnail, OG, PDF)
app.post("/assets/bulk-regenerate", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { ids } = await c.req.json<{ ids: string[] }>();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: "No IDs provided" }, 400);
    }

    console.log(`[Bulk Regenerate] Starting for ${ids.length} assets...`);

    let queuedCount = 0;

    // Process each asset - insert into queue
    let jobsCreated = 0;

    for (const id of ids) {
       // Verify asset exists and has source
       const asset = await c.env.DB.prepare(
        "SELECT id, asset_id, r2_key_source FROM assets WHERE id = ?"
      ).bind(id).first<{ id: string; asset_id: string; r2_key_source: string | null }>();

      if (!asset || !asset.r2_key_source) {
        console.warn(`[Bulk Regenerate] Skipping ${id} - not found or no source`);
        continue;
      }

      // Check for existing pending job
      const existingJob = await c.env.DB.prepare(
        "SELECT id FROM processing_queue WHERE asset_id = ? AND status = 'pending' AND job_type = 'generate_all'"
      ).bind(id).first();

      if (existingJob) {
         console.log(`[Bulk Regenerate] Pending job already exists for ${asset.asset_id}, skipping`);
         continue;
      }

      // Create Job
      const jobId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO processing_queue (id, asset_id, job_type, status)
        VALUES (?, ?, 'generate_all', 'pending')
      `).bind(jobId, id).run();
      
      console.log(`[Bulk Regenerate] Enqueued job ${jobId} for ${asset.asset_id}`);
      jobsCreated++;
      queuedCount++;
    }

    // Trigger Container Wakeup if jobs were created
    if (jobsCreated > 0) {
      c.executionCtx.waitUntil((async () => {
        try {
          const container = getContainer(c.env.PROCESSING, "main");
          console.log(`[Bulk Regenerate] Sending wakeup to container...`);
          
          await fetchWithRetry(() => container.fetch("http://container/wakeup", { 
            method: "GET",
            headers: { 
              "X-Internal-Secret": c.env.CONTAINER_AUTH_SECRET || "",
              "X-Set-Internal-Token": c.env.INTERNAL_API_TOKEN || "",
              "X-Set-Auth-Secret": c.env.CONTAINER_AUTH_SECRET || ""
            }
          }));
        } catch (err) {
          console.error(`[Bulk Regenerate] Failed to wakeup container:`, err);
        }
      })());
    }

    console.log(`[Bulk Regenerate] Queued ${queuedCount} assets for processing`);
    return c.json({ success: true, queuedCount });
  } catch (error) {
    console.error("Bulk regenerate error:", error);
    return c.json({ error: "Failed to queue regeneration" }, 500);
  }
});

// ADMIN: Regenerate OG Image
app.post("/assets/:id/regenerate-og", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) return c.json({ error: "Unauthorized" }, 401);

  const { id } = c.req.param();

  try {
    const asset = await c.env.DB.prepare(
      "SELECT * FROM assets WHERE id = ?"
    ).bind(id).first<{ 
      title: string; 
      asset_id: string;
      r2_key_public: string | null; 
      r2_key_source: string | null;
      r2_key_og: string | null;
    }>();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    if (!asset.r2_key_public && !asset.r2_key_source) {
      return c.json({ error: "No source or thumbnail available to generate OG image" }, 400);
    }

    // Fetch thumbnail content (fallback)
    let thumbBase64 = null;
    if (asset.r2_key_public) {
       const thumbObject = await c.env.ASSETS_PUBLIC.get(asset.r2_key_public);
       if (thumbObject) {
         const thumbBuffer = await thumbObject.arrayBuffer();
         thumbBase64 = btoa(String.fromCharCode(...new Uint8Array(thumbBuffer)));
       }
    }
    
    // Fetch Source SVG (preferred)
    let svgContent = null;
    if (asset.r2_key_source) {
       try {
         const sourceObject = await c.env.ASSETS_PRIVATE.get(asset.r2_key_source);
         if (sourceObject) {
            svgContent = await sourceObject.text();
         }
       } catch (e) {
         console.warn("Failed to fetch source SVG for OG regen:", e);
       }
    }

    // Prepare target OG key
    let ogKey = asset.r2_key_og;
    if (!ogKey) {
       ogKey = `og-images/${id}.png`;
       // Update DB with new key
       await c.env.DB.prepare("UPDATE assets SET r2_key_og = ? WHERE id = ?").bind(ogKey, id).run();
    }

    // Call Container
    const apiBaseUrl = c.env.API_URL || 'https://api.huepress.co';
    const container = getContainer(c.env.PROCESSING, "main");
    
    const response = await fetchWithRetry(() => container.fetch("http://container/og-image", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-Internal-Secret": c.env.CONTAINER_AUTH_SECRET || ""
        },
        body: JSON.stringify({
            title: asset.title,
            thumbnailBase64: thumbBase64,
            svgContent: svgContent,
            uploadUrl: `${apiBaseUrl}/api/internal/upload-public`,
            uploadKey: ogKey,
            uploadToken: c.env.INTERNAL_API_TOKEN
        })
    }));

    if (!response.ok) {
        throw new Error(`Container error: ${response.status}`);
    }

    return c.json({ success: true, message: "OG regeneration started" });

  } catch (error) {
    console.error("Regenerate OG error:", error);
    return c.json({ error: "Failed to regenerate OG" }, 500);
  }
});


// ADMIN: Get Design Requests
app.get("/requests", async (c) => {
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) return c.json({ error: "Unauthorized" }, 401);

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
  const isAdminUser = await verifyAdmin(c);
  if (!isAdminUser) return c.json({ error: "Unauthorized" }, 401);
  
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

