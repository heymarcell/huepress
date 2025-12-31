import { Hono } from "hono";
import { Env } from "../types";
import { Asset } from "../types";

const app = new Hono<{ Bindings: Env }>();

// GET /api/seo/landing-pages/:slug
app.get("/landing-pages/:slug", async (c) => {
  const slug = c.req.param("slug");
  
  // 1. Fetch Page from DB
  const page = await c.env.DB.prepare(
    "SELECT * FROM landing_pages WHERE slug = ?"
  ).bind(slug).first<any>();

  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  // 2. Hydrate Assets
  // The DB stores asset_ids as a JSON string array ["id1", "id2"]
  let assetIds: string[] = [];
  try {
    assetIds = JSON.parse(page.asset_ids);
  } catch (e) {
    console.error("Failed to parse asset_ids", e);
    assetIds = [];
  }

  if (assetIds.length === 0) {
     return c.json({
       ...page,
       assets: []
     });
  }

  // 3. Fetch actual asset data
  // We need to construct a query with enough placeholders
  const placeholders = assetIds.map(() => "?").join(",");
  const assets = await c.env.DB.prepare(
    `SELECT * FROM assets WHERE id IN (${placeholders}) AND status = 'published'`
  ).bind(...assetIds).all<Asset>();

  return c.json({
    ...page,
    assets: assets.results
  });
});

// POST /api/seo/generate
// Admin only endpoint to trigger the AI generation
app.post("/generate", async (c) => {
  const body = await c.req.json<{ keyword: string; mode?: 'openai' | 'mock' }>();
  const keyword = body.keyword;

  if (!keyword) return c.json({ error: "Keyword required" }, 400);

  // TODO: Verify Admin Auth
  // We will ask user for API Key before implementing the real writer.
  
  return c.json({ 
    message: "Generation endpoint is ready. Waiting for OpenAI Key integration.",
    status: "pending_key"
  });
});

export default app;
