/**
 * Design Request Submit Endpoint
 * POST /api/requests/submit
 * Body: { title: string, description: string, email: string }
 */

interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const body = await request.json() as { title: string; description: string; email: string };
    const { title, description, email } = body;

    if (!title || !description || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO design_requests (id, user_id, email, title, description, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).bind(id, null, email, title, description).run();

    return new Response(
      JSON.stringify({ success: true, id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create request error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to submit request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
