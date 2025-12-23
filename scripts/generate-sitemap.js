import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
// If public dir exists, use that for source of truth for base files, 
// but we write to dist for final build usually, or public for dev.
// Let's write to public so it's picked up by build.
const PUBLIC_DIR = path.join(__dirname, '../public');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

const DOMAIN = 'https://huepress.co';

// Static routes
const routes = [
  '/',
  '/pricing',
  '/about',
  '/vault',
  '/privacy',
  '/terms',
];

// Mock dynamic assets (In real app, fetch from API/DB)
// Ideally this script runs *after* fetching data or connects to DB.
// For now, hardcode the known demo items.
const assets = [
  { id: '1', updated: '2024-01-01' },
  { id: '2', updated: '2024-01-02' },
  { id: '3', updated: '2024-01-03' },
  { id: '4', updated: '2024-01-04' },
  { id: '5', updated: '2024-01-05' },
  { id: '6', updated: '2024-01-06' },
];

function generateSitemap() {
  const urls = [
    ...routes.map(route => ({
      loc: `${DOMAIN}${route}`,
      changefreq: 'weekly',
      priority: route === '/' ? '1.0' : '0.8',
    })),
    ...assets.map(asset => ({
      loc: `${DOMAIN}/vault/${asset.id}`,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, sitemap);
  console.log(`✅ Sitemap generated at ${SITEMAP_PATH}`);
}

generateSitemap();
