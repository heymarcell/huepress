import { Hono } from "hono";
import { Bindings, Tag } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// GET /tags - Get all tags, optionally filtered by type (with edge caching)
app.get("/", async (c) => {
  // Check edge cache first (caches.default is Cloudflare Workers API)
  // Check edge cache first (caches.default is Cloudflare Workers API)
  let cache: Cache | undefined;
  try {
     if (typeof caches !== 'undefined') {
        cache = (caches as unknown as { default: Cache }).default;
     }
  } catch (_e) { /* ignore in tests/local */ }

  const cacheKey = new Request(c.req.url, { method: "GET" });
  
  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set("X-Cache", "HIT");
      return response;
    }
  }

  const type = c.req.query("type");

  try {
    let query = "SELECT * FROM tags";
    const params: string[] = [];

    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY type, display_order";

    const result = await c.env.DB.prepare(query)
      .bind(...params)
      .all<Tag>();

    // 1. Group official tags
    const grouped = (result.results || []).reduce((acc, tag) => {
      // Skip static themes (user requested dynamic only)
      if (tag.type === "theme") return acc;
      
      if (!acc[tag.type]) {
        acc[tag.type] = [];
      }
      acc[tag.type].push(tag);
      return acc;
    }, {} as Record<string, Tag[]>);

    // 2. Fetch used tags from assets to make "Themes" dynamic
    // Only do this if asking for all tags or specifically themes
    if (!type || type === 'theme') {
       try {
         // Get all tags from assets
         const assetTagsResult = await c.env.DB.prepare("SELECT tags FROM assets WHERE status = 'published'").all<{tags: string}>();
         const usedTagsSet = new Set<string>();
         
         assetTagsResult.results?.forEach(row => {
            if (row.tags) {
              try {
                const tagsArray = JSON.parse(row.tags);
                if (Array.isArray(tagsArray)) {
                  tagsArray.forEach((t: unknown) => {
                     // Normalize string
                     if (typeof t === 'string' && t.length > 0) usedTagsSet.add(t.trim());
                  });
                }
              } catch (_e) { /* ignore parse error */ }
            }
         });

         // Filter out known tags (categories, skills, existing themes)
         const knownTagNames = new Set(result.results?.map(t => t.name) || []);
         
         // Add unknown tags to "theme" group (dynamic themes)
         if (!grouped['theme']) grouped['theme'] = [];
         
         const dynamicTags: Tag[] = Array.from(usedTagsSet)
            .filter(t => !knownTagNames.has(t))
            .sort()
            .map(t => ({
               id: `dyn-${t}`,
               name: t,
               slug: t.toLowerCase().replace(/\s+/g, '-'),
               type: 'theme',
               description: 'User generated tag',
               display_order: 999
            }));
            
         grouped['theme'].push(...dynamicTags);
         
         // Sort themes: Official first (by display_order), then Dynamic (alphabetical)
         grouped['theme'].sort((a, b) => {
            if (a.display_order !== b.display_order) return (a.display_order || 0) - (b.display_order || 0);
            return a.name.localeCompare(b.name);
         });

       } catch (err) {
         console.warn("Failed to aggregate dynamic tags", err);
       }
    }

    const responseData = {
      tags: result.results || [],
      grouped,
    };
    
    const response = c.json(responseData);
    // Cache for 5 minutes - tags rarely change
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    response.headers.set("X-Cache", "MISS");
    
    // Store in edge cache
    if (cache) {
      c.executionCtx.waitUntil(
        cache.put(cacheKey, response.clone())
      );
    }
    
    return response;
  } catch (error) {
    console.error("Error fetching tags:", error);
    return c.json({ error: "Failed to fetch tags" }, 500);
  }
});

// GET /tags/:id - Get a single tag
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const tag = await c.env.DB.prepare(
      "SELECT * FROM tags WHERE id = ? OR slug = ?"
    )
      .bind(id, id)
      .first<Tag>();

    if (!tag) {
      return c.json({ error: "Tag not found" }, 404);
    }

    return c.json({ tag });
  } catch (error) {
    console.error("Error fetching tag:", error);
    return c.json({ error: "Failed to fetch tag" }, 500);
  }
});

// GET /tags/asset/:assetId - Get tags for a specific asset
app.get("/asset/:assetId", async (c) => {
  const assetId = c.req.param("assetId");

  try {
    const result = await c.env.DB.prepare(`
      SELECT t.* FROM tags t
      INNER JOIN asset_tags at ON t.id = at.tag_id
      WHERE at.asset_id = ?
      ORDER BY t.type, t.display_order
    `)
      .bind(assetId)
      .all<Tag>();

    return c.json({ tags: result.results || [] });
  } catch (error) {
    console.error("Error fetching asset tags:", error);
    return c.json({ error: "Failed to fetch asset tags" }, 500);
  }
});

export default app;
