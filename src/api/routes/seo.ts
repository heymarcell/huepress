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

// Helper: OpenAIChat
async function openAIChat(apiKey: string, messages: any[], jsonMode = false) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
  });
  
  const data = await response.json() as any;
  if (!response.ok) {
     throw new Error(data.error?.message || "OpenAI API Error");
  }
  return data.choices[0].message.content;
}

// POST /api/seo/generate
// Admin logic to generate a landing page
app.post("/generate", async (c) => {
  const body = await c.req.json<{ keyword: string }>();
  const keyword = body.keyword;

  if (!keyword) return c.json({ error: "Keyword required" }, 400);

  const apiKey = c.env.OPENAI_API_KEY;
  if (!apiKey) {
      return c.json({ error: "Configuration Error: OPENAI_API_KEY is missing." }, 500);
  }

  // 1. Search Logic: Find candidates
  // We look for assets that match the keyword text broadly.
  // Using simple LIKE for now as FTS requires specific setup, but title/tags usually suffice.
  const searchPattern = `%${keyword}%`;
  const candidates = await c.env.DB.prepare(`
    SELECT id, title, description, tags, category 
    FROM assets 
    WHERE status = 'published' 
    AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
    LIMIT 30
  `).bind(searchPattern, searchPattern, searchPattern).all<Asset>();

  if (!candidates.results || candidates.results.length < 4) {
      return c.json({ error: "Not enough assets found to generate a collection. Need at least 4." }, 400);
  }

  // 2. AI Curation: "Pick the best 8"
  // We feed the candidates to GPT-4o-mini
  const curationPrompt = `
    You are an expert curator for coloring pages.
    Goal: Select the best 8 assets for the keyword: "${keyword}".
    Candidates:
    ${JSON.stringify(candidates.results.map(a => ({ id: a.id, title: a.title, tags: a.tags })))}

    Return valid JSON with a single key "selected_ids" containing the array of 8 IDs. 
    Strictly prefer assets that are actually relevant. If fewer than 8 are relevant, return fewer.
  `;

  let selectedIds: string[] = [];
  try {
     const rawJson = await openAIChat(apiKey, [{ role: "user", content: curationPrompt }], true);
     const parsed = JSON.parse(rawJson);
     selectedIds = parsed.selected_ids || [];
  } catch (e) {
     console.error("Curation failed", e);
     // Fallback: just take top 8
     selectedIds = candidates.results.slice(0, 8).map(a => a.id);
  }

  if (selectedIds.length === 0) {
     return c.json({ error: "AI could not find relevant assets." }, 400);
  }

  // 3. AI Writing: Title, Meta, Intro
  const writingPrompt = `
    You are an SEO expert for a coloring page website "HuePress".
    Write the content for a landing page targeting the keyword: "${keyword}".
    
    Requirements:
    - Title: Catchy, includes keyword, mentions "Printable PDF". Max 60 chars.
    - Meta Description: Click-worthy summary. Max 160 chars.
    - Intro Content: A helpful, warm, 250-word introduction in Markdown.
      - Explain why these coloring pages are great for this topic.
      - Mention benefits (motor skills, relaxation).
      - Do NOT mention "free" unless you are sure. Use "printable", "downloadable".
    
    Return valid JSON: { "title": "...", "meta_description": "...", "intro_content": "..." }
  `;

  let content = { title: "", meta_description: "", intro_content: "" };
  try {
    const rawJson = await openAIChat(apiKey, [{ role: "user", content: writingPrompt }], true);
    content = JSON.parse(rawJson);
  } catch (e) {
     console.error("Writing failed", e);
     return c.json({ error: "AI writing failed" }, 500);
  }

  // 4. Save to DB
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // Ensure uniqueness? We might overwrite or fail. Migration said UNIQUE on slug.
  // Use INSERT OR REPLACE
  
  const landingPageId = crypto.randomUUID();
  try {
      await c.env.DB.prepare(`
        INSERT OR REPLACE INTO landing_pages (id, slug, target_keyword, title, meta_description, intro_content, asset_ids, is_published, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).bind(
          landingPageId, 
          slug, 
          keyword, 
          content.title, 
          content.meta_description, 
          content.intro_content, 
          JSON.stringify(selectedIds)
      ).run();
  } catch (e) {
      console.error("DB Insert failed", e);
      return c.json({ error: "Failed to save page to database" }, 500);
  }

  return c.json({ 
    success: true, 
    slug, 
    url: `/collection/${slug}`,
    stats: {
        candidatesFound: candidates.results.length,
        selected: selectedIds.length
    }
  });
});

export default app;
