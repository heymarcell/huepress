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

// IndexNow endpoint
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

interface IndexNowResult {
  success: boolean;
  url: string;
  count: number;
}

/**
 * Helper to fetch with retry logic for 429/5xx errors
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let delay = 1000; // Start with 1s

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok || response.status === 202) {
        return response;
      }

      // Retry on Rate Limit (429) or Server Error (5xx)
      if (response.status === 429 || response.status >= 500) {
        console.warn(`[IndexNow] Request failed with ${response.status}. Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      // Other client errors (400, 403, etc.) - do not retry
      return response;
    } catch (error) {
      console.warn(`[IndexNow] Network error. Retrying in ${delay}ms...`, error);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }

  // Final attempt
  return fetch(url, options);
}

/**
 * Notify search engines about a single URL change
 * Proxies to batch method for consistency
 */
export async function notifyIndexNow(url: string): Promise<IndexNowResult> {
  const result = await notifyIndexNowBatch([url]);
  return {
    success: result.success,
    url,
    count: result.count
  };
}

/**
 * Notify search engines about multiple URL changes (batch)
 * More efficient for bulk operations & uses POST
 */
export async function notifyIndexNowBatch(urls: string[]): Promise<{ success: boolean; count: number }> {
  if (urls.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const response = await fetchWithRetry(INDEXNOW_ENDPOINT, {
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
      console.log(`[IndexNow] Successfully notified ${urls.length} URLs (Status: ${response.status})`);
      return { success: true, count: urls.length };
    } else {
      console.warn(`[IndexNow] Notification failed with status ${response.status}`);
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
