// Cloudflare Pages Function for robots.txt generation
export const onRequest = async () => {
  const robotsTxt = `# HuePress Robots.txt
# Updated: ${new Date().toISOString().split('T')[0]}

User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Disallow: /admin/
Disallow: /api/
Disallow: /*?*utm_*

# Sitemaps
Sitemap: https://huepress.co/sitemap.xml

# Crawl-delay for specific bots (optional)
User-agent: GPTBot
Crawl-delay: 10

User-agent: ChatGPT-User
Crawl-delay: 10

User-agent: CCBot
Crawl-delay: 10
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
