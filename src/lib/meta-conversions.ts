/**
 * Meta Conversions API Helper
 * Server-side event tracking for better attribution and ad optimization.
 * 
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const META_API_VERSION = 'v21.0';

interface UserData {
  em?: string;        // Email (hashed)
  ph?: string;        // Phone (hashed)
  fn?: string;        // First name (hashed)
  ln?: string;        // Last name (hashed)
  external_id?: string; // External ID (hashed)
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;       // Facebook click ID (from _fbc cookie)
  fbp?: string;       // Facebook browser ID (from _fbp cookie)
  country?: string;   // Country code (hashed)
}

interface CustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  order_id?: string;
  predicted_ltv?: number;
}

interface ServerEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: UserData;
  custom_data?: CustomData;
  opt_out?: boolean;
}

interface ConversionsAPIPayload {
  data: ServerEvent[];
  test_event_code?: string; // For testing without affecting production data
}

/**
 * Hash a value using SHA-256 for Meta's data requirements
 */
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique event ID for deduplication
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Send event to Meta Conversions API
 */
export async function sendMetaEvent(
  accessToken: string,
  pixelId: string,
  event: {
    eventName: 'Purchase' | 'Subscribe' | 'Lead' | 'CompleteRegistration' | 'InitiateCheckout' | 'ViewContent';
    email?: string;
    value?: number;
    currency?: string;
    contentName?: string;
    orderId?: string;
    eventSourceUrl?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    externalId?: string;
    testEventCode?: string; // Set to your test code during development
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const eventId = generateEventId();
    const eventTime = Math.floor(Date.now() / 1000);

    // Build user data with hashing
    const userData: UserData = {};
    
    if (event.email) {
      userData.em = await hashValue(event.email);
    }
    if (event.externalId) {
      userData.external_id = await hashValue(event.externalId);
    }
    if (event.clientIpAddress) {
      userData.client_ip_address = event.clientIpAddress;
    }
    if (event.clientUserAgent) {
      userData.client_user_agent = event.clientUserAgent;
    }

    // Build custom data
    const customData: CustomData = {};
    if (event.value !== undefined) {
      customData.value = event.value;
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

    const serverEvent: ServerEvent = {
      event_name: event.eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: 'website',
      user_data: userData,
    };

    if (event.eventSourceUrl) {
      serverEvent.event_source_url = event.eventSourceUrl;
    }

    if (Object.keys(customData).length > 0) {
      serverEvent.custom_data = customData;
    }

    const payload: ConversionsAPIPayload = {
      data: [serverEvent],
    };

    // Add test event code if provided (for development testing)
    if (event.testEventCode) {
      payload.test_event_code = event.testEventCode;
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        access_token: accessToken,
      }),
    });

    const result = await response.json() as any;

    if (!response.ok) {
      console.error('Meta Conversions API error:', result);
      return { 
        success: false, 
        error: result.error?.message || 'Failed to send event' 
      };
    }

    console.log(`Meta event sent: ${event.eventName}`, { eventId, eventsReceived: result.events_received });
    return { success: true };
  } catch (error: any) {
    console.error('Meta Conversions API exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Track a Purchase event (call after successful Stripe payment)
 */
export async function trackPurchase(
  accessToken: string,
  pixelId: string,
  siteUrl: string,
  data: {
    email: string;
    value: number;
    currency: string;
    orderId?: string;
    externalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendMetaEvent(accessToken, pixelId, {
    eventName: 'Purchase',
    email: data.email,
    value: data.value,
    currency: data.currency,
    orderId: data.orderId,
    externalId: data.externalId,
    eventSourceUrl: `${siteUrl}/pricing`,
  });
}

/**
 * Track a Subscribe event
 */
export async function trackSubscribe(
  accessToken: string,
  pixelId: string,
  siteUrl: string,
  data: {
    email: string;
    value: number;
    currency: string;
    externalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendMetaEvent(accessToken, pixelId, {
    eventName: 'Subscribe',
    email: data.email,
    value: data.value,
    currency: data.currency,
    externalId: data.externalId,
    eventSourceUrl: `${siteUrl}/pricing`,
  });
}

/**
 * Track a Lead event (email capture)
 */
export async function trackLead(
  accessToken: string,
  pixelId: string,
  siteUrl: string,
  data: {
    email: string;
    externalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendMetaEvent(accessToken, pixelId, {
    eventName: 'Lead',
    email: data.email,
    externalId: data.externalId,
    eventSourceUrl: `${siteUrl}/vault`,
  });
}

/**
 * Track a CompleteRegistration event
 */
export async function trackCompleteRegistration(
  accessToken: string,
  pixelId: string,
  siteUrl: string,
  data: {
    email: string;
    externalId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendMetaEvent(accessToken, pixelId, {
    eventName: 'CompleteRegistration',
    email: data.email,
    externalId: data.externalId,
    eventSourceUrl: siteUrl,
  });
}
