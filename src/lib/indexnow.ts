/**
 * IndexNow Integration
 * 
 * Notifies search engines (Bing, Yandex, etc.) instantly when URLs change.
 * This helps get new/updated content indexed faster.
 * 
 * @see https://www.indexnow.org/documentation
 */

const INDEXNOW_KEY = "6036370EF1A6D786631BBA0C2FE92864";
const SITE_HOST = "huepress.co";

// IndexNow endpoints - submitting to one shares with all participating engines
const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

interface IndexNowResult {
  success: boolean;
  url: string;
  responses: { endpoint: string; status: number }[];
}

/**
 * Notify search engines about a single URL change
 */
export async function notifyIndexNow(url: string): Promise<IndexNowResult> {
  const responses: { endpoint: string; status: number }[] = [];
  
  // Use just the first endpoint - they share with each other
  const endpoint = INDEXNOW_ENDPOINTS[0];
  
  try {
    const requestUrl = `${endpoint}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`;
    
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "User-Agent": "HuePress/1.0"
      }
    });
    
    responses.push({ endpoint, status: response.status });
    
    if (response.ok || response.status === 202) {
      console.log(`[IndexNow] Successfully notified: ${url} (${response.status})`);
    } else {
      console.warn(`[IndexNow] Notification returned ${response.status} for: ${url}`);
    }
  } catch (error) {
    console.error(`[IndexNow] Failed to notify ${endpoint}:`, error);
    responses.push({ endpoint, status: 0 });
  }
  
  return {
    success: responses.some(r => r.status === 200 || r.status === 202),
    url,
    responses
  };
}

/**
 * Notify search engines about multiple URL changes (batch)
 * More efficient for bulk operations
 */
export async function notifyIndexNowBatch(urls: string[]): Promise<{ success: boolean; count: number }> {
  if (urls.length === 0) {
    return { success: true, count: 0 };
  }

  const endpoint = "https://api.indexnow.org/indexnow";
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "HuePress/1.0"
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        urlList: urls
      })
    });
    
    if (response.ok || response.status === 202) {
      console.log(`[IndexNow] Batch submitted ${urls.length} URLs (${response.status})`);
      return { success: true, count: urls.length };
    } else {
      console.warn(`[IndexNow] Batch returned ${response.status}`);
      return { success: false, count: 0 };
    }
  } catch (error) {
    console.error(`[IndexNow] Batch submission failed:`, error);
    return { success: false, count: 0 };
  }
}

/**
 * Helper to build asset URL
 */
export function buildAssetUrl(assetId: string, slug: string): string {
  return `https://${SITE_HOST}/coloring-pages/${assetId}/${slug}`;
}

/**
 * Helper to build blog post URL
 */
export function buildBlogUrl(slug: string): string {
  return `https://${SITE_HOST}/blog/${slug}`;
}
