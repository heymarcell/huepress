/**
 * Admin Requests List Endpoint
 * GET /api/admin/requests
 * Proxies to the API Worker
 */

export async function onRequestGet(context: { request: Request }) {
  const { request } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Email",
  };

  try {
    const url = new URL(request.url);
    const workerUrl = `https://huepress-api.neongod-llc.workers.dev/api/admin/requests${url.search}`;
    
    const apiResponse = await fetch(workerUrl, {
      method: "GET",
      headers: {
        "X-Admin-Email": request.headers.get("X-Admin-Email") || "",
      },
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
      JSON.stringify({ error: "Failed to fetch requests" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Email",
    },
  });
}
