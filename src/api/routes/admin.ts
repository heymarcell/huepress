import { Hono } from "hono";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Middleware or helper for admin check could be added here
const ADMIN_EMAILS = ["marcell@neongod.io"];

function isAdmin(email?: string) {
  return email && ADMIN_EMAILS.includes(email);
}

// ADMIN: Get all assets (including drafts)
app.get("/assets", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  
  if (!isAdmin(adminEmail)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM assets ORDER BY created_at DESC"
    ).all();
    
    const assets = results?.map((asset: any) => ({
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags) : [],
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
  
  if (!isAdmin(adminEmail)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.parseBody();
    
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

    if (!title || !category || !skill || !thumbnailFile || !pdfFile) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // 1. Upload Thumbnail to Public R2
    const thumbnailKey = `thumbnails/${Date.now()}_${thumbnailFile.name}`;
    await c.env.ASSETS_PUBLIC.put(thumbnailKey, thumbnailFile);
    const thumbnailUrl = `https://assets.huepress.co/${thumbnailKey}`; // Or R2 dev URL

    // 2. Upload PDF to Private R2
    const pdfKey = `pdfs/${Date.now()}_${pdfFile.name}`;
    await c.env.ASSETS_PRIVATE.put(pdfKey, pdfFile);

    // 3. Insert into D1
    const id = crypto.randomUUID();
    const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);
    
    await c.env.DB.prepare(`
      INSERT INTO assets (
        id, title, description, category, skill, 
        image_url, r2_key_private, 
        status, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        id, title, description, category, skill,
        thumbnailUrl, pdfKey,
        status, JSON.stringify(tagsArray)
      )
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    console.error("Asset creation error:", error);
    return c.json({ error: "Failed to create asset" }, 500);
  }
});

export default app;
