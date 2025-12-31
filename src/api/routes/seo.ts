import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { Env } from "../types";
import { Asset } from "../types";
import { discoverKeywords } from "../services/keywords";
import { getAllSeeds, PRIORITY_SEEDS } from "../services/seed-library";

const app = new Hono<{ Bindings: Env }>();

interface LandingPageRecord {
  id: string;
  slug: string;
  target_keyword: string;
  title: string;
  meta_description: string;
  intro_content: string;
  asset_ids: string;
  is_published: number;
  created_at: string;
  updated_at?: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    }
  }[];
  error?: {
    message: string;
  };
}

// GET /api/seo/landing-pages - List all landing pages (admin only)
app.get("/landing-pages", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check admin
  const sessionClaims = auth.sessionClaims as { publicMetadata?: { role?: string } } | undefined;
  if (sessionClaims?.publicMetadata?.role !== 'admin') {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    // Pagination params
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const search = c.req.query("search")?.trim();

    // Build WHERE clause for search
    let whereClause = "";
    const params: string[] = [];
    
    if (search) {
      whereClause = "WHERE title LIKE ? OR target_keyword LIKE ? OR slug LIKE ?";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM landing_pages ${whereClause}`
    ).bind(...params).first<{ total: number }>();

    // Get paginated results
    const pages = await c.env.DB.prepare(
      `SELECT id, slug, target_keyword, title, is_published, created_at 
       FROM landing_pages ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    ).bind(...params, limit.toString(), offset.toString()).all<LandingPageRecord>();

    return c.json({ 
      pages: pages.results || [],
      total: countResult?.total || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("Failed to list pages:", error);
    return c.json({ error: "Failed to list pages" }, 500);
  }
});

// DELETE /api/seo/landing-pages/:id - Delete a landing page (admin only)
app.delete("/landing-pages/:id", async (c) => {
  const id = c.req.param("id");
  const auth = getAuth(c);
  
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Check admin
  const sessionClaims = auth.sessionClaims as { publicMetadata?: { role?: string } } | undefined;
  if (sessionClaims?.publicMetadata?.role !== 'admin') {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    await c.env.DB.prepare("DELETE FROM landing_pages WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete page:", error);
    return c.json({ error: "Failed to delete page" }, 500);
  }
});


// GET /api/seo/landing-pages/:slug
app.get("/landing-pages/:slug", async (c) => {
  const slug = c.req.param("slug");
  
  // 1. Fetch Page from DB
  const page = await c.env.DB.prepare(
    "SELECT * FROM landing_pages WHERE slug = ?"
  ).bind(slug).first<LandingPageRecord>();

  if (!page) {
    return c.json({ error: "Page not found" }, 404);
  }

  // 2. Hydrate Assets from stored asset_ids
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
       assets: [],
       related: []
     });
  }

  // 3. Fetch actual asset data
  const placeholders = assetIds.map(() => "?").join(",");
  const assetsResult = await c.env.DB.prepare(
    `SELECT * FROM assets WHERE id IN (${placeholders}) AND status = 'published'`
  ).bind(...assetIds).all<Asset>();

  // 4. Transform assets to include image_url
  const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
  const transformedAssets = (assetsResult.results || []).map((asset) => {
    const r2Key = (asset as any).r2_key_public;
    let imageUrl = "";
    
    if (r2Key && typeof r2Key === 'string' && !r2Key.startsWith("__draft__")) {
      // If already a full URL, use as-is; otherwise prepend CDN
      imageUrl = r2Key.startsWith("http") ? r2Key : `${cdnUrl}/${r2Key}`;
    }
    
    const tags = asset.tags;
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : [];
    
    return {
      ...asset,
      tags: parsedTags,
      image_url: imageUrl,
    };
  });

  // 4. Fetch Related Collections (Internal Linking Mesh)
  // Simple strategy: Random 8 other pages.
  const related = await c.env.DB.prepare(
    "SELECT slug, title, target_keyword FROM landing_pages WHERE is_published = 1 AND id != ? ORDER BY RANDOM() LIMIT 8"
  ).bind(page.id).all<{ slug: string; title: string; target_keyword: string }>();

  // 5. Set aggressive cache headers (24 hours)
  c.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  
  return c.json({
    ...page,
    assets: transformedAssets,
    related: related.results || []
  });
});

// Helper: OpenAIChat
async function openAIChat(apiKey: string, messages: { role: "system" | "user" | "assistant"; content: string }[], jsonMode = false) {
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
  
  const data = await response.json() as OpenAIResponse;
  if (!response.ok) {
     throw new Error(data.error?.message || "OpenAI API Error");
  }
  return data.choices[0].message.content;
}

// POST /api/seo/generate
// Admin logic to generate a landing page
app.post("/generate", async (c) => {
  const body = await c.req.json<{ keyword: string; force?: boolean }>();
  const keyword = body.keyword;
  
  if (!keyword) return c.json({ error: "Keyword required" }, 400);

  const apiKey = c.env.OPENAI_API_KEY;
  if (!apiKey) {
      return c.json({ error: "Configuration Error: OPENAI_API_KEY is missing." }, 500);
  }

  // 1. Search Logic: Find candidates
  // Strategy: 
  // A. Strict Match (Exact phrase)
  // B. Broad Match (Any of the non-stopword tokens)
  
  const searchPattern = `%${keyword}%`;
  const candidates = await c.env.DB.prepare(`
    SELECT id, title, description, tags, category 
    FROM assets 
    WHERE status = 'published' 
    AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
    LIMIT 30
  `).bind(searchPattern, searchPattern, searchPattern).all<Asset>();

  // Fallback: Broad Match if strict returned too few
  if (!candidates.results || candidates.results.length < 10) {
      const stopWords = ["coloring", "page", "pages", "printable", "sheet", "sheets", "pdf", "book", "for", "kids", "adults", "free", "download"];
      const tokens = keyword.toLowerCase().split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
      
      if (tokens.length > 0) {
          // Construct OR query for tokens
          // "SELECT ... WHERE ... AND ( (title LIKE %t1% OR ...) )"
          const conditions = tokens.map(() => "(title LIKE ? OR description LIKE ? OR tags LIKE ?)").join(" OR ");
          const bindings = tokens.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`]);
          
          const broadCandidates = await c.env.DB.prepare(`
            SELECT id, title, description, tags, category 
            FROM assets 
            WHERE status = 'published' 
            AND (${conditions})
            LIMIT 50
          `).bind(...bindings).all<Asset>(); // Use spread for bindings

          // Merge results, removing duplicates
          const existingIds = new Set(candidates.results?.map(a => a.id) || []);
          const newItems = broadCandidates.results?.filter(a => !existingIds.has(a.id)) || [];
          
          candidates.results = [...(candidates.results || []), ...newItems];
      }
  }

  // Final fallback: If still < 4, maybe the database is just empty or assets are untagged?
  // We strictly require 4 to make a decent page.
  if (!candidates.results || candidates.results.length < 4) {
      return c.json({ 
        error: `Found only ${candidates.results?.length || 0} assets. Need at least 4. Try a broader keyword or add more assets.`,
        debug_tokens: keyword.split(/\s+/)
      }, 400);
  }

  //2. AI Curation: "Pick the best 8"
  // We feed the candidates to GPT-4o-mini
  const curationPrompt = `
    You are an expert curator for coloring pages.
    
    CRITICAL: Your job is to ensure INTENT MATCH. Users searching for specific keywords expect specific types of designs.
    
    Target Keyword: "${keyword}"
    
    Candidates:
    ${JSON.stringify(candidates.results.map(a => ({ 
      id: a.id, 
      title: a.title, 
      category: a.category,
      skill: a.skill,
      description: a.description,
      tags: a.tags 
    })))}
    
    **STRICT RULES:**
    
    1. **Relevance First**: ONLY select assets that DIRECTLY match the keyword intent.
       - If keyword is "geometric patterns" → ONLY select patterns (mandalas, tessellations, chevrons), NOT scenes (snowplows, astronauts).
       - If keyword is "anxiety relief" → Select calming/abstract designs, NOT busy/complex scenes.
       - If keyword is "kids" → Select age-appropriate, simple designs.
    
    2. **Metadata Matching**:
       - **Skill Level**: If keyword implies "easy" or "kids", prioritize 'skill: "beginner"'. If "intricate" or "adults", prioritize 'skill: "intermediate"' or 'skill: "advanced"'.
       - **Category**: STRONGLY PREFER category alignment.
         - If keyword is Nature/Garden → Avoid 'Food', 'Vehicles', 'Space' unless the visual context is overwhelmingly relevant (e.g., a picnic in a garden is okay).
         - If keyword is Food/Cooking → Avoid 'Nature', 'Animals' unless they are part of the cooking scene.
       - **Description**: Use the 'description' to verify specific details. 

    3. **Visual Relevance Check**: 
       - Imagine the visualization. Does the PRIMARY subject match?
       - "Pizza" is NOT a Garden Scene (even if outdoors).
       - "Snowplow" is NOT a Geometric Pattern.
       - REJECT if the **main subject** conflicts with the keyword intent.
    
    4. **Smart Selection & Quantity**: 
       - You MUST return at least 6-8 assets. 
       - If you find fewer than 6 Perfect Strict matches, **FILL** the remaining slots with "Broadly Related" assets (e.g., generic flowers/nature for "garden"). 
       - It is better to have "somewhat related" fillers than an empty grid.
    
    5. **Minimum Standards**: Return 6-8 assets.
       - Priority 1: Strict Match (Perfect intent)
       - Priority 2: Broad Match (Same category but generic)
    
    BAD Example:
    Keyword: "geometric patterns"
    Selected: ["Snowplow Morning Street Scene", "Space Explorer Astronaut"]
    → These are SCENES, not PATTERNS. Wrong intent!
    
    BAD Example 2:
    Keyword: "garden coloring pages"
    Selected: ["Build Your Own Pizza Night"]
    → Pizza is FOOD, not a Garden Scene. Even if it happens outdoors, it's not the primary subject. REJECT.

    GOOD Example:
    Keyword: "geometric patterns"
    Selected: ["Ocean Wave Chevron Mosaic", "China Slice Tile Pattern", "Mandala Circle Design"]
    → These are ACTUAL patterns. Correct intent!
    
    Return valid JSON with a single key "selected_ids" containing the array of IDs (4-8 items).
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
    You are an SEO expert for HuePress, a premium coloring pages website.
    Create ENGAGING, human-first content for: "${keyword}"
    
    CRITICAL RULES:
    1. Write for HUMANS first, bots second
    2. NO keyword stuffing - vary your language naturally
    3. Keep intro SHORT and scannable - users want to see images, not read essays
    
    Requirements:
    
    **Title** (Max 60 chars):
    - Include keyword naturally
    - Mention "Printable PDF" or "Coloring Pages"
    - Make it compelling, not robotic
    - Example: "Mandala Coloring Pages: 20+ Printable PDF Designs"
    
    **Meta Description** (Max 160 chars):
    - Click-worthy benefit statement
    - Mention HOW MANY designs (e.g., "Browse 15+ printable...")
    - Include ONE secondary keyword (stress relief, adults, kids, etc.)
    - NO keyword repetition from title
    
    **Intro Content** (EXACTLY 2-3 SHORT paragraphs in Markdown):
    
    STRUCTURE (Non-negotiable):
    - **Paragraph 1** (2-3 sentences): Hook with a benefit or problem solved. Be warm and conversational.
    - **Paragraph 2** (3-4 sentences): Explain what makes these designs special (style, difficulty, use case).
    - **STOP THERE** - Users want to browse images, not read a blog post.
    
    STYLE RULES:
    - Use second person ("you," "your") - talk TO the reader
    - Vary sentence length for rhythm
    - ONE emoji MAX (optional, only if natural)
    - Break up text with line breaks - no walls of text
    - Mention 1-2 specific benefits (motor skills, mindfulness, creativity)
    - NEVER repeat the exact keyword more than twice total
    
    BAD Example (Keyword Stuffing):
    "Art Therapy Coloring Pages for Relaxation\\n\\nDiscover our art therapy coloring pages for relaxation. These art therapy pages help with relaxation..."
    
    GOOD Example (Natural):
    "Looking for a creative way to unwind? These intricate mandala designs offer the perfect escape from daily stress.\\n\\nEach page features hand-curated patterns ranging from beginner-friendly to complex geometrics..."
    
    Return ONLY valid JSON:
    {
      "title": "...",
      "meta_description": "...",
      "intro_content": "..." 
    }
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
  
  // Check if page already exists
  const existingPage = await c.env.DB.prepare(
    "SELECT id FROM landing_pages WHERE slug = ? OR target_keyword = ?"
  ).bind(slug, keyword).first<{ id: string }>();
  
  let landingPageId = crypto.randomUUID();

  if (existingPage) {
    if (body.force) {
      // If force is true, reuse ID and delete old record to ensure clean state
      landingPageId = existingPage.id as ReturnType<typeof crypto.randomUUID>;
      await c.env.DB.prepare("DELETE FROM landing_pages WHERE id = ?").bind(existingPage.id).run();
    } else {
      return c.json({ 
        error: `Page already exists for keyword "${keyword}"`,
        slug,
        url: `/collection/${slug}`
      }, 409); // 409 Conflict
    }
  }
  
  try {
      await c.env.DB.prepare(`
        INSERT INTO landing_pages (id, slug, target_keyword, title, meta_description, intro_content, asset_ids, is_published, created_at)
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

// GET /api/seo/sitemap
// Returns all published landing page slugs for sitemap generation
app.get("/sitemap", async (c) => {
  const pages = await c.env.DB.prepare(
    "SELECT slug, updated_at, created_at FROM landing_pages WHERE is_published = 1"
  ).all<{ slug: string; updated_at: string; created_at: string }>();

  return c.json({ 
    pages: pages.results 
  });
});

// POST /api/seo/research
// Smart Keyword Discovery
app.post("/research", async (c) => {
  const body = await c.req.json<{ seed: string }>();
  if (!body.seed) return c.json({ error: "Seed keyword required" }, 400);

  const keywords = await discoverKeywords(body.seed, c.env);
  
  return c.json({ 
    success: true,
    ...keywords  // Spread to avoid nested results.results
  });
});

// POST /api/seo/bulk-auto-generate
// Fully Automated: Research + Generate for all seed words
app.post("/bulk-auto-generate", async (c) => {
  const body = await c.req.json<{ mode?: 'priority' | 'full'; limit?: number }>();
  const mode = body.mode || 'priority';
  const limit = body.limit || 50;
  
  const apiKey = c.env.OPENAI_API_KEY;
  if (!apiKey) {
      return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  // Choose seeds based on mode
  const seeds = mode === 'priority' ? PRIORITY_SEEDS : getAllSeeds();
  
  const results: { seed: string; discovered: number; generated: number; errors: string[] }[] = [];
  let totalGenerated = 0;

  for (const seed of seeds) {
    if (totalGenerated >= limit) break;

    const seedResult = {
      seed,
      discovered: 0,
      generated: 0,
      errors: [] as string[]
    };

    try {
      // 1. Research keywords for this seed
      const keywordsResponse = await discoverKeywords(seed, c.env);
      const keywords = keywordsResponse.results;
      seedResult.discovered = keywords.length;

      // 2. Generate pages for top keywords (limit to 5 per seed to avoid overwhelming)
      const topKeywords = keywords.slice(0, 5);

      for (const kw of topKeywords) {
        if (totalGenerated >= limit) break;

        try {
          // Check if slug already exists (deduplication)
          const slug = kw.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const existing = await c.env.DB.prepare(
            "SELECT id FROM landing_pages WHERE slug = ?"
          ).bind(slug).first();

          if (existing) {
            seedResult.errors.push(`${kw.keyword}: Already exists`);
            continue;
          }

          // Generate the page (reuse logic from POST /generate)
          // For brevity, I'll call the generation inline
          // In production, you might extract this to a shared function

          const searchPattern = `%${kw.keyword}%`;
          const candidates = await c.env.DB.prepare(`
            SELECT id, title, description, tags, category 
            FROM assets 
            WHERE status = 'published' 
            AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
            LIMIT 30
          `).bind(searchPattern, searchPattern, searchPattern).all<Asset>();

          // Fallback broad search
          if (!candidates.results || candidates.results.length < 10) {
              const stopWords = ["coloring", "page", "pages", "printable", "sheet", "sheets", "pdf", "book", "for", "kids", "adults", "free", "download"];
              const tokens = kw.keyword.toLowerCase().split(/\s+/).filter((w: string) => !stopWords.includes(w) && w.length > 2);
              
              if (tokens.length > 0) {
                  const conditions = tokens.map(() => "(title LIKE ? OR description LIKE ? OR tags LIKE ?)").join(" OR ");
                  const bindings = tokens.flatMap((t: string) => [`%${t}%`, `%${t}%`, `%${t}%`]);
                  
                  const broadCandidates = await c.env.DB.prepare(`
                    SELECT id, title, description, tags, category 
                    FROM assets 
                    WHERE status = 'published' 
                    AND (${conditions})
                    LIMIT 50
                  `).bind(...bindings).all<Asset>();

                  const existingIds = new Set(candidates.results?.map(a => a.id) || []);
                  const newItems = broadCandidates.results?.filter(a => !existingIds.has(a.id)) || [];
                  
                  candidates.results = [...(candidates.results || []), ...newItems];
              }
          }

          if (!candidates.results || candidates.results.length < 4) {
              seedResult.errors.push(`${kw.keyword}: Not enough assets (<4)`);
              continue;
          }

          // AI Curation (simplified - top 8)
          const selectedIds = candidates.results.slice(0, 8).map(a => a.id);

          // AI Writing
          const writingPrompt = `
            You are an SEO expert for a coloring page website "HuePress".
            Write the content for a landing page targeting the keyword: "${kw.keyword}".
            
            Requirements:
            - Title: Catchy, includes keyword, mentions "Printable PDF". Max 60 chars.
            - Meta Description: Click-worthy summary. Max 160 chars.
            - Intro Content: A helpful, warm, 250-word introduction in Markdown.
              - Explain why these coloring pages are great for this topic.
              - Mention benefits (motor skills, relaxation).
              - Do NOT mention "free" unless you are sure. Use "printable", "downloadable".
            
            Return valid JSON: { "title": "...", "meta_description": "...", "intro_content": "..." }
          `;

          const rawJson = await openAIChat(apiKey, [{ role: "user", content: writingPrompt }], true);
          const content = JSON.parse(rawJson);

          // Save to DB
          const landingPageId = crypto.randomUUID();
          await c.env.DB.prepare(`
            INSERT OR REPLACE INTO landing_pages (id, slug, target_keyword, title, meta_description, intro_content, asset_ids, is_published, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
          `).bind(
              landingPageId, 
              slug, 
              kw.keyword, 
              content.title, 
              content.meta_description, 
              content.intro_content, 
              JSON.stringify(selectedIds)
          ).run();

          seedResult.generated++;
          totalGenerated++;

        } catch (e) {
          seedResult.errors.push(`${kw.keyword}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

    } catch (e) {
      seedResult.errors.push(`Research failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    results.push(seedResult);
  }

  return c.json({
    success: true,
    mode,
    totalGenerated,
    results
  });
});

export default app;
