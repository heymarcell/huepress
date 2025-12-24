import { Hono } from "hono";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Admin check using environment variable
function isAdmin(email: string | undefined, adminEmails: string): boolean {
  if (!email) return false;
  const allowedEmails = adminEmails.split(',').map(e => e.trim().toLowerCase());
  return allowedEmails.includes(email.toLowerCase());
}

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

// ADMIN: Create new asset
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
    
    // Extract files
    const thumbnailFile = body["thumbnail"] as File;
    const pdfFile = body["pdf"] as File;

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
    const funFacts = body["fun_facts"] as string || "[]"; // Expecting JSON string
    const suggestedActivities = body["suggested_activities"] as string || "[]"; // Expecting JSON string

    if (!title || !category || !skill || !thumbnailFile || !pdfFile) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // 1. Upload Thumbnail to Public R2
    const thumbnailKey = `thumbnails/${Date.now()}_${thumbnailFile.name}`;
    await c.env.ASSETS_PUBLIC.put(thumbnailKey, thumbnailFile);
    const thumbnailUrl = `${c.env.ASSETS_CDN_URL}/${thumbnailKey}`;

    // 2. Upload PDF to Private R2
    const pdfKey = `pdfs/${Date.now()}_${pdfFile.name}`;
    await c.env.ASSETS_PRIVATE.put(pdfKey, pdfFile);

    // 3. Generate SEO ID and Slug
    const code = CATEGORY_CODES[category] || "GEN";
    const prefix = `HP-${code}-`;
    
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

    const assetId = `${prefix}${sequence.toString().padStart(4, '0')}`;
    const slug = slugify(title);

    // 4. Insert into D1
    const id = crypto.randomUUID();
    // Parse tags string into JSON array
    const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);
    
    await c.env.DB.prepare(`
      INSERT INTO assets (
        id, asset_id, slug, title, description, category, skill, 
        image_url, r2_key_private, status, tags, 
        extended_description, fun_facts, suggested_activities, 
        coloring_tips, therapeutic_benefits, meta_keywords,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        id, assetId, slug, title, description, category, skill,
        thumbnailUrl, pdfKey, status, JSON.stringify(tagsArray),
        extendedDescription, funFacts, suggestedActivities,
        coloringTips, therapeuticBenefits, metaKeywords
      )
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    console.error("Asset creation error:", error);
    return c.json({ error: "Failed to create asset" }, 500);
  }
});

export default app;
