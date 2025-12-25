/**
 * Admin Request Update Endpoint
 * PATCH /api/admin/requests/:id
 * Proxies to the API Worker
 */

interface RouteParams {
  id: string;
}

export async function onRequestPatch(context: { request: Request; params: RouteParams }) {
  const { request, params } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Email",
  };

  try {
    const workerUrl = `https://huepress-api.neongod-llc.workers.dev/api/admin/requests/${params.id}`;
    
    const apiResponse = await fetch(workerUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Email": request.headers.get("X-Admin-Email") || "",
      },
      body: request.body,
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
      JSON.stringify({ error: "Failed to update request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Email",
    },
  });
}
