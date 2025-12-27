/**
 * Single Blog Post Endpoint (Public)
 * GET /api/posts/:slug
 * Proxies to the API Worker
 */

interface Context {
  request: Request;
  params: { slug: string };
}

export async function onRequest(context: Context) {
  const { request, params } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const workerUrl = `https://huepress-api.neongod-llc.workers.dev/api/posts/${params.slug}`;
    
    const apiResponse = await fetch(workerUrl, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": request.headers.get("Authorization") || "",
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
      JSON.stringify({ error: "Failed to fetch post" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
