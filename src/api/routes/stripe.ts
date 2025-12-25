import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { Bindings } from "../types";
import { trackPurchase, trackSubscribe } from "../../lib/meta-conversions";
import { trackPinterestCheckout } from "../../lib/pinterest-conversions";
import { trackGA4Purchase } from "../../lib/ga4-conversions";
import { verifyStripeSignature } from "../../lib/stripe-webhook";

const app = new Hono<{ Bindings: Bindings }>();

// Create Stripe Checkout session
app.post("/checkout", async (c) => {
  const { priceId, email, fbp, fbc } = await c.req.json();
  
  // Validate Clerk auth properly (not just header existence)
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Capture client info for enhanced Event Match Quality
  const clientIpAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
  const clientUserAgent = c.req.header('user-agent');

  try {
    // Create Stripe Checkout Session using fetch (Workers compatible)
    const payload: Record<string, string> = {
      "mode": "subscription",
      "success_url": `${c.env.SITE_URL}/vault?success=true`,
      "cancel_url": `${c.env.SITE_URL}/pricing?canceled=true`,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "allow_promotion_codes": "true", // Enable coupon/promo code field
      "client_reference_id": auth.userId, // CRITICAL: Links payment to Clerk user ID
      "metadata[clerk_id]": auth.userId, // Also store in metadata for backup
      "metadata[waiver_accepted]": "true", // Record that they accepted the modal on frontend
    };

    // Store tracking data in metadata for webhook retrieval
    if (fbp) payload["metadata[fbp]"] = fbp;
    if (fbc) payload["metadata[fbc]"] = fbc;
    if (clientIpAddress) payload["metadata[client_ip]"] = clientIpAddress;
    if (clientUserAgent) payload["metadata[client_ua]"] = clientUserAgent.substring(0, 500); // Stripe metadata limit

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

    const session = await response.json() as { url?: string; error?: { message?: string } };

    if (!response.ok) {
      console.error("Stripe error:", session);
      return c.json({ error: session.error?.message || "Failed to create checkout session", details: session }, 500);
    }

    return c.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Checkout failed";
    return c.json({ error: message }, 500);
  }
});

// Create Stripe Customer Portal session
app.post("/portal", async (c) => {
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
        "return_url": `${c.env.SITE_URL}/vault`,
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
app.post("/webhooks/stripe", async (c) => {
  const signature = c.req.header("stripe-signature");
  if (!signature) return c.text("Missing signature", 400);

  const body = await c.req.text();

  // Verify webhook signature using Web Crypto API
  const verificationResult = await verifyStripeSignature(
    body,
    signature,
    c.env.STRIPE_WEBHOOK_SECRET
  );

  if (!verificationResult.valid) {
    console.error("Stripe webhook verification failed:", verificationResult.error);
    return c.text(`Webhook signature verification failed: ${verificationResult.error}`, 401);
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (err) {
    return c.text(`Webhook Error: Invalid JSON - ${err}`, 400);
  }
  
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.customer_email;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        // SECURITY: Use client_reference_id (Clerk ID) as primary lookup, fallback to email
        const clerkIdFromSession = session.client_reference_id || session.metadata?.clerk_id;

        // 1. Get User from D1 - prefer clerk_id lookup for accuracy
        let user;
        if (clerkIdFromSession) {
          user = await c.env.DB.prepare("SELECT * FROM users WHERE clerk_id = ?")
            .bind(clerkIdFromSession)
            .first();
        }
        // Fallback to email if clerk_id lookup failed (backwards compatibility)
        if (!user && customerEmail) {
          user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
            .bind(customerEmail)
            .first();
        }

        if (!user) {
          console.error("No user found for checkout:", { clerkIdFromSession, customerEmail });
          break;
        }

        const clerkId = user.clerk_id as string;
           // 2. Update D1 using clerk_id for reliability
           await c.env.DB.prepare(`
             UPDATE users 
             SET subscription_status = 'active', 
             stripe_customer_id = ?, 
             subscription_id = ?,
             updated_at = datetime('now')
             WHERE clerk_id = ?
           `)
           .bind(customerId, subscriptionId, clerkId)
           .run();

           // 3. Update Clerk Metadata (so frontend unlocks)
           const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkId}/metadata`, {
             method: "PATCH",
             headers: {
               "Authorization": `Bearer ${c.env.CLERK_SECRET_KEY}`,
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               public_metadata: { subscriptionStatus: "active" },
             }),
           });
           
           if (!clerkResponse.ok) {
             console.error("Clerk sync failed:", await clerkResponse.text());
           } else {
             console.log("Clerk metadata updated for:", clerkId);
           }

            // 4. Send Meta Conversions API events (server-side tracking)
            const isAnnual = session.amount_total && session.amount_total >= 4000;
            const subscriptionValue = isAnnual ? 45 : 5;
            
            const fbp = session.metadata?.fbp;
            const fbc = session.metadata?.fbc;
            const clientIpAddress = session.metadata?.client_ip;
            const clientUserAgent = session.metadata?.client_ua;
            
            if (c.env.META_ACCESS_TOKEN) {
              const purchaseResult = await trackPurchase(
                c.env.META_ACCESS_TOKEN,
                c.env.META_PIXEL_ID,
                c.env.SITE_URL,
                {
                  email: customerEmail || (user.email as string),
                  value: subscriptionValue,
                  currency: 'USD',
                  orderId: subscriptionId,
                  externalId: clerkId,
                  clientIpAddress,
                  clientUserAgent,
                  fbp,
                  fbc,
                }
              );
              
              if (purchaseResult.success) {
                console.log('Meta Purchase event sent for:', clerkId);
              } else {
                console.error('Meta Purchase event failed:', purchaseResult.error);
              }
              
              const subscribeResult = await trackSubscribe(
                c.env.META_ACCESS_TOKEN,
                c.env.META_PIXEL_ID,
                c.env.SITE_URL,
                {
                  email: customerEmail || (user.email as string),
                  value: subscriptionValue,
                  currency: 'USD',
                  externalId: clerkId,
                  clientIpAddress,
                  clientUserAgent,
                  fbp,
                  fbc,
                }
              );
              
              if (subscribeResult.success) {
                console.log('Meta Subscribe event sent for:', clerkId);
              } else {
                console.error('Meta Subscribe event failed:', subscribeResult.error);
              }
            }

            // 5. Send Pinterest Conversions API event
            if (c.env.PINTEREST_ACCESS_TOKEN) {
              const pinterestResult = await trackPinterestCheckout(
                c.env.PINTEREST_ACCESS_TOKEN,
                c.env.PINTEREST_AD_ACCOUNT_ID,
                c.env.SITE_URL,
                {
                  email: customerEmail || (user.email as string),
                  value: subscriptionValue,
                  currency: 'USD',
                  orderId: subscriptionId,
                  externalId: clerkId,
                  clientIpAddress,
                  clientUserAgent,
                }
              );
              
              if (pinterestResult.success) {
                console.log('Pinterest Checkout event sent for:', clerkId);
              } else {
                console.error('Pinterest Checkout event failed:', pinterestResult.error);
              }
            }

            // 6. Send GA4 Measurement Protocol event
            if (c.env.GA4_API_SECRET && c.env.GA4_MEASUREMENT_ID) {
              const ga4Result = await trackGA4Purchase(
                c.env.GA4_MEASUREMENT_ID,
                c.env.GA4_API_SECRET,
                {
                  transactionId: subscriptionId,
                  value: subscriptionValue,
                  currency: 'USD',
                  userId: clerkId,
                  itemName: isAnnual ? 'HuePress Annual' : 'HuePress Monthly',
                }
              );
              
              if (ga4Result.success) {
                console.log('GA4 Purchase event sent for:', clerkId);
              } else {
                console.error('GA4 Purchase event failed:', ga4Result.error);
              }
            }
        break;
      }

      // Handle subscription update (plan change, renewal, etc.)
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // active, past_due, canceled, etc.
        
        const user = await c.env.DB.prepare("SELECT * FROM users WHERE stripe_customer_id = ?")
          .bind(customerId)
          .first();
          
        if (user) {
          // Map Stripe status to our status
          let subscriptionStatus = 'free';
          if (status === 'active' || status === 'trialing') {
            subscriptionStatus = 'active';
          } else if (status === 'past_due') {
            subscriptionStatus = 'past_due';
          } else if (status === 'canceled' || status === 'unpaid') {
            subscriptionStatus = 'cancelled';
          }
          
          await c.env.DB.prepare(`
            UPDATE users 
            SET subscription_status = ?,
            updated_at = datetime('now')
            WHERE stripe_customer_id = ?
          `)
          .bind(subscriptionStatus, customerId)
          .run();
          
          // Update Clerk metadata
          const clerkId = user.clerk_id as string;
          const clerkStatus = subscriptionStatus === 'active' ? 'active' : 'free';
          await fetch(`https://api.clerk.com/v1/users/${clerkId}/metadata`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ public_metadata: { subscriptionStatus: clerkStatus } }),
          });
          
          console.log(`Subscription updated for ${clerkId}: ${subscriptionStatus}`);
        }
        break;
      }

      // Handle payment failure
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const attemptCount = invoice.attempt_count;
        
        const user = await c.env.DB.prepare("SELECT * FROM users WHERE stripe_customer_id = ?")
          .bind(customerId)
          .first();
          
        if (user) {
          // Mark as past_due after first failure
          await c.env.DB.prepare(`
            UPDATE users 
            SET subscription_status = 'past_due',
            updated_at = datetime('now')
            WHERE stripe_customer_id = ?
          `)
          .bind(customerId)
          .run();
          
          // Optionally downgrade Clerk access after multiple failures
          if (attemptCount >= 3) {
            const clerkId = user.clerk_id as string;
            await fetch(`https://api.clerk.com/v1/users/${clerkId}/metadata`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ public_metadata: { subscriptionStatus: "past_due" } }),
            });
          }
          
          console.log(`Payment failed for customer ${customerId}, attempt ${attemptCount}`);
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

export default app;
