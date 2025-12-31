/**
 * Pinterest Conversions API Helper
 * Server-side event tracking for better attribution and ad optimization.
 * 
 * Docs: https://developers.pinterest.com/docs/api/v5/#tag/conversion_events
 */

const PINTEREST_API_VERSION = 'v5';

interface PinterestUserData {
  em?: string[];           // Email (SHA-256 hashed)
  ph?: string[];           // Phone (SHA-256 hashed)
  hashed_maids?: string[]; // Mobile advertising IDs (hashed)
  client_ip_address?: string;
  client_user_agent?: string;
  external_id?: string[];  // External ID (hashed)
}

interface PinterestCustomData {
  currency?: string;
  value?: string;         // Pinterest uses string for value
  content_ids?: string[];
  content_name?: string;
  content_category?: string;
  content_brand?: string;
  num_items?: number;
  order_id?: string;
}

interface PinterestEvent {
  event_name: 'checkout' | 'add_to_cart' | 'page_visit' | 'signup' | 'lead' | 'custom';
  action_source: 'app_android' | 'app_ios' | 'web' | 'offline';
  event_time: number;
  event_id: string;
  event_source_url?: string;
  user_data: PinterestUserData;
  custom_data?: PinterestCustomData;
  partner_name?: string;
}

interface PinterestPayload {
  data: PinterestEvent[];
}

/**
 * Hash a value using SHA-256 for Pinterest's data requirements
 */
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique event ID for deduplication (fallback)
 * Prefer passing event_id from client-side for proper deduplication
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Send event to Pinterest Conversions API
 */
export async function sendPinterestEvent(
  accessToken: string,
  adAccountId: string,
  event: {
    eventName: 'checkout' | 'add_to_cart' | 'page_visit' | 'signup' | 'lead' | 'custom';
    email?: string;
    value?: number;
    currency?: string;
    contentName?: string;
    orderId?: string;
    eventSourceUrl?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    externalId?: string;
    eventId?: string; // Pass from client-side for browser/server deduplication
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventId = event.eventId || generateEventId();
    const eventTime = Math.floor(Date.now() / 1000);

    // Build user data with hashing
    const userData: PinterestUserData = {};
    
    if (event.email) {
      const hashedEmail = await hashValue(event.email);
      userData.em = [hashedEmail];
    }
    if (event.externalId) {
      const hashedId = await hashValue(event.externalId);
      userData.external_id = [hashedId];
    }
    if (event.clientIpAddress) {
      userData.client_ip_address = event.clientIpAddress;
    }
    if (event.clientUserAgent) {
      userData.client_user_agent = event.clientUserAgent;
    }

    // Build custom data
    const customData: PinterestCustomData = {};
    if (event.value !== undefined) {
      customData.value = event.value.toFixed(2); // Pinterest wants string
    }
    if (event.currency) {
      customData.currency = event.currency;
    }
    if (event.contentName) {
      customData.content_name = event.contentName;
    }
    if (event.orderId) {
      customData.order_id = event.orderId;
    }

    const pinterestEvent: PinterestEvent = {
      event_name: event.eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: 'web',
      user_data: userData,
      partner_name: 'ss-huepress',
    };

    if (event.eventSourceUrl) {
      pinterestEvent.event_source_url = event.eventSourceUrl;
    }

    if (Object.keys(customData).length > 0) {
      pinterestEvent.custom_data = customData;
    }

    const payload: PinterestPayload = {
      data: [pinterestEvent],
    };

    const url = `https://api.pinterest.com/${PINTEREST_API_VERSION}/ad_accounts/${adAccountId}/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as { num_events_received?: number; num_events_processed?: number; events?: unknown[]; message?: string };

    if (!response.ok) {
      console.error('Pinterest Conversions API error:', result);
      return { 
        success: false, 
        error: result.message || 'Failed to send event' 
      };
    }

    console.log(`Pinterest event sent: ${event.eventName}`, { eventId, eventsReceived: result.num_events_received });
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pinterest Conversions API exception:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Track a Checkout/Purchase event
 */
export async function trackPinterestCheckout(
  accessToken: string,
  adAccountId: string,
  siteUrl: string,
  data: {
    email: string;
    value: number;
    currency: string;
    orderId?: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    eventId?: string; // For browser/server deduplication
  }
): Promise<{ success: boolean; error?: string }> {
  return sendPinterestEvent(accessToken, adAccountId, {
    eventName: 'checkout',
    email: data.email,
    value: data.value,
    currency: data.currency,
    orderId: data.orderId,
    externalId: data.externalId,
    clientIpAddress: data.clientIpAddress,
    clientUserAgent: data.clientUserAgent,
    eventSourceUrl: `${siteUrl}/pricing`,
    eventId: data.eventId,
  });
}

/**
 * Track a Signup event
 */
export async function trackPinterestSignup(
  accessToken: string,
  adAccountId: string,
  siteUrl: string,
  data: {
    email: string;
    externalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendPinterestEvent(accessToken, adAccountId, {
    eventName: 'signup',
    email: data.email,
    externalId: data.externalId,
    eventSourceUrl: siteUrl,
  });
}

/**
 * Track a Lead event (email capture)
 */
export async function trackPinterestLead(
  accessToken: string,
  adAccountId: string,
  siteUrl: string,
  data: {
    email: string;
    externalId?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendPinterestEvent(accessToken, adAccountId, {
    eventName: 'lead',
    email: data.email,
    externalId: data.externalId,
    clientIpAddress: data.clientIpAddress,
    clientUserAgent: data.clientUserAgent,
    eventSourceUrl: `${siteUrl}/vault`,
  });
}
