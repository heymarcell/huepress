import { Hono } from "hono";
import { cors } from "hono/cors";

// Define environment bindings type
type Bindings = {
  DB: D1Database;
  ASSETS_PRIVATE: R2Bucket;
  ASSETS_PUBLIC: R2Bucket;
  CLERK_SECRET_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_MONTHLY: string;
  STRIPE_PRICE_ANNUAL: string;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use("*", cors());

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

// Download endpoint
app.get("/api/download/:id", async (c) => {
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
  const { priceId } = await c.req.json();
  
  // Get Clerk user from auth header
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // TODO: Get user email from Clerk token
  const customerEmail = "user@example.com"; // Placeholder

  try {
    // Create Stripe Checkout Session using fetch (Workers compatible)
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "success_url": "https://huepress.co/vault?success=true",
        "cancel_url": "https://huepress.co/pricing?canceled=true",
        "customer_email": customerEmail,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
      }),
    });

    const session = await response.json() as { id: string; url: string };

    if (!response.ok) {
      console.error("Stripe error:", session);
      return c.json({ error: "Failed to create checkout session" }, 500);
    }

    return c.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return c.json({ error: "Checkout failed" }, 500);
  }
});

// Create Stripe Customer Portal session
app.post("/api/portal", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // TODO: Get Stripe customer ID from D1 based on Clerk user
  const customerId = "cus_placeholder";

  try {
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
      return c.json({ error: "Failed to create portal session" }, 500);
    }

    return c.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return c.json({ error: "Portal failed" }, 500);
  }
});

// Stripe webhook handler
app.post("/api/webhooks/stripe", async (c) => {
  // TODO: Verify Stripe webhook signature
  // const signature = c.req.header("stripe-signature");
  const body = await c.req.text();

  // TODO: Verify Stripe webhook signature
  // For now, just parse the event
  try {
    const event = JSON.parse(body);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const customerEmail = session.customer_email;
        const subscriptionId = session.subscription;

        // Update user in D1
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

        console.log("Subscription activated for:", customerEmail);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await c.env.DB.prepare(`
          UPDATE users 
          SET subscription_status = 'cancelled',
              updated_at = datetime('now')
          WHERE stripe_customer_id = ?
        `)
          .bind(customerId)
          .run();

        console.log("Subscription cancelled for customer:", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await c.env.DB.prepare(`
          UPDATE users 
          SET subscription_status = 'past_due',
              updated_at = datetime('now')
          WHERE stripe_customer_id = ?
        `)
          .bind(customerId)
          .run();

        console.log("Payment failed for customer:", customerId);
        break;
      }
    }

    return c.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Webhook failed" }, 400);
  }
});

// Clerk webhook handler (for user sync)
app.post("/api/webhooks/clerk", async (c) => {
  const body = await c.req.json();

  try {
    switch (body.type) {
      case "user.created": {
        const user = body.data;
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
        const userId = body.data.id;
        
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

export default app;
