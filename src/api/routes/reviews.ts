import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { Bindings, Review } from "../types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<{ Bindings: Bindings }>();

// [F-001] Review creation schema with validation
const createReviewSchema = z.object({
  asset_id: z.string().uuid("Invalid asset ID format"),
  rating: z.number().int("Rating must be an integer").min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  comment: z.string().max(2000, "Comment cannot exceed 2000 characters").optional()
});

// GET /reviews/:assetId - Get all reviews for an asset
app.get("/:assetId", async (c) => {
  const assetId = c.req.param("assetId");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    // Optimization: Run independent queries in parallel
    // 1. Fetch paginated reviews list (no subqueries)
    // 2. Fetch aggregate stats once
    
    const [listResult, statsResult] = await Promise.all([
      c.env.DB.prepare(`
        SELECT r.*, u.email as user_email
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.asset_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(assetId, limit, offset).all<Review>(),

      c.env.DB.prepare(`
        SELECT COUNT(*) as total_count, AVG(rating) as avg_rating
        FROM reviews
        WHERE asset_id = ?
      `).bind(assetId).first<{ total_count: number; avg_rating: number | null }>()
    ]);
    
    const avgRating = statsResult?.avg_rating || null;
    const totalReviews = statsResult?.total_count || 0;
    
    // Cache reviews for short period (60s), allow stale up to 5 mins
    c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    
    return c.json({
      reviews: listResult.results || [],
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      totalReviews,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return c.json({ error: "Failed to fetch reviews" }, 500);
  }
});

// POST /reviews - Create a new review (subscribers only)
// [F-001] Now uses Zod validation for input
app.post("/", zValidator("json", createReviewSchema), async (c) => {
  const auth = getAuth(c);
  
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    // Get user from DB
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE clerk_id = ?"
    ).bind(auth.userId).first<{ id: string; subscription_status: string }>();
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Check if subscriber
    if (user.subscription_status !== "active") {
      return c.json({ error: "Only subscribers can leave reviews" }, 403);
    }
    
    const { asset_id, rating, comment } = c.req.valid("json");
    
    // Check if user already reviewed this asset
    const existing = await c.env.DB.prepare(
      "SELECT id FROM reviews WHERE user_id = ? AND asset_id = ?"
    ).bind(user.id, asset_id).first();
    
    if (existing) {
      return c.json({ error: "You have already reviewed this asset" }, 409);
    }
    
    // Create review
    const reviewId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO reviews (id, user_id, asset_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).bind(reviewId, user.id, asset_id, rating, comment || null).run();
    
    return c.json({ 
      success: true, 
      review: { id: reviewId, rating, comment }
    }, 201);
  } catch (error) {
    console.error("Error creating review:", error);
    return c.json({ error: "Failed to create review" }, 500);
  }
});

// DELETE /reviews/:id - Delete own review
app.delete("/:id", async (c) => {
  const auth = getAuth(c);
  const reviewId = c.req.param("id");
  
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    // Get user
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE clerk_id = ?"
    ).bind(auth.userId).first<{ id: string }>();
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Delete only if user owns the review
    const result = await c.env.DB.prepare(
      "DELETE FROM reviews WHERE id = ? AND user_id = ?"
    ).bind(reviewId, user.id).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: "Review not found or not authorized" }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return c.json({ error: "Failed to delete review" }, 500);
  }
});

export default app;
