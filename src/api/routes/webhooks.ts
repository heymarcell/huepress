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
    return c.json({ error: "Error occurred: no svix headers" }, 400);
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
      email_addresses?: Array<{ 
          id: string;
          email_address: string;
          verification?: { status: string };
      }>;
      primary_email_address_id?: string;
    };
  }

  // Helper: Get Primary Verified Email
  const getVerifiedEmail = (user: ClerkWebhookEvent['data']): string | null => {
      if (!user.email_addresses || user.email_addresses.length === 0) return null;

      // 1. Try to find primary email
      if (user.primary_email_address_id) {
          const primary = user.email_addresses.find(e => e.id === user.primary_email_address_id);
          if (primary && primary.verification?.status === 'verified') {
              return primary.email_address;
          }
      }

      // 2. Fallback: Find ANY verified email (optional, but safer to stick to primary?)
      // Stick to primary for strictness, OR find first verified.
      // Let's stick to primary or first verified if primary logic fails.
      const verified = user.email_addresses.find(e => e.verification?.status === 'verified');
      return verified ? verified.email_address : null;
  };

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
    return c.json({ error: "Error occurred: invalid signature" }, 400);
  }

  try {
    const eventType = evt.type;
    console.log(`Webhook received: ${eventType}`);

    switch (eventType) {
      case "user.created": {
        const user = evt.data;
        const email = getVerifiedEmail(user);
        
        // Always insert user, but email might be null if not verified.
        // If email is null, Admin check will fail (desired).
        await c.env.DB.prepare(`
          INSERT OR IGNORE INTO users (id, email, clerk_id, subscription_status)
          VALUES (?, ?, ?, 'free')
        `)
          .bind(crypto.randomUUID(), email, user.id)
          .run();

        console.log(`User created: ${user.id}`);

        // Track signup in GA4 (Only if we have email? Or track generic signup?)
        // Tracking generic signup is fine, but email match requires email.
        if (email && c.env.GA4_API_SECRET && c.env.GA4_MEASUREMENT_ID) {
          const ga4Result = await trackGA4Signup(
            c.env.GA4_MEASUREMENT_ID,
            c.env.GA4_API_SECRET,
            { userId: user.id, method: 'email' }
          );
          if (ga4Result.success) {
            console.log(`GA4 SignUp event sent for user: ${user.id}`);
          }
        }

        // Track signup in Meta
        if (email && c.env.META_ACCESS_TOKEN && c.env.META_PIXEL_ID) {
          const metaResult = await trackCompleteRegistration(
            c.env.META_ACCESS_TOKEN,
            c.env.META_PIXEL_ID,
            c.env.SITE_URL,
            { email, externalId: user.id }
          );
          if (metaResult.success) {
            console.log(`Meta CompleteRegistration event sent for user: ${user.id}`);
          }
        }
        break;
      }
      
      case "user.updated": {
          const user = evt.data;
          const email = getVerifiedEmail(user);
          
          // Update email (it might have become verified, or changed)
          // If email becomes unverified (null), we update it to null to revoke access/trust.
          await c.env.DB.prepare("UPDATE users SET email = ? WHERE clerk_id = ?")
            .bind(email, user.id)
            .run();
            
          console.log(`User updated: ${user.id}`);
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

    return c.json({ received: true, type: eventType });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return c.json({ error: "Webhook failed" }, 400);
  }
});

export default app;
