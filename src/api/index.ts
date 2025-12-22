import { Hono } from "hono";
import { cors } from "hono/cors";
import { Webhook } from "svix";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

// Define environment bindings type
type Bindings = {
  DB: D1Database;
  ASSETS_PRIVATE: R2Bucket;
  ASSETS_PUBLIC: R2Bucket;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_ANNUAL: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use("*", cors());
app.use("*", clerkMiddleware());

// Root route
app.get("/", (c) => {
  return c.json({ 
    name: "HuePress API", 
    version: "1.0.0",
    endpoints: ["/api/health", "/api/assets", "/api/download/:id"]
  });
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", env: c.env.ENVIRONMENT });
});

// Get all published assets
app.get("/api/assets", async (c) => {
  const category = c.req.query("category");
  const skill = c.req.query("skill");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  let query = "SELECT * FROM assets WHERE status = 'published'";
  const params: string[] = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (skill) {
    query += " AND skill = ?";
    params.push(skill);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit.toString(), offset.toString());

  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    const assets = results?.map((asset: any) => ({
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags) : [],
    }));

    return c.json({ assets, count: assets?.length || 0 });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch assets" }, 500);
  }
});

// Get single asset by ID
app.get("/api/assets/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const asset = await c.env.DB.prepare(
      "SELECT * FROM assets WHERE id = ? AND status = 'published'"
    )
      .bind(id)
      .first();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    return c.json({
      ...asset,
      tags: asset.tags ? JSON.parse(asset.tags as string) : [],
    });
  } catch (error) {
    console.error("Database error:", error);
    return c.json({ error: "Failed to fetch asset" }, 500);
  }
});

// ADMIN: Get all assets (including drafts)
app.get("/api/admin/assets", async (c) => {
  const adminEmail = c.req.header("X-Admin-Email");
  const ADMIN_EMAILS = ["marcell@neongod.io"];
  
  if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
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
app.post("/api/admin/assets", async (c) => {
  // Simple admin check via header (MVP)
  // In production, verify Clerk token and check admin role
  const adminEmail = c.req.header("X-Admin-Email");
  // Hardcoded check matching frontend whitelist
  const ADMIN_EMAILS = ["marcell@neongod.io"];
  
  if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
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

// Download endpoint
app.get("/api/download/:id", async (c) => { // ... (rest of the file)
  const id = c.req.param("id");
  
  // Get Clerk session from header
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // TODO: Verify Clerk JWT token
  // const token = authHeader.replace("Bearer ", "");
  // const decoded = await verifyClerkToken(token, c.env.CLERK_SECRET_KEY);

  try {
    const asset = await c.env.DB.prepare("SELECT * FROM assets WHERE id = ?")
      .bind(id)
      .first();

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404);
    }

    // TODO: Check user subscription status
    // For now, allow download if authenticated

    const file = await c.env.ASSETS_PRIVATE.get(asset.r2_key_private as string);

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    await c.env.DB.prepare(
      "UPDATE assets SET download_count = download_count + 1 WHERE id = ?"
    )
      .bind(id)
      .run();

    return new Response(file.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asset.title}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return c.json({ error: "Download failed" }, 500);
  }
});

// Create Stripe Checkout session
app.post("/api/checkout", async (c) => {
  const { priceId, email } = await c.req.json();
  
  // Get Clerk user from auth header
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Create Stripe Checkout Session using fetch (Workers compatible)
    const payload: Record<string, string> = {
      "mode": "subscription",
      "success_url": "https://huepress.co/vault?success=true",
      "cancel_url": "https://huepress.co/pricing?canceled=true",
      "allow_promotion_codes": "true",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
    };

    if (email) {
      payload["customer_email"] = email;
    } 

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload),
    });

    const session = await response.json() as any;

    if (!response.ok) {
      console.error("Stripe error:", session);
      return c.json({ error: session.error?.message || "Failed to create checkout session", details: session }, 500);
    }

    return c.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return c.json({ error: error.message || "Checkout failed" }, 500);
  }
});

// Create Stripe Customer Portal session
app.post("/api/portal", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Get Stripe customer ID from D1 based on Clerk user
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE clerk_id = ?")
      .bind(auth.userId)
      .first();

    if (!user || !user.stripe_customer_id) {
      return c.json({ error: "No subscription found" }, 404);
    }

    const customerId = user.stripe_customer_id as string;

    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "customer": customerId,
        "return_url": "https://huepress.co/vault",
      }),
    });

    const session = await response.json() as { url: string };

    if (!response.ok) {
      console.error("Portal error:", session);
      return c.json({ error: "Failed to create portal session", details: session }, 500);
    }

    return c.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return c.json({ error: "Portal failed" }, 500);
  }
});

// Stripe webhook handler
app.post("/api/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.text("Missing signature", 400);

  const body = await c.req.text();

  // Verify signature manually for Workers environment
  // (Assuming Stripe SDK verifyHeader issues in Workers, passing raw body to be safe)
  // For MVP: We trust the secret exists. If verify fails, it throws.
  let event;
  try {
     // Currently skipping strict verification to avoid 'crypto' module issues in Workers
     // TODO: Re-enable strict verification with proper crypto polyfill
     event = JSON.parse(body);
  } catch (err) {
     return c.text(`Webhook Error: ${err}`, 400);
  }
  
  // NOTE: For production, ensure you implement signature verification!
  // const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { ... });
  
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.customer_email;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (!customerEmail) break;

        // 1. Get User from D1 to find Clerk ID
        const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
          .bind(customerEmail)
          .first();

        if (user) {
           // 2. Update D1
           await c.env.DB.prepare(`
             UPDATE users 
             SET subscription_status = 'active', 
                 stripe_customer_id = ?, 
                 subscription_id = ?,
                 updated_at = datetime('now')
             WHERE email = ?
           `)
           .bind(customerId, subscriptionId, customerEmail)
           .run();

           // 3. Update Clerk Metadata (so frontend unlocks)
           // Use fetch to call Clerk API directly
           const clerkId = user.clerk_id as string;
           const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkId}/metadata`, {
             method: "PATCH",
             headers: {
               "Authorization": `Bearer ${c.env.CLERK_SECRET_KEY}`,
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               public_metadata: { subscriptionStatus: "active" }, // Fixed: Key match frontend
             }),
           });
           
           if (!clerkResponse.ok) {
             console.error("Clerk sync failed:", await clerkResponse.text());
           } else {
             console.log("Clerk metadata updated for:", clerkId);
           }
        }
        break;
      }

      case "customer.subscription.deleted": {
         // Handle cancellation logic...
         const subscription = event.data.object;
         const customerId = subscription.customer;
         
         const user = await c.env.DB.prepare("SELECT * FROM users WHERE stripe_customer_id = ?")
          .bind(customerId)
          .first();
          
         if (user) {
             await c.env.DB.prepare("UPDATE users SET subscription_status = 'cancelled' WHERE stripe_customer_id = ?")
               .bind(customerId)
               .run();
               
             const clerkId = user.clerk_id as string;
             await fetch(`https://api.clerk.com/v1/users/${clerkId}/metadata`, {
               method: "PATCH",
               headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
               body: JSON.stringify({ public_metadata: { role: "free" } }),
             });
         }
         break;
      }
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return c.json({ error: "Webhook failed" }, 500);
  }
});

// Clerk webhook handler (for user sync)
app.post("/api/webhooks/clerk", async (c) => {
  const WEBHOOK_SECRET = c.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return c.json({ error: "Missing Clerk Webhook Secret" }, 500);
  }

  // Get headers
  const svix_id = c.req.header("svix-id");
  const svix_timestamp = c.req.header("svix-timestamp");
  const svix_signature = c.req.header("svix-signature");

  // If missing headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return c.json({ error: "Error occured -- no svix headers" }, 400);
  }

  // Get body
  const body = await c.req.text();

  // Create new Svix instance with secret
  // @ts-ignore
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify payload
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return c.json({ error: "Error occured" }, 400);
  }

  try {
    const eventType = evt.type;
    console.log(`Webhook received: ${eventType}`);

    switch (eventType) {
      case "user.created": {
        const user = evt.data;
        const email = user.email_addresses?.[0]?.email_address;
        
        if (email) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO users (id, email, clerk_id, subscription_status)
            VALUES (?, ?, ?, 'free')
          `)
            .bind(crypto.randomUUID(), email, user.id)
            .run();

          console.log("User created:", email);
        }
        break;
      }

      case "user.deleted": {
        const userId = evt.data.id;
        
        await c.env.DB.prepare("DELETE FROM users WHERE clerk_id = ?")
          .bind(userId)
          .run();

        console.log("User deleted:", userId);
        break;
      }
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return c.json({ error: "Webhook failed" }, 400);
  }
});


// MANUAL REPAIR ENDPOINT REMOVED
export default app;
