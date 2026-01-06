// Cloudflare Pages Middleware for Bot Detection and SEO
// This middleware detects search engine bots and serves them HTML with visible navigation

interface Env {
  ASSETS: Fetcher;
}

// List of known SEO bot user agents
const SEO_BOTS = [
  'googlebot',
  'bingbot',
  'slurp',  // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'ia_archiver', // Alexa
  'facebookexternalhit',
  'twitterbot',
  'rogerbot', // Moz
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',  
  'outbrain',
  'pinterest',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'ahrefsbot', // Ahrefs crawler
  'semrushbot',
  'dotbot',
  'screaming frog', // Screaming Frog SEO Spider
];

// Static footer HTML that crawlers can see
const STATIC_FOOTER_HTML = `
<noscript id="bot-navigation">
  <footer style="background: #1a1a1a; color: white; padding: 3rem 1rem; margin-top: 4rem;">
    <div style="max-width: 1200px; margin: 0 auto;">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
        
        <!-- Main Pages -->
        <div>
          <h3 style="font-size: 1rem; margin-bottom: 1rem; color: white;">Browse</h3>
          <ul style="list-style: none; padding: 0; line-height: 2;">
            <li><a href="/vault" style="color: #cbd5e0; text-decoration: none;">The Vault</a></li>
            <li><a href="/blog" style="color: #cbd5e0; text-decoration: none;">Blog</a></li>
            <li><a href="/sitemap" style="color: #cbd5e0; text-decoration: none;">Sitemap</a></li>
            <li><a href="/request-design" style="color: #cbd5e0; text-decoration: none;">Request Design</a></li>
          </ul>
        </div>
        
        <!-- Company -->
        <div>
          <h3 style="font-size: 1rem; margin-bottom: 1rem; color: white;">Company</h3>
          <ul style="list-style: none; padding: 0; line-height: 2;">
            <li><a href="/about" style="color: #cbd5e0; text-decoration: none;">About Us</a></li>
            <li><a href="/pricing" style="color: #cbd5e0; text-decoration: none;">Pricing</a></li>
          </ul>
        </div>
        
        <!-- Legal -->
        <div>
          <h3 style="font-size: 1rem; margin-bottom: 1rem; color: white;">Legal</h3>
          <ul style="list-style: none; padding: 0; line-height: 2;">
            <li><a href="/privacy" style="color: #cbd5e0; text-decoration: none;">Privacy Policy</a></li>
            <li><a href="/terms" style="color: #cbd5e0; text-decoration: none;">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      
      <p style="text-align: center; color: #718096; padding-top: 2rem; border-top: 1px solid #2d3748;">
        © ${new Date().getFullYear()} HuePress. All rights reserved.
      </p>
    </div>
  </footer>
</noscript>
`;

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SEO_BOTS.some(bot => ua.includes(bot));
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next, env } = context;
  const userAgent = request.headers.get('user-agent') || '';
  
  // Get the response from the asset
  const response = await next();
  
  // Only process HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }
  
  // If it's a bot, inject static navigation
  if (isBot(userAgent)) {
    try {
      let html = await response.text();
      
      // Inject the static footer just before closing body tag
      // This gives bots visible links to crawl
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${STATIC_FOOTER_HTML}</body>`);
        
        // Return modified response
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
    } catch (error) {
      console.error('Error injecting bot navigation:', error);
      // Return original response on error
      return response;
    }
  }
  
  // For regular users, return normal response
  return response;
};
