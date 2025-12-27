/**
 * Admin Single Blog Post Endpoint
 * GET/PUT/DELETE /api/admin/posts/:id
 * Proxies to the API Worker
 */

interface Context {
  request: Request;
  params: { id: string };
}

export async function onRequest(context: Context) {
  const { request, params } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const workerUrl = `https://huepress-api.neongod-llc.workers.dev/api/admin/posts/${params.id}`;
    
    const headers: Record<string, string> = {
      "Authorization": request.headers.get("Authorization") || "",
    };

    // Forward body for PUT requests
    let body: string | null = null;
    if (request.method === "PUT" || request.method === "POST") {
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
