/**
 * MailerLite Subscribe Endpoint
 * POST /api/subscribe
 * Body: { email: string, source?: string }
 */

interface Env {
  MAILERLITE_API_KEY: string;
}

const MAILERLITE_GROUP_ID = "174544874173891597";

export async function onRequestPost(context: { request: Request; env: Env }) {
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
    const body = await request.json() as { email: string; source?: string };
    const { email, source: _source = "website" } = body;

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
      console.error("MailerLite error:", errorText);
      
      // If subscriber already exists, that's still a success
      if (response.status === 409) {
        return new Response(
          JSON.stringify({ success: true, message: "Already subscribed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Return specific error for debugging
      return new Response(
        JSON.stringify({ success: false, error: "MailerLite API Error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
