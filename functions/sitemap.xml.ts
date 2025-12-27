// Cloudflare Pages Function for sitemap generation

interface Env {
  DB: D1Database;
}

export const onRequest = async (context: { env: Env }) => {
  const { env } = context;
  const baseUrl = "https://huepress.co";

  // Static pages
  const staticPages = [
    { loc: `${baseUrl}/`, priority: 1.0, changefreq: "weekly" },
    { loc: `${baseUrl}/vault`, priority: 0.9, changefreq: "daily" },
    { loc: `${baseUrl}/pricing`, priority: 0.8, changefreq: "weekly" },
    { loc: `${baseUrl}/about`, priority: 0.7, changefreq: "monthly" },
    { loc: `${baseUrl}/blog`, priority: 0.8, changefreq: "weekly" },
    { loc: `${baseUrl}/request-design`, priority: 0.7, changefreq: "monthly" },
    { loc: `${baseUrl}/privacy`, priority: 0.5, changefreq: "monthly" },
    { loc: `${baseUrl}/terms`, priority: 0.5, changefreq: "monthly" },
  ];

  // Helper to format date safely
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      return d.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  try {
    // Fetch dynamic assets from D1
    let assets: Array<{ id: string; slug: string; asset_id: string | null; updated_at: string | null; created_at: string | null }> = [];
    let posts: Array<{ slug: string; published_at: string | null; updated_at: string | null }> = [];

    try {
      const assetResult = await env.DB.prepare(
        "SELECT id, slug, asset_id, updated_at, created_at FROM assets WHERE status = 'published' ORDER BY created_at DESC LIMIT 1000"
      ).all();
      assets = (assetResult?.results || []) as typeof assets;
    } catch (assetErr) {
      console.error("Failed to fetch assets:", assetErr);
    }

    try {
      const postResult = await env.DB.prepare(
        "SELECT slug, published_at, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 100"
      ).all();
      posts = (postResult?.results || []) as typeof posts;
    } catch (postErr) {
      console.error("Failed to fetch posts:", postErr);
    }

    // Generate XML
    let xmlEntries = "";

    // Static pages
    for (const page of staticPages) {
      xmlEntries += `
  <url>
    <loc>${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Assets
    for (const asset of assets) {
      const slug = asset.slug || "design";
      const id = asset.asset_id || asset.id;
      const url = `${baseUrl}/coloring-pages/${slug}-${id}`;
      const lastMod = formatDate(asset.updated_at || asset.created_at);
      xmlEntries += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Posts
    for (const post of posts) {
      const url = `${baseUrl}/blog/${post.slug}`;
      const lastMod = formatDate(post.updated_at || post.published_at);
      xmlEntries += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlEntries}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Sitemap generation error:", err);
    const errMessage = err instanceof Error ? err.message : String(err);
    return new Response(`Error generating sitemap: ${errMessage}`, { status: 500 });
  }
};
