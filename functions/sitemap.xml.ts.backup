// Cloudflare Pages Function for sitemap generation
// Direct D1 access for better performance and reliability
/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

interface Asset {
  id: string;
  slug: string;
  asset_id: string;
  title: string;
  image_url: string;
  updated_at?: string;
  created_at?: string;
}

interface Post {
  slug: string;
  published_at?: string;
  updated_at?: string;
}

interface LandingPage {
  slug: string;
  updated_at?: string;
  created_at?: string;
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

  // Helper to escape XML special characters
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  try {
    let assets: Asset[] = [];
    let posts: Post[] = [];
    let landingPages: LandingPage[] = [];

    // Fetch assets directly from D1 (published only)
    try {
      const result = await env.DB.prepare(
        `SELECT id, slug, asset_id, title, image_url, updated_at, created_at 
         FROM assets 
         WHERE status = 'published' 
         ORDER BY created_at DESC 
         LIMIT 2000`
      ).all();
      assets = result.results as unknown as Asset[];
    } catch (err) {
      console.error("Failed to fetch assets from D1:", err);
    }

    // Fetch blog posts from D1 (published only)
    try {
      const result = await env.DB.prepare(
        `SELECT slug, published_at, updated_at 
         FROM posts 
         WHERE published_at IS NOT NULL 
         ORDER BY published_at DESC 
         LIMIT 200`
      ).all();
      posts = result.results as unknown as Post[];
    } catch (err) {
      console.error("Failed to fetch posts from D1:", err);
    }

    // Fetch landing pages from D1
    try {
      const result = await env.DB.prepare(
        `SELECT slug, updated_at, created_at 
         FROM landing_pages 
         WHERE status = 'published' 
         ORDER BY created_at DESC 
         LIMIT 500`
      ).all();
      landingPages = result.results as unknown as LandingPage[];
    } catch (err) {
      console.error("Failed to fetch landing pages from D1:", err);
    }

    // Generate XML
    let xmlEntries = "";

    // Static pages
    for (const page of staticPages) {
      const lastMod = formatDate(new Date().toISOString());
      xmlEntries += `
  <url>
    <loc>${page.loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }

    // Assets (coloring pages) with image sitemaps
    for (const asset of assets) {
      const slug = asset.slug || "design";
      const id = asset.asset_id || asset.id;
      const url = `${baseUrl}/coloring-pages/${slug}-${id}`;
      const lastMod = formatDate(asset.updated_at || asset.created_at);
      const title = escapeXml(asset.title || "Coloring Page");
      const imageUrl = asset.image_url || "";
      
      xmlEntries += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>`;
      
      // Add image sitemap if image URL exists
      if (imageUrl) {
        xmlEntries += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:caption>${title}</image:caption>
      <image:title>${title}</image:title>
    </image:image>`;
      }
      
      xmlEntries += `
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
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

    // Landing Pages (pSEO collections)
    for (const page of landingPages) {
      const url = `${baseUrl}/collection/${page.slug}`;
      const lastMod = formatDate(page.updated_at || page.created_at);
      xmlEntries += `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${xmlEntries}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=7200",
      },
    });
  } catch (err) {
    console.error("Sitemap generation error:", err);
    const errMessage = err instanceof Error ? err.message : String(err);
    return new Response(`Error generating sitemap: ${errMessage}`, { status: 500 });
  }
};
