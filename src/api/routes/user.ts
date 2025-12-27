import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { Bindings } from "../types";

const app = new Hono<{ Bindings: Bindings }>();

// Helper to get DB user ID from Clerk ID
import { Context } from "hono";

async function getDbUser(c: Context<{ Bindings: Bindings }>, clerkId: string) {
  return await c.env.DB.prepare("SELECT id FROM users WHERE clerk_id = ?").bind(clerkId).first();
}

// GET /likes - List liked assets
app.get("/likes", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);

  const user = await getDbUser(c, auth.userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT a.*, l.created_at as liked_at
    FROM likes l
    JOIN assets a ON l.asset_id = a.id
    WHERE l.user_id = ?
    ORDER BY l.created_at DESC
  `).bind(user.id).all();

  const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
  const likes = results.map((row: Record<string, unknown>) => {
    const r2Key = row.r2_key_public as string | undefined;
    let imageUrl = row.image_url as string | undefined;
    
    if (r2Key && !r2Key.startsWith("__draft__")) {
      imageUrl = r2Key.startsWith("http") ? r2Key : `${cdnUrl}/${r2Key}`;
    }

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      image_url: imageUrl
    };
  });

  return c.json({ likes });
});

// POST /likes/:assetId - Toggle like
app.post("/likes/:assetId", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);
  
  const assetId = c.req.param("assetId");
  const user = await getDbUser(c, auth.userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  // Check if exists
  const existing = await c.env.DB.prepare(
    "SELECT id FROM likes WHERE user_id = ? AND asset_id = ?"
  ).bind(user.id, assetId).first();

  if (existing) {
    // Unlike
    await c.env.DB.prepare(
      "DELETE FROM likes WHERE user_id = ? AND asset_id = ?"
    ).bind(user.id, assetId).run();
    return c.json({ liked: false });
  } else {
    // Like
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO likes (id, user_id, asset_id) VALUES (?, ?, ?)"
    ).bind(id, user.id, assetId).run();
    return c.json({ liked: true });
  }
});

// GET /history - List downloads/prints
app.get("/history", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);

  const user = await getDbUser(c, auth.userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const { results } = await c.env.DB.prepare(`
    SELECT a.*, d.downloaded_at, d.type
    FROM downloads d
    JOIN assets a ON d.asset_id = a.id
    WHERE d.user_id = ?
    ORDER BY d.downloaded_at DESC
  `).bind(user.id).all();

  const cdnUrl = c.env.ASSETS_CDN_URL || "https://assets.huepress.co";
  const history = results.map((row: Record<string, unknown>) => {
    const r2Key = row.r2_key_public as string | undefined;
    let imageUrl = row.image_url as string | undefined;
    
    if (r2Key && !r2Key.startsWith("__draft__")) {
      imageUrl = r2Key.startsWith("http") ? r2Key : `${cdnUrl}/${r2Key}`;
    }

    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      image_url: imageUrl
    };
  });

  return c.json({ history });
});

// POST /activity - Record download or print
app.post("/activity", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json(); // { assetId, type: 'download' | 'print' }
  const { assetId, type } = body;

  if (!assetId || !type) return c.json({ error: "Missing fields" }, 400);

  const user = await getDbUser(c, auth.userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO downloads (id, user_id, asset_id, type) VALUES (?, ?, ?, ?)"
  ).bind(id, user.id, assetId, type).run();

  // Increment asset download count if typo is download (or print?)
  // Maybe just increment for both
  await c.env.DB.prepare(
    "UPDATE assets SET download_count = download_count + 1 WHERE id = ?"
  ).bind(assetId).run();

  return c.json({ success: true, id });
});

export default app;
