export const onRequest: PagesFunction = async (context) => {
  const { params, request, next } = context;
  const id = params.id as string;
  const url = new URL(request.url);

  // 1. Fetch the asset data from your API
  // In a real app, you might query D1 or a KV store directly for speed.
  // For now, we'll fetch from the public API (assuming it's deployed).
  // Strategy: If API fetch fails, we just fall back to the default HTML (Client Side Rendering)
  
  let asset = null;
  try {
    // Determine API origin. context.env.API_URL might be set, or use current origin if on same domain
    // For build/dev, we might need a fixed URL or mock.
    // Important: Cloudflare Workers fetch cannot fetch "self" easily without binding loop.
    // If the API is also on this Worker/Pages, we might need to import logic directly or use service binding.
    // For simplicity: We'll imply a "mock" or "KV" lookup strategy here, or skip if complex.
    // Let's assume we can fetch data. If not, we fall back.
    
    // Placeholder data for "demo" purpose since we don't have a live backend URL in this environment content.
    // Real implementation would look like:
    // const res = await fetch(`${url.origin}/api/assets/${id}`);
    // asset = await res.json();
    
    // MOCK DATA for implementation proof
     if (id === "1") asset = { title: "Cozy Capybara", description: "A friendly capybara enjoying a peaceful moment.", imageUrl: "/thumbnails/thumb_capybara_1766354990805.png" };
     if (id === "2") asset = { title: "Ocean Whale", description: "A giant whale swimming in the ocean.", imageUrl: "/thumbnails/thumb_whale_1766355003894.png" };
     if (id === "3") asset = { title: "Friendly T-Rex", description: "A cute T-Rex dinosaur.", imageUrl: "/thumbnails/thumb_dinosaur_1766355016602.png" };
  } catch (e) {
    console.error("Failed to fetch asset for OG injection", e);
  }

  // 2. Fetch the static HTML asset (the SPA shell)
  const response = await next();
  
  // If no asset found or not a page we want to touch, return original
  if (!asset || !response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }

  // 3. Inject Metadata using HTMLRewriter
  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(`${asset.title} | HuePress`);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute("content", `${asset.title} | HuePress`);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute("content", asset.description);
      },
    })
    .on('meta[property="og:image"]', {
      element(element) {
        // Ensure absolute URL
         const imageUrl = asset.imageUrl.startsWith("http") ? asset.imageUrl : `${url.origin}${asset.imageUrl}`;
        element.setAttribute("content", imageUrl);
      },
    })
    .transform(response);
};
