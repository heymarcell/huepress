export const onRequest: PagesFunction = async (context) => {
  const { params, request, next } = context;
  const slugWithId = params.id as string;
  const url = new URL(request.url);

  // Extract asset_id from slug-id format
  // Use regex to find ID at the end (match frontend logic)
  const match = slugWithId.match(/((?:HP-[A-Z]{3}-)?\d{4,5})$/);
  const id = match ? match[1] : slugWithId; // Fallback to full slug

  // Fetch the asset data from API for OG tag injection
  let asset = null;
  try {
    const apiUrl =
      (context.env as { API_URL?: string }).API_URL || "https://api.huepress.co";
    const res = await fetch(`${apiUrl}/api/assets/${id}`);

    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        description?: string;
        thumbnail_url?: string;
        og_image_url?: string;
        image_url?: string;
        slug?: string;
        asset_id?: string;
      };
      if (data && data.title) {
        asset = {
          title: data.title,
          description:
            data.description ||
            `${data.title} - A beautiful coloring page from HuePress`,
          imageUrl: data.og_image_url || data.thumbnail_url || data.image_url || "",
          canonicalUrl: `${url.origin}/coloring-pages/${slugWithId}` // Use current URL as canonical for sharing
        };
      }
    }
  } catch (e) {
    console.error("Failed to fetch asset for OG injection", e);
  }

  // Fetch the static HTML asset (the SPA shell)
  const response = await next();

  // If no asset found or not HTML, return original
  if (!asset || !response.headers.get("content-type")?.includes("text/html")) {
    return response;
  }

  // Inject Metadata using HTMLRewriter
  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(`${asset.title} - Coloring Page | HuePress`);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute("content", `${asset.title} - Coloring Page | HuePress`);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute("content", asset.description);
      },
    })
    .on('meta[property="og:image"]', {
      element(element) {
        const imageUrl = asset.imageUrl.startsWith("http")
          ? asset.imageUrl
          : `${url.origin}${asset.imageUrl}`;
        element.setAttribute("content", imageUrl);
      },
    })
    .on('meta[property="og:url"]', {
      element(element) {
        element.setAttribute("content", asset.canonicalUrl);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute("content", `${asset.title} - Coloring Page | HuePress`);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element) {
        element.setAttribute("content", asset.description);
      },
    })
    .on('meta[name="twitter:image"]', {
      element(element) {
        const imageUrl = asset.imageUrl.startsWith("http")
          ? asset.imageUrl
          : `${url.origin}${asset.imageUrl}`;
        element.setAttribute("content", imageUrl);
      },
    })
    .transform(response);
};
