/**
 * Event ID utilities for analytics deduplication
 * 
 * Generates consistent event IDs that are shared between browser tags (via GTM/dataLayer)
 * and server-side CAPI calls to enable Meta and Pinterest deduplication.
 * 
 * Meta Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
 * Pinterest Docs: https://developers.pinterest.com/docs/api/v5/#tag/conversion_events
 */

/**
 * Generate a unique event ID (UUID v4 format)
 * This ID should be generated client-side and passed through the entire flow
 */
export function generateEventId(): string {
  // Use crypto.randomUUID if available (modern browsers and Workers runtime)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a purchase event ID that incorporates the transaction ID for extra uniqueness
 * This ensures the same purchase always generates the same event_id
 */
export function generatePurchaseEventId(transactionId: string): string {
  // For purchases, use a deterministic event_id based on transaction
  // This allows the same browser and server event to share the ID
  return `purchase-${transactionId}`;
}

/**
 * Cookie names for Meta tracking
 */
export const META_COOKIES = {
  FBP: '_fbp',  // Facebook browser ID
  FBC: '_fbc',  // Facebook click ID (from ad clicks)
} as const;

/**
 * Cookie names for Google Analytics (for GA4 Measurement Protocol stitching)
 */
export const GA_COOKIES = {
  GA: '_ga',           // GA client ID cookie
  GA_SESSION: '_ga_*', // Session ID (dynamic suffix based on measurement ID)
} as const;

/**
 * Extract the client ID from the _ga cookie
 * Format: GA1.1.XXXXXXXXXX.XXXXXXXXXX -> returns XXXXXXXXXX.XXXXXXXXXX
 */
export function extractGaClientId(gaCookie: string | undefined): string | undefined {
  if (!gaCookie) return undefined;
  
  // _ga cookie format: GA1.X.XXXXXXXXXX.XXXXXXXXXX
  // We want the last two segments (the actual client ID)
  const parts = gaCookie.split('.');
  if (parts.length >= 4) {
    return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  }
  return undefined;
}
