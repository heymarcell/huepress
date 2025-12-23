import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";
import { Bindings } from "./types";

// Import modular routes
import assetsRoute from "./routes/assets";
import adminRoute from "./routes/admin";
import stripeRoute from "./routes/stripe";
import webhooksRoute from "./routes/webhooks";

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

export default app;
