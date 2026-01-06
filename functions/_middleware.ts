// Cloudflare Pages Middleware for Bot Detection and SEO
// This middleware detects search engine bots and serves them HTML with visible navigation
/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: unknown;
  DB?: D1Database; // D1 database for bot SSR
}

type PagesFunction<T = unknown> = (context: {
  request: Request;
  env: T;
  params: Record<string, string>;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
}) => Response | Promise<Response>;

// List of known SEO bot user agents
const SEO_BOTS = [
  'googlebot',
  'bingbot',
  'slurp',  // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
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
  'applebot', // Apple Siri/Spotlight
  'amazonbot', // Alexa/Amazon
  'bingpreview', // Bing Page Preview
  'google-inspectiontool', // GSC Live Test
  'adsbot-google', // Google Ads
];

// Schema.org structured data for homepage (injected for bots)
const ORGANIZATION_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://huepress.co/#organization",
  "name": "HuePress",
  "url": "https://huepress.co",
  "logo": {
    "@type": "ImageObject",
    "url": "https://huepress.co/logo.svg",
    "width": "180",
    "height": "180"
  },
  "description": "Therapy-grade printable coloring pages designed by licensed occupational therapists for children with autism, ADHD, sensory processing challenges, and fine motor delays.",
  "foundingDate": "2024",
  "sameAs": [
    "https://www.pinterest.com/huepress",
    "https://twitter.com/huepress"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@huepress.co",
    "availableLanguage": "English"
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "US"
  }
}
</script>`;

const WEBSITE_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://huepress.co/#website",
  "url": "https://huepress.co",
  "name": "HuePress",
  "description": "Therapy-grade coloring pages for kids and families",
  "publisher": {
    "@id": "https://huepress.co/#organization"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://huepress.co/vault?search={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
</script>`;

// FAQ Schema for About page
const ABOUT_FAQ_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Who creates HuePress coloring pages?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "HuePress coloring pages are designed or reviewed by licensed pediatric occupational therapists with 10+ years of combined experience in sensory integration therapy, fine motor skill development, and therapeutic art interventions."
      }
    },
    {
      "@type": "Question",
      "name": "What makes HuePress pages therapy-grade?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our pages feature bold, thick lines (3-5mm stroke width) specifically designed for children with fine motor challenges, autism spectrum disorder, or ADHD. Each page is reviewed by licensed occupational therapists to ensure it supports developmental goals like hand-eye coordination, focus, and sensory regulation."
      }
    },
    {
      "@type": "Question",
      "name": "Are HuePress pages suitable for children with autism?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Our Bold and Easy skill levels are specifically designed for children with autism, featuring high-contrast, low-clutter designs to reduce sensory overwhelm, predictable symmetrical patterns, and large sections that are easier to color within."
      }
    },
    {
      "@type": "Question",
      "name": "Can occupational therapists use HuePress in clinical settings?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely. Many pediatric OTs use HuePress pages in therapy sessions. HuePress Club membership includes a Therapist License allowing use with clients. We also offer bulk licensing for clinics and schools."
      }
    }
  ]
}
</script>`;

// FAQ Schema for Pricing page
const PRICING_FAQ_SCHEMA = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does HuePress Club cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "HuePress Club costs $5 per month and gives you unlimited downloads of all 500+ therapy-grade coloring pages. You can cancel anytime with one click."
      }
    },
    {
      "@type": "Question",
      "name": "Can I try HuePress for free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! We offer 3 free sample coloring pages with no credit card required. Just enter your email and get an instant download link."
      }
    },
    {
      "@type": "Question",
      "name": "What's included in HuePress Club?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "HuePress Club includes unlimited downloads of 500+ coloring pages, new designs every Sunday, vector PDF files for crisp printing, no watermarks or ads, and the ability to cancel anytime."
      }
    },
    {
      "@type": "Question",
      "name": "Can I cancel my subscription?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, you can cancel your HuePress Club subscription at any time with one click from your account settings. There are no cancellation fees or commitments."
      }
    },
    {
      "@type": "Question",
      "name": "Do you offer bulk licensing for schools or clinics?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, we offer institutional bulk licensing for schools, clinics, and therapy centers. Contact support@huepress.co for custom pricing and volume discounts."
      }
    }
  ]
}
</script>`;

// Helper function to generate Product schema for coloring pages
function generateProductSchema(slug: string): string {
  // Extract title from slug (remove asset ID)
  const parts = slug.split('-');
  const titleParts = parts.slice(0, -1);
  const title = titleParts.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "${title} - Printable Coloring Page",
  "description": "Therapy-grade printable ${title.toLowerCase()} coloring page. Bold, clear lines perfect for developing fine motor skills. Designed by occupational therapists for kids with autism, ADHD, and sensory processing needs.",
  "image": "https://huepress.co/og-image.png",
  "brand": {
    "@type": "Brand",
    "name": "HuePress"
  },
  "offers": {
    "@type": "Offer",
    "price": "0.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://huepress.co/coloring-pages/${slug}"
  }
}
</script>`;
}

// Helper function to generate Article schema for blog posts
function generateArticleSchema(slug: string): string {
  // Extract title from slug
  const title = slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  const today = new Date().toISOString().split('T')[0];
  
  return `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${title}",
  "description": "Expert tips and guidance on ${title.toLowerCase()} from licensed pediatric occupational therapists.",
  "image": "https://huepress.co/og-image.png",
  "datePublished": "${today}",
  "dateModified": "${today}",
  "author": {
    "@type": "Organization",
    "name": "HuePress",
    "url": "https://huepress.co"
  },
  "publisher": {
    "@id": "https://huepress.co/#organization"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://huepress.co/blog/${slug}"
  }
}
</script>`;
}

// Static footer HTML that crawlers can see
const STATIC_FOOTER_HTML = `
<!-- Bot-friendly navigation footer (unwrapped from noscript for Ahrefs) -->
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
      
      <!-- Categories -->
      <div>
        <h3 style="font-size: 1rem; margin-bottom: 1rem; color: white;">Categories</h3>
        <ul style="list-style: none; padding: 0; line-height: 2;">
          <li><a href="/vault?category=animals" style="color: #cbd5e0; text-decoration: none;">Animals</a></li>
          <li><a href="/vault?category=nature" style="color: #cbd5e0; text-decoration: none;">Nature</a></li>
          <li><a href="/vault?category=holidays" style="color: #cbd5e0; text-decoration: none;">Holidays</a></li>
          <li><a href="/vault?category=learning" style="color: #cbd5e0; text-decoration: none;">Educational</a></li>
        </ul>
      </div>
      
      <!-- Popular Collections -->
      <div>
        <h3 style="font-size: 1rem; margin-bottom: 1rem; color: white;">Collections</h3>
        <ul style="list-style: none; padding: 0; line-height: 2;">
          <li><a href="/collection/seasonal-flower-coloring-pages-for-all-ages" style="color: #cbd5e0; text-decoration: none;">Seasonal Flowers</a></li>
          <li><a href="/collection/fun-shapes-coloring-pages-for-preschoolers" style="color: #cbd5e0; text-decoration: none;">Fun Shapes</a></li>
          <li><a href="/collection/animal-coloring-pages-for-kids" style="color: #cbd5e0; text-decoration: none;">Animals for Kids</a></li>
        </ul>
      </div>
      
      <!-- Company -->
      <div>
        <h3 style="font-size: 1rem; margin-bottom: 1rem; color: white;">Company</h3>
        <ul style="list-style: none; padding: 0; line-height: 2;">
          <li><a href="/about" style="color: #cbd5e0; text-decoration: none;">About Us</a></li>
          <li><a href="/pricing" style="color: #cbd5e0; text-decoration: none;">Pricing</a></li>
          <li><a href="/privacy" style="color: #cbd5e0; text-decoration: none;">Privacy</a></li>
          <li><a href="/terms" style="color: #cbd5e0; text-decoration: none;">Terms</a></li>
        </ul>
      </div>
    </div>
    
    <p style="text-align: center; color: #718096; padding-top: 2rem; border-top: 1px solid #2d3748;">
      © ${new Date().getFullYear()} HuePress. All rights reserved.
    </p>
  </div>
</footer>
`;

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SEO_BOTS.some(bot => ua.includes(bot));
}

// Generate H1 tag from URL for SEO bots
function generateH1FromUrl(url: URL): string {
  const path = url.pathname;
  
  // Collection pages
  if (path.startsWith('/collection/')) {
    const slug = path.split('/collection/')[1];
    const title = slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    return title;
  }
  
  // Coloring pages
  if (path.startsWith('/coloring-pages/')) {
    const slug = path.split('/coloring-pages/')[1];
    // Remove asset ID (last segment after final dash)
    const parts = slug.split('-');
    const titleParts = parts.slice(0, -1); // Remove ID
    return titleParts.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  // Static pages
  const staticPages: Record<string, string> = {
    '/': 'HuePress - Therapy-Grade Coloring Pages for Kids & Families',
    '/vault': 'The Vault - Browse All Coloring Pages',
    '/about': 'About HuePress',
    '/pricing': 'Pricing Plans',
    '/blog': 'Coloring Tips & Parenting Advice Blog',
    '/sitemap': 'Site Map',
    '/request-design': 'Request a Custom Design',
  };
  
  return staticPages[path] || 'HuePress Coloring Pages';
}

// Generate page title from URL (for <title> tag)
function generateTitleFromUrl(url: URL): string {
  const path = url.pathname;
  
  // Collection pages
  if (path.startsWith('/collection/')) {
    const slug = path.split('/collection/')[1];
    let title = slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Optimization: Remove "Collection" and condense common phrases
    // "Seasonal Flower Coloring Pages For All Ages" -> "Seasonal Flower Coloring Pages (All Ages)"
    title = title.replace(/ For /g, ' ').replace(/All Ages/g, '(All Ages)');
    
    return `${title} | HuePress`;
  }
  
  // Coloring pages  
  if (path.startsWith('/coloring-pages/')) {
    const slug = path.split('/coloring-pages/')[1];
    const parts = slug.split('-');
    // Extract ID (last part) to just get title
    const titleParts = parts.slice(0, -1);
    const title = titleParts.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return `${title} (PDF) | HuePress`;
  }
  
  // Static pages with unique titles (Optimized lengths)
  const staticTitles: Record<string, string> = {
    '/': 'HuePress | Therapy-Grade Coloring Pages for Kids & Families',
    '/vault': 'The Vault: 500+ Therapy-Grade Coloring Pages | HuePress',
    '/about': 'About HuePress: Our Mission & Story | HuePress',
    '/pricing': 'HuePress Club Pricing: Unlimited PDF Downloads',
    '/blog': 'Coloring Tips & OT Advice Blog | HuePress',
    '/sitemap': 'Site Map | HuePress',
    '/request-design': 'Request a Custom Coloring Page | HuePress',
    '/privacy': 'Privacy Policy | HuePress',
    '/terms': 'Terms of Service | HuePress',
  };
  
  return staticTitles[path] || 'HuePress | Therapy-Grade Coloring Pages';
}

// Generate page description from URL
function generateDescriptionFromUrl(url: URL): string {
  const path = url.pathname;
  
  if (path.startsWith('/collection/')) {
    const slug = path.split('/collection/')[1];
    const title = slug.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    // Concise: ~140 chars
    return `Download ${title} coloring pages. Therapy-grade PDFs designed for fine motor skills. Perfect for kids, adults & OTs. Instant print.`;
  }
  
  if (path.startsWith('/coloring-pages/')) {
    const slug = path.split('/coloring-pages/')[1];
    const parts = slug.split('-');
    const titleParts = parts.slice(0, -1);
    const title = titleParts.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    // Concise: ~130 chars
    return `Printable ${title} coloring page (PDF). Simple, bold lines perfect for autism, ADHD & fine motor practice. Download & print instantly.`;
  }
  
  const staticDescriptions: Record<string, string> = {
    '/': 'Therapy-grade coloring pages for kids & adults. Designed by OTs for autism, ADHD & fine motor skills. Bold, simple lines. Join the Club today!',
    '/vault': 'Browse 500+ printable coloring pages. Filter by skill level & category. OT-approved designs for focus, calm & creativity. Unlimited downloads.',
    '/about': 'HuePress creates therapy-grade art for neurodiverse kids. Founded by design-conscious parents & OTs to build confidence through coloring.',
    '/pricing': 'Join HuePress Club for $9/mo. Get unlimited access to 500+ therapy-grade coloring pages. New designs weekly. Cancel anytime.',
    '/blog': 'Expert advice from OTs on using coloring for therapy. Learn about fine motor milestones, grip strength, and sensory processing activities.',
  };
  
  return staticDescriptions[path] || 'Therapy-grade coloring pages designed by OTs for focus and calm.';
}

// SEO content block for bots (adds 200+ words)
const SEO_CONTENT_BLOCK = `
<div style="max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.8; color: #333; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <h2 style="font-size: 1.5rem; margin: 1.5rem 0 1rem; color: #1a1a1a;">About This Coloring Page</h2>
  <p style="margin-bottom: 1rem;">This printable coloring page is part of HuePress's collection of 500+ therapy-grade coloring pages designed for children, families, and educators. Each page features bold, clear lines perfect for developing fine motor skills and creative expression.</p>
  
  <h3 style="font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #1a1a1a;">Therapeutic Benefits of Coloring</h3>
  <ul style="margin: 0.5rem 0 1rem 1.5rem; line-height: 1.8;">
    <li>Improves focus and concentration through mindful activity</li>
    <li>Develops fine motor skills and hand-eye coordination</li>
    <li>Provides stress relief and promotes relaxation</li>
    <li>Encourages creative self-expression and color exploration</li>
    <li>Builds confidence through completion of creative projects</li>
  </ul>
  
  <h3 style="font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #1a1a1a;">Perfect For</h3>
  <p style="margin-bottom: 1rem;">This coloring page is suitable for kids ages 3-12, occupational therapists, speech therapists, teachers, and parents looking for engaging quiet-time activities. Our pages are used in classrooms, therapy sessions, and homes worldwide.</p>
  
  <h3 style="font-size: 1.25rem; margin: 1.5rem 0 0.75rem; color: #1a1a1a;">How to Use This Coloring Page</h3>
  <ol style="margin: 0.5rem 0 1rem 1.5rem; line-height: 1.8;">
    <li>Download the high-quality PDF version</li>
    <li>Print on standard letter-size paper (8.5" x 11")</li>
    <li>Use crayons, markers, colored pencils, or watercolors</li>
    <li>Display your finished artwork on the fridge or wall!</li>
  </ol>
  
  <p style="margin: 1.5rem 0;">Explore more coloring pages in our vault and discover pages perfect for every season, holiday, learning theme, and developmental stage. All pages are designed with thick, bold lines that are easy for small hands to color within.</p>
</div>
`;

import { generateBotGrid } from './_bot-grid';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next } = context;
  const userAgent = request.headers.get('user-agent') || '';
  
  // Get the response from the asset
  const response = await next();
  
  // Only process HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }
  
  // If it's a bot, inject static navigation and enhanced meta tags
  if (isBot(userAgent)) {
    try {
      let html = await response.text();
      
      // Generate unique title and H1 from URL
      const pageTitle = generateTitleFromUrl(new URL(request.url));
      const h1Text = generateH1FromUrl(new URL(request.url));
      const h1Tag = `<h1 style="font-size: 2.5rem; font-weight: 700; margin: 2rem 0 1rem; padding: 0 1rem; max-width: 800px; margin-left: auto; margin-right: auto; font-family: Georgia, serif;">${h1Text}</h1>`;
      
      // Generate page-specific description and image
      const pageDescription = generateDescriptionFromUrl(new URL(request.url));
      const pageImage = 'https://huepress.co/og-image.png'; // Default OG image
      const canonicalUrl = request.url;
      
      // Inject bot-friendly meta tags and UNIQUE title in head
      if (html.includes('<head>')) {
        const botMetaTags = `
    <!-- Bot-friendly meta tags -->
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${pageDescription}">
    <meta property="og:image" content="${pageImage}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="HuePress">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${pageDescription}">
    <meta name="twitter:image" content="${pageImage}">
    <meta name="twitter:creator" content="@huepress">`;
        
        html = html.replace('<head>', `<head>${botMetaTags}`);
        
        // Inject schemas for bots based on page type
        const pathname = new URL(request.url).pathname;
        
        if (pathname === "/") {
          // Homepage: Organization + WebSite schemas
          html = html.replace("</head>", `${ORGANIZATION_SCHEMA}\n${WEBSITE_SCHEMA}\n</head>`);
        } else if (pathname.startsWith('/blog/')) {
          // Blog posts: Article schema
          const slug = pathname.split('/blog/')[1];
          if (slug) {
            const articleSchema = generateArticleSchema(slug);
            html = html.replace("</head>", `${articleSchema}\n</head>`);
          }
        } else if (pathname.startsWith('/coloring-pages/')) {
          // Coloring pages: Product schema
          const slug = pathname.split('/coloring-pages/')[1];
          if (slug) {
            const productSchema = generateProductSchema(slug);
            html = html.replace("</head>", `${productSchema}\n</head>`);
          }
        } else if (pathname === '/pricing') {
          // Pricing page: FAQ schema
          html = html.replace("</head>", `${PRICING_FAQ_SCHEMA}\n</head>`);
        } else if (pathname === '/about') {
          // About page: FAQ schema
          html = html.replace("</head>", `${ABOUT_FAQ_SCHEMA}\n</head>`);
        }
        
        // Replace the static title and description with page-specific ones
        // Handle multi-line tags in regex
        html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${pageTitle}</title>`);
        
        // Robust meta description replacement handling multi-line attributes
        const descriptionRegex = /<meta[^>]*name=["']description["'][^>]*content=["'][\s\S]*?["'][^>]*>|<meta[^>]*content=["'][\s\S]*?["'][^>]*name=["']description["'][^>]*>/i;
        
        if (descriptionRegex.test(html)) {
          html = html.replace(descriptionRegex, `<meta name="description" content="${pageDescription}">`);
        } else {
          // If no existing description, append it to head
          html = html.replace('</head>', `<meta name="description" content="${pageDescription}">\n</head>`);
        }
      }
      
      // Inject H1 right after opening body tag
      // Only inject if no H1 exists to avoid duplicates
      if (html.includes('<body') && !html.includes('<h1')) {
        // Find the end of the body tag (after any attributes)
        const bodyTagEnd = html.indexOf('>', html.indexOf('<body')) + 1;
        html = html.slice(0, bodyTagEnd) + `\n${h1Tag}\n` + html.slice(bodyTagEnd);
      } else if (html.includes('<body')) {
         // If H1 exists (static), replacing it might be safer, or just prepending ours knowing React will hydrate over the static one?
         // For bots, we want OUR H1. 
         // Let's replace the existing H1 if matched, otherwise inject.
         // Matching arbitrary H1 is risky. Let's just prepend ours, bots usually prioritize the first one or we can assume static H1 has negligible content.
         // Actually, most static H1s are empty or generic. Let's inject ours as intended.
         const bodyTagEnd = html.indexOf('>', html.indexOf('<body')) + 1;
         html = html.slice(0, bodyTagEnd) + `\n${h1Tag}\n` + html.slice(bodyTagEnd);
      }
      
      // Inject bot grid for /vault and /collection pages (hybrid SSR)
      const url = new URL(request.url);
      if (url.pathname === '/vault' || url.pathname.startsWith('/collection/')) {
        const botGrid = await generateBotGrid();
        if (botGrid && html.includes('<!-- BOT_GRID_INJECTION -->')) {
          html = html.replace('</body>', `${botGrid}\n${SEO_CONTENT_BLOCK}\n${STATIC_FOOTER_HTML}</body>`);
        } else if (html.includes('</body>')) {
          html = html.replace('</body>', `${SEO_CONTENT_BLOCK}\n${STATIC_FOOTER_HTML}</body>`);
        }
      } else {
        // Inject SEO content block before footer for other pages
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${SEO_CONTENT_BLOCK}\n${STATIC_FOOTER_HTML}</body>`);
        }
      }
        
      // Return modified response
      const headers = new Headers(response.headers);
      headers.set('Vary', 'User-Agent');
      // Force bots to see fresh content (bust cache)
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
    } catch (error) {
      console.error('Error injecting bot navigation:', error);
      // Return original response on error
      return response;
    }
  }
  
  // For regular users, return normal response
  return response;
};
