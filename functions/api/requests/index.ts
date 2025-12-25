/**
 * Design Request Endpoint
 * POST /api/requests
 * Proxies to the API Worker which has D1 access
 */

export async function onRequestPost(context: { request: Request }) {
  const { request } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    // Proxy to the API Worker
    const apiResponse = await fetch("https://huepress-api.neongod-llc.workers.dev/api/requests/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
