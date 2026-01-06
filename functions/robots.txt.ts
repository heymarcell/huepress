// Cloudflare Pages Function for robots.txt generation
// 2026 Best Practices: Block AI training bots, allow search crawlers

export const onRequest = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const robotsTxt = `# HuePress Robots.txt - State of the Art (2026)
# Updated: ${today}
# Optimized for Google, Bing, and all major search engines

# ========================================
# AI Training Policy (2026 Standard)
# ========================================
# Allow search indexing but prohibit AI training on our content
# This protects our proprietary coloring page designs while maintaining SEO visibility

User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Disallow: /admin/
Disallow: /api/
Disallow: /*?*utm_*
Disallow: /*?*fbclid*
Disallow: /*?*gclid*

# ========================================
# AI Bot Restrictions
# ========================================
# Block AI training bots while allowing search crawlers

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Omgilibot
Disallow: /

User-agent: FacebookBot
Disallow: /

# ========================================
# Sitemaps
# ========================================
Sitemap: https://huepress.co/sitemap.xml

# ========================================
# Crawl Rate Optimization
# ========================================
# Allow normal crawl rate for major search engines
# No crawl-delay needed - Cloudflare handles rate limiting
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=7200",
    },
  });
};
