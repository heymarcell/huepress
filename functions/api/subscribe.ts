/**
 * MailerLite Subscribe Endpoint
 * POST /api/subscribe
 * Body: { email: string, source?: string }
 */

import { EventContext } from "@cloudflare/workers-types";
import { trackLead } from "../../src/lib/meta-conversions";
import { trackPinterestLead } from "../../src/lib/pinterest-conversions";

interface Env {
  MAILERLITE_API_KEY: string;
  META_ACCESS_TOKEN?: string;
  META_PIXEL_ID?: string;
  PINTEREST_ACCESS_TOKEN?: string;
  PINTEREST_AD_ACCOUNT_ID?: string;
  SITE_URL?: string;
}

const MAILERLITE_GROUP_ID = "174544874173891597";

export async function onRequestPost(context: EventContext<Env, string, Record<string, unknown>>) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json() as { email: string; source?: string; fbp?: string; fbc?: string; userAgent?: string; ip?: string; };
    const { email, source: _source = "website", fbp, fbc } = body;

    // Get client info from headers if not in body
    const clientIpAddress = body.ip || request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for");
    const clientUserAgent = body.userAgent || request.headers.get("User-Agent");

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Subscribe to MailerLite
    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        email,
        groups: [MAILERLITE_GROUP_ID],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If not 409 (Already Exists), log error but continue if possible? 
      // Actually, if MailerLite fails, we might still want to track the attempt if it was a valid email, 
      // but usually we only track successful leads. 
      // However, if they are already subscribed (409), we SHOULD track it as a lead again? 
      // No, duplicate leads are bad data.
      
      if (response.status !== 409) {
          console.error("MailerLite error:", errorText);
          return new Response(
            JSON.stringify({ success: false, error: "MailerLite API Error", details: errorText }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }
    }

    // FIRE & FORGET: Server-Side Tracking (Meta + Pinterest)
    // We don't await this to speed up response, OR we use context.waitUntil() if available in Pages
    const trackingPromise = (async () => {
        const siteUrl = env.SITE_URL || "https://huepress.co";
        
        // Meta CAPI
        if (env.META_ACCESS_TOKEN && env.META_PIXEL_ID) {
            try {
                await trackLead(env.META_ACCESS_TOKEN, env.META_PIXEL_ID, siteUrl, {
                    email,
                    clientIpAddress: clientIpAddress || undefined,
                    clientUserAgent: clientUserAgent || undefined,
                    fbp,
                    fbc
                });
            } catch (e) {
                console.error("Meta CAPI Error:", e);
            }
        }

        // Pinterest CAPI
        if (env.PINTEREST_ACCESS_TOKEN && env.PINTEREST_AD_ACCOUNT_ID) {
            try {
                await trackPinterestLead(env.PINTEREST_ACCESS_TOKEN, env.PINTEREST_AD_ACCOUNT_ID, siteUrl, {
                    email,
                    clientIpAddress: clientIpAddress || undefined,
                    clientUserAgent: clientUserAgent || undefined,
                });
            } catch (e) {
                console.error("Pinterest CAPI Error:", e);
            }
        }
    })();

    // Ensure tracking completes even if response returns early
    if (context.waitUntil) {
        context.waitUntil(trackingPromise);
    } else {
        await trackingPromise; // Fallback if waitUntil missing (though Pages usually has it)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Subscribe error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Subscription failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
