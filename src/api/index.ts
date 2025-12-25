import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";
import { Bindings } from "./types";

// Import modular routes
import assetsRoute from "./routes/assets";
import adminRoute from "./routes/admin";
import stripeRoute from "./routes/stripe";
import webhooksRoute from "./routes/webhooks";
import reviewsRoute from "./routes/reviews";
import tagsRoute from "./routes/tags";
import requestsRoute from "./routes/requests";

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use("*", cors());
app.use("*", clerkMiddleware());

// Root route
app.get("/", (c) => {
  return c.json({ 
    name: "HuePress API", 
    version: "1.0.0",
    endpoints: ["/api/health", "/api/assets", "/api/download/:id", "/api/reviews/:assetId", "/api/tags", "/api/requests"]
  });
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", env: c.env.ENVIRONMENT });
});

// GeoIP Endpoint
app.get("/api/geo", (c) => {
  // Cloudflare Workers exposes country in cf object
  const country = c.req.raw.cf?.country || "US"; // Default to US if unknown
  return c.json({ country });
});

// Mount Routes
app.route("/api", assetsRoute);      // /api/assets, /api/download
app.route("/api/admin", adminRoute); // /api/admin/assets
app.route("/api", stripeRoute);      // /api/checkout, /api/portal, /api/webhooks/stripe
app.route("/api/webhooks", webhooksRoute); // /api/webhooks/clerk
app.route("/api/reviews", reviewsRoute); // /api/reviews/:assetId
app.route("/api/tags", tagsRoute);   // /api/tags
app.route("/api/requests", requestsRoute); // /api/requests

// Serve public R2 assets directly (bypasses need for custom R2 domain)
app.get("/cdn/*", async (c) => {
  const key = c.req.path.replace("/cdn/", "");
  
  if (!key) {
    return c.json({ error: "No key provided" }, 400);
  }
  
  try {
    const object = await c.env.ASSETS_PUBLIC.get(key);
    
    if (!object) {
      return c.json({ error: "Not found" }, 404);
    }
    
    // Determine content type from key
    let contentType = "application/octet-stream";
    if (key.endsWith(".webp")) contentType = "image/webp";
    else if (key.endsWith(".png")) contentType = "image/png";
    else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (key.endsWith(".svg")) contentType = "image/svg+xml";
    
    return new Response(object.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("R2 fetch error:", error);
    return c.json({ error: "Failed to fetch asset" }, 500);
  }
});

export default app;
