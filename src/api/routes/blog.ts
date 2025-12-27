import { Hono } from "hono";
import { Bindings } from "../types";
import { getAuth } from "@hono/clerk-auth";
import { Context } from "hono";

const app = new Hono<{ Bindings: Bindings }>();

// Helper: Verify admin role
async function verifyAdmin(c: Context<{ Bindings: Bindings }>): Promise<boolean> {
  const auth = getAuth(c);
  if (!auth?.userId) return false;
  
  const claims = auth.sessionClaims;
  const role = (claims?.publicMetadata as { role?: string })?.role;
  return role === "admin";
}

// Helper: Generate slug from title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============================================
// PUBLIC ENDPOINTS
// ============================================

// GET /posts - List published posts with pagination
app.get("/posts", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = parseInt(c.req.query("offset") || "0");
    
    // Combined query: get posts AND total count in one round-trip
    const { results } = await c.env.DB.prepare(`
      SELECT id, title, slug, excerpt, cover_image, published_at, created_at,
        (SELECT COUNT(*) FROM posts WHERE status = 'published') as total_count
      FROM posts
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    const total = (results?.[0] as { total_count?: number })?.total_count || 0;
    
    // Cache blog listing
    c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    
    return c.json({ 
      posts: results || [],
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

// GET /posts/:slug - Get single published post by slug
app.get("/posts/:slug", async (c) => {
  try {
    const { slug } = c.req.param();
    
    const post = await c.env.DB.prepare(`
      SELECT id, title, slug, excerpt, content, cover_image, published_at, created_at, updated_at
      FROM posts
      WHERE slug = ? AND status = 'published'
    `).bind(slug).first();
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    return c.json({ post });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return c.json({ error: "Failed to fetch post" }, 500);
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /admin/posts - List all posts (draft & published)
app.get("/admin/posts", async (c) => {
  const isAdmin = await verifyAdmin(c);
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const [postsResult, countResult] = await Promise.all([
      c.env.DB.prepare(`
        SELECT id, title, slug, excerpt, cover_image, status, published_at, created_at, updated_at
        FROM posts
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all(),
      
      c.env.DB.prepare("SELECT COUNT(*) as total FROM posts").first<{ total: number }>()
    ]);
    
    return c.json({ 
      posts: postsResult.results || [],
      total: countResult?.total || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error("Failed to fetch admin posts:", error);
    return c.json({ error: "Failed to fetch posts" }, 500);
  }
});

// GET /admin/posts/:id - Get single post by ID for editing
app.get("/admin/posts/:id", async (c) => {
  const isAdmin = await verifyAdmin(c);
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const { id } = c.req.param();
    
    const post = await c.env.DB.prepare(`
      SELECT * FROM posts WHERE id = ?
    `).bind(id).first();
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    return c.json({ post });
  } catch (error) {
    console.error("Failed to fetch post:", error);
    return c.json({ error: "Failed to fetch post" }, 500);
  }
});

// POST /admin/posts - Create new post
app.post("/admin/posts", async (c) => {
  const isAdmin = await verifyAdmin(c);
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const body = await c.req.json();
    const { title, excerpt, content, cover_image, status, published_at } = body;
    let { slug } = body;
    
    // Validate required fields
    if (!title) {
      return c.json({ error: "Title is required" }, 400);
    }
    
    // Auto-generate slug if not provided
    if (!slug) {
      slug = slugify(title);
    }
    
    // Ensure slug is unique
    const existingPost = await c.env.DB.prepare(
      "SELECT id FROM posts WHERE slug = ?"
    ).bind(slug).first();
    
    if (existingPost) {
      // Append timestamp to make unique
      slug = `${slug}-${Date.now()}`;
    }
    
    const id = crypto.randomUUID();
    const finalStatus = status || "draft";
    const finalPublishedAt = finalStatus === "published" 
      ? (published_at || new Date().toISOString())
      : null;
    
    await c.env.DB.prepare(`
      INSERT INTO posts (id, slug, title, excerpt, content, cover_image, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      slug,
      title,
      excerpt || null,
      content || "",
      cover_image || null,
      finalStatus,
      finalPublishedAt
    ).run();
    
    return c.json({ success: true, id, slug });
  } catch (error) {
    console.error("Failed to create post:", error);
    return c.json({ error: "Failed to create post" }, 500);
  }
});

// PUT /admin/posts/:id - Update post
app.put("/admin/posts/:id", async (c) => {
  const isAdmin = await verifyAdmin(c);
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { title, slug, excerpt, content, cover_image, status, published_at } = body;
    
    // Check post exists
    const existingPost = await c.env.DB.prepare(
      "SELECT * FROM posts WHERE id = ?"
    ).bind(id).first<{ status: string; published_at: string }>();
    
    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    // If slug changed, check uniqueness
    if (slug) {
      const slugConflict = await c.env.DB.prepare(
        "SELECT id FROM posts WHERE slug = ? AND id != ?"
      ).bind(slug, id).first();
      
      if (slugConflict) {
        return c.json({ error: "Slug already exists" }, 400);
      }
    }
    
    // Set published_at when transitioning to published
    let finalPublishedAt = published_at;
    if (status === "published" && existingPost.status !== "published" && !existingPost.published_at) {
      finalPublishedAt = new Date().toISOString();
    }
    
    await c.env.DB.prepare(`
      UPDATE posts SET
        title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        excerpt = ?,
        content = COALESCE(?, content),
        cover_image = ?,
        status = COALESCE(?, status),
        published_at = COALESCE(?, published_at),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      title || null,
      slug || null,
      excerpt ?? null,
      content || null,
      cover_image ?? null,
      status || null,
      finalPublishedAt || null,
      id
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to update post:", error);
    return c.json({ error: "Failed to update post" }, 500);
  }
});

// DELETE /admin/posts/:id - Delete post
app.delete("/admin/posts/:id", async (c) => {
  const isAdmin = await verifyAdmin(c);
  if (!isAdmin) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const { id } = c.req.param();
    
    // Check post exists
    const existingPost = await c.env.DB.prepare(
      "SELECT id FROM posts WHERE id = ?"
    ).bind(id).first();
    
    if (!existingPost) {
      return c.json({ error: "Post not found" }, 404);
    }
    
    await c.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return c.json({ error: "Failed to delete post" }, 500);
  }
});

export default app;
