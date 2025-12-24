/**
 * GA4 Measurement Protocol Helper
 * Server-side event tracking for purchase events.
 * 
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

interface GA4Event {
  name: string;
  params: Record<string, string | number | boolean | undefined>;
}

interface GA4Payload {
  client_id: string;
  events: GA4Event[];
  user_id?: string;
  timestamp_micros?: string;
}

/**
 * Generate a unique client ID for server-side events
 * GA4 requires a client_id even for server-side events
 */
function generateClientId(): string {
  // Format: random_number.timestamp (similar to GA4 _ga cookie format)
  const random = Math.floor(Math.random() * 2147483647);
  const timestamp = Math.floor(Date.now() / 1000);
  return `${random}.${timestamp}`;
}

/**
 * Send event to GA4 via Measurement Protocol
 */
export async function sendGA4Event(
  measurementId: string,
  apiSecret: string,
  event: {
    eventName: string;
    params: Record<string, string | number | boolean | undefined>;
    userId?: string;
    clientId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: GA4Payload = {
      client_id: event.clientId || generateClientId(),
      events: [{
        name: event.eventName,
        params: event.params,
      }],
    };

    // Add user_id if available (for user stitching)
    if (event.userId) {
      payload.user_id = event.userId;
    }

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // GA4 Measurement Protocol returns 204 No Content on success
    // It doesn't return a body, so we check status code
    if (response.status === 204 || response.ok) {
      console.log(`GA4 event sent: ${event.eventName}`);
      return { success: true };
    }

    // Try to get error details if available
    const text = await response.text();
    console.error('GA4 Measurement Protocol error:', response.status, text);
    return { 
      success: false, 
      error: `HTTP ${response.status}: ${text || 'Unknown error'}` 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('GA4 Measurement Protocol exception:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Track a Purchase event
 * Follows GA4 e-commerce purchase event schema
 */
export async function trackGA4Purchase(
  measurementId: string,
  apiSecret: string,
  data: {
    transactionId: string;
    value: number;
    currency: string;
    userId?: string;
    itemName?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendGA4Event(measurementId, apiSecret, {
    eventName: 'purchase',
    userId: data.userId,
    params: {
      transaction_id: data.transactionId,
      value: data.value,
      currency: data.currency,
      // Optional: Add items array for more detailed e-commerce tracking
      items: JSON.stringify([{
        item_id: data.transactionId,
        item_name: data.itemName || 'HuePress Subscription',
        price: data.value,
        quantity: 1,
      }]),
    },
  });
}

/**
 * Track a Sign Up event
 * Called when a new user registers
 */
export async function trackGA4Signup(
  measurementId: string,
  apiSecret: string,
  data: {
    userId: string;
    method?: string; // e.g., 'email', 'google', 'apple'
  }
): Promise<{ success: boolean; error?: string }> {
  return sendGA4Event(measurementId, apiSecret, {
    eventName: 'sign_up',
    userId: data.userId,
    params: {
      method: data.method || 'email',
    },
  });
}

/**
 * Track a Lead/Email Capture event
 * Called when a user submits their email for newsletter/free samples
 */
export async function trackGA4Lead(
  measurementId: string,
  apiSecret: string,
  data: {
    source?: string; // e.g., 'newsletter', 'free_samples', 'vault_email'
  }
): Promise<{ success: boolean; error?: string }> {
  return sendGA4Event(measurementId, apiSecret, {
    eventName: 'generate_lead',
    params: {
      lead_source: data.source || 'website',
    },
  });
}

