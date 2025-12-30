/**
 * Analytics Monitoring Logger
 * 
 * Provides structured logging for conversion API events
 * that can be picked up by Cloudflare Logpush or monitoring tools.
 * 
 * Log format is JSON for easy parsing by log aggregators.
 */

export type CAPIProvider = 'meta' | 'pinterest' | 'ga4';
export type EventStatus = 'success' | 'failure' | 'retry';

export interface CAPILogEvent {
  timestamp: string;
  provider: CAPIProvider;
  event_type: string;
  status: EventStatus;
  user_id?: string;
  transaction_id?: string;
  event_id?: string;
  duration_ms?: number;
  error?: string;
  error_code?: string;
}

/**
 * Log a CAPI event with structured data for monitoring
 */
export function logCAPIEvent(event: CAPILogEvent): void {
  const logEntry = {
    ...event,
    _type: 'capi_event', // For log filtering
  };
  
  if (event.status === 'failure') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Create a wrapper that times and logs CAPI calls
 */
export async function withCAPIMonitoring<T>(
  provider: CAPIProvider,
  eventType: string,
  metadata: {
    userId?: string;
    transactionId?: string;
    eventId?: string;
  },
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    
    logCAPIEvent({
      timestamp: new Date().toISOString(),
      provider,
      event_type: eventType,
      status: 'success',
      user_id: metadata.userId,
      transaction_id: metadata.transactionId,
      event_id: metadata.eventId,
      duration_ms: Date.now() - startTime,
    });
    
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    logCAPIEvent({
      timestamp: new Date().toISOString(),
      provider,
      event_type: eventType,
      status: 'failure',
      user_id: metadata.userId,
      transaction_id: metadata.transactionId,
      event_id: metadata.eventId,
      duration_ms: Date.now() - startTime,
      error: err.message,
    });
    
    throw error;
  }
}

/**
 * Log aggregated CAPI metrics (call periodically or on request)
 */
export function logCAPIMetricsSummary(metrics: {
  meta_success: number;
  meta_failure: number;
  pinterest_success: number;
  pinterest_failure: number;
  ga4_success: number;
  ga4_failure: number;
  period_minutes: number;
}): void {
  console.log(JSON.stringify({
    _type: 'capi_metrics_summary',
    timestamp: new Date().toISOString(),
    ...metrics,
  }));
}
