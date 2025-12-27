/**
 * Admin Blog Posts List/Create Endpoint
 * GET/POST /api/admin/posts
 * Proxies to the API Worker
 */

export async function onRequest(context: { request: Request }) {
  const { request } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const workerUrl = `https://huepress-api.neongod-llc.workers.dev/api/admin/posts${url.search}`;
    
    const headers: Record<string, string> = {
      "Authorization": request.headers.get("Authorization") || "",
    };

    // Forward body for POST requests
    let body: string | null = null;
    if (request.method === "POST") {
      body = await request.text();
      headers["Content-Type"] = request.headers.get("Content-Type") || "application/json";
    }

    const apiResponse = await fetch(workerUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await apiResponse.json();
    
    return new Response(
      JSON.stringify(data),
      { 
        status: apiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
