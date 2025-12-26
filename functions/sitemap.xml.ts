import { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

interface AssetRow {
  id: string;
  slug: string;
  asset_id: string | null;
  updated_at: string;
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
    { loc: `${baseUrl}/request-design`, priority: 0.7, changefreq: "monthly" },
    { loc: `${baseUrl}/privacy`, priority: 0.5, changefreq: "monthly" },
    { loc: `${baseUrl}/terms`, priority: 0.5, changefreq: "monthly" },
  ];

  try {
    // Fetch dynamic assets from D1
    const { results } = await env.DB.prepare(
      "SELECT id, slug, asset_id, updated_at FROM assets WHERE status = 'published' ORDER BY created_at DESC"
    ).all<AssetRow>();

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
  ${(results || [])
    .map((asset) => {
       const slug = asset.slug || "design";
       const id = asset.asset_id || asset.id;
       const url = `${baseUrl}/coloring-pages/${slug}-${id}`;
       const lastMod = new Date(asset.updated_at).toISOString().split('T')[0]; // YYYY-MM-DD
       return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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
