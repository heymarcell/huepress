import { Hono } from "hono";
import { Webhook } from "svix";
import { Bindings } from "../types";
import { trackGA4Signup } from "../../lib/ga4-conversions";
import { trackCompleteRegistration } from "../../lib/meta-conversions";

const app = new Hono<{ Bindings: Bindings }>();

// Clerk webhook handler (for user sync)
app.post("/clerk", async (c) => {
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
  const wh = new Webhook(WEBHOOK_SECRET);

  // Clerk webhook event type
  interface ClerkWebhookEvent {
    type: string;
    data: {
      id: string;
      email_addresses?: Array<{ email_address: string }>;
    };
  }

  let evt: ClerkWebhookEvent;

  // Verify payload
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkWebhookEvent;
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

          // Track signup in GA4
          if (c.env.GA4_API_SECRET && c.env.GA4_MEASUREMENT_ID) {
            const ga4Result = await trackGA4Signup(
              c.env.GA4_MEASUREMENT_ID,
              c.env.GA4_API_SECRET,
              { userId: user.id, method: 'email' }
            );
            if (ga4Result.success) {
              console.log('GA4 SignUp event sent for:', email);
            }
          }

          // Track signup in Meta
          if (c.env.META_ACCESS_TOKEN && c.env.META_PIXEL_ID) {
            const metaResult = await trackCompleteRegistration(
              c.env.META_ACCESS_TOKEN,
              c.env.META_PIXEL_ID,
              c.env.SITE_URL,
              { email, externalId: user.id }
            );
            if (metaResult.success) {
              console.log('Meta CompleteRegistration event sent for:', email);
            }
          }
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

export default app;
