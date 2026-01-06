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

// Rate limiting state
let lastSubmissionTime = 0;
const COOLDOWN_MS = 60000; // 60 seconds between submissions

// Track recently submitted URLs (prevent duplicates within 24h)
const recentSubmissions = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IndexNowResult {
  success: boolean;
  url: string;
  count: number;
  throttled?: boolean;
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
 * Check if we should throttle this submission
 */
function shouldThrottle(): { throttle: boolean; waitMs: number } {
  const now = Date.now();
  const timeSinceLastSubmission = now - lastSubmissionTime;
  
  if (timeSinceLastSubmission < COOLDOWN_MS) {
    return {
      throttle: true,
      waitMs: COOLDOWN_MS - timeSinceLastSubmission
    };
  }
  
  return { throttle: false, waitMs: 0 };
}

/**
 * Deduplicate URLs based on recent submission history
 */
function deduplicateUrls(urls: string[]): string[] {
  const now = Date.now();
  const unique: string[] = [];
  
  for (const url of urls) {
    const lastSubmitted = recentSubmissions.get(url);
    
    // Skip if submitted within 24 hours
    if (lastSubmitted && (now - lastSubmitted) < DUPLICATE_WINDOW_MS) {
      console.log(`[IndexNow] Skipping recently submitted URL: ${url}`);
      continue;
    }
    
    unique.push(url);
    recentSubmissions.set(url, now);
  }
  
  // Cleanup old entries (prevent memory leak)
  for (const [url, timestamp] of recentSubmissions.entries()) {
    if ((now - timestamp) > DUPLICATE_WINDOW_MS) {
      recentSubmissions.delete(url);
    }
  }
  
  return unique;
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
    count: result.count,
    throttled: result.throttled
  };
}

/**
 * Notify search engines about multiple URL changes (batch)
 * More efficient for bulk operations & uses POST
 */
export async function notifyIndexNowBatch(urls: string[]): Promise<{ success: boolean; count: number; throttled?: boolean }> {
  if (urls.length === 0) {
    return { success: true, count: 0 };
  }

  // Check cooldown
  const throttleCheck = shouldThrottle();
  if (throttleCheck.throttle) {
    console.warn(`[IndexNow] Throttled: Wait ${Math.ceil(throttleCheck.waitMs / 1000)}s before next submission`);
    return { success: false, count: 0, throttled: true };
  }

  // Deduplicate URLs
  const uniqueUrls = deduplicateUrls(urls);
  
  if (uniqueUrls.length === 0) {
    console.log('[IndexNow] All URLs recently submitted, skipping');
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
        urlList: uniqueUrls
      })
    });
    
    if (response.ok || response.status === 202) {
      lastSubmissionTime = Date.now(); // Update cooldown tracker
      console.log(`[IndexNow] Successfully notified ${uniqueUrls.length} URLs (Status: ${response.status})`);
      return { success: true, count: uniqueUrls.length };
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

/**
 * Reset state for testing purposes
 * @internal
 */
export function resetIndexNowState(): void {
  lastSubmissionTime = 0;
  recentSubmissions.clear();
}

