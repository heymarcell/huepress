/// <reference types="@cloudflare/workers-types" />

// Generate bot-friendly grid for /vault and /collection pages
export async function generateBotGrid(db: D1Database | undefined): Promise<string> {
  if (!db) return ''; // No database access
  
  try {
    const result = await db.prepare(`
      SELECT id, asset_id, slug, title, image_url 
      FROM assets 
      WHERE status = 'published' 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();

    const assets = result.results as Array<{
      id: string;
      asset_id: string;
      slug: string;
      title: string;
      image_url: string;
    }>;

    if (!assets || assets.length === 0) {
      return '';
    }

    return `
<!-- Bot-friendly coloring page grid (100 pages for discovery) -->
<div style="max-width: 1200px; margin: 3rem auto; padding: 0 1rem;">
  <h2 style="font-size: 2rem; margin-bottom: 2rem; color: #1a1a1a;">Explore All Coloring Pages</h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2rem;">
    ${assets.map(asset => {
      const url = `/coloring-pages/${asset.slug || 'design'}-${asset.asset_id || asset.id}`;
      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white;">
          <a href="${url}" style="text-decoration: none; color: inherit;">
            <img src="${asset.image_url}" alt="${asset.title}" style="width: 100%; aspect-ratio: 1; object-fit: cover;" loading="lazy" />
            <div style="padding: 1rem;">
              <h3 style="font-size: 1rem; margin: 0; color: #1a1a1a;">${asset.title}</h3>
            </div>
          </a>
        </div>
      `;
    }).join('')}
  </div>
</div>
`;
  } catch (error) {
    console.error('Bot grid generation error:', error);
    return '';
  }
}
