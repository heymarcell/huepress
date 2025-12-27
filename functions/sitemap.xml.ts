import { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

interface AssetRow {
  id: string;
  slug: string;
  asset_id: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface PostRow {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
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
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  try {
    // Fetch dynamic assets from D1
    const { results: assets } = await env.DB.prepare(
      "SELECT id, slug, asset_id, updated_at, created_at FROM assets WHERE status = 'published' ORDER BY created_at DESC"
    ).all<AssetRow>();

    // Fetch published blog posts
    const { results: posts } = await env.DB.prepare(
      "SELECT slug, published_at, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC"
    ).all<PostRow>();

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("")}
  ${(assets || [])
    .map((asset) => {
       const slug = asset.slug || "design";
       const id = asset.asset_id || asset.id;
       const url = `${baseUrl}/coloring-pages/${slug}-${id}`;
       const lastMod = formatDate(asset.updated_at || asset.created_at);
       return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    })
    .join("")}
  ${(posts || [])
    .map((post) => {
       const url = `${baseUrl}/blog/${post.slug}`;
       const lastMod = formatDate(post.updated_at || post.published_at);
       return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (err) {
    console.error("Sitemap generation error:", err);
    return new Response("Error generating sitemap", { status: 500 });
  }
};
