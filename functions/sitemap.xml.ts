// Cloudflare Pages Function for sitemap generation
// Uses API endpoints instead of direct D1 access

interface Env {
  API_URL?: string;
}

interface Asset {
  id: string;
  slug: string;
  asset_id: string;
  updated_at?: string;
  created_at?: string;
}

interface Post {
  slug: string;
  published_at?: string;
  updated_at?: string;
}

export const onRequest = async (context: { env: Env }) => {
  const { env } = context;
  const baseUrl = "https://huepress.co";
  const apiUrl = env.API_URL || "https://api.huepress.co";

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
    let assets: Asset[] = [];
    let posts: Post[] = [];

    // Fetch assets via API
    try {
      const res = await fetch(`${apiUrl}/api/assets?limit=1000`);
      if (res.ok) {
        const data = await res.json() as { assets?: Asset[] };
        assets = data.assets || [];
      }
    } catch (err) {
      console.error("Failed to fetch assets for sitemap:", err);
    }

    // Fetch blog posts via API
    try {
      const res = await fetch(`${apiUrl}/api/blog/posts?limit=100`);
      if (res.ok) {
        const data = await res.json() as { posts?: Post[] };
        posts = data.posts || [];
      }
    } catch (err) {
      console.error("Failed to fetch posts for sitemap:", err);
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
