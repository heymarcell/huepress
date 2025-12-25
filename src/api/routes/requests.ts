import { Hono } from "hono";
import { Bindings } from "../types";
import { getAuth } from "@hono/clerk-auth";

const app = new Hono<{ Bindings: Bindings }>();

// Create a design request
app.post("/", async (c) => {
  try {
    const auth = getAuth(c);
    const body = await c.req.json();
    const { title, description, email } = body;
    
    // Simple validation
    if (!title || !description || !email) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    const id = crypto.randomUUID();
    const userId = auth?.userId || null; // Can be anonymous
    
    // If logged in, we might want to resolve their internal user ID from our DB if we strictly enforce FK
    // But for now, let's assume passed userId is the Clerk ID?
    // Wait, DB schema `user_id` FK references `users(id)` which is the DB ID, not Clerk ID.
    // The `users` table has `clerk_id` and `id`.
    
    let dbUserId = null;
    
    if (userId) {
       // Look up user internal ID by clerk_id
       const user = await c.env.DB.prepare("SELECT id, email FROM users WHERE clerk_id = ?").bind(userId).first<{ id: string, email: string }>();
       if (user) {
         dbUserId = user.id;
         // Optional: verify email matches? Nah, trust the form/auth context for now
       }
    }

    await c.env.DB.prepare(
      `INSERT INTO design_requests (id, user_id, email, title, description, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).bind(id, dbUserId, email, title, description).run();
    
    return c.json({ success: true, id });
  } catch (error) {
    console.error("Create request error:", error);
    return c.json({ error: "Failed to submit request" }, 500);
  }
});

export default app;
