/**
 * Analytics utility for HuePress
 * Uses Cloudflare Web Analytics (privacy-focused, no cookies)
 * 
 * To enable: Add your beacon token from Cloudflare dashboard
 * Dashboard > Analytics > Web Analytics > Add Site
 */

// Cloudflare Web Analytics beacon token (replace with real token in production)
const CF_BEACON_TOKEN = import.meta.env.VITE_CF_ANALYTICS_TOKEN || '';

// Initialize Cloudflare Web Analytics
export function initAnalytics() {
  if (!CF_BEACON_TOKEN || typeof window === 'undefined') return;
  
  // Cloudflare Web Analytics is loaded via script tag in index.html
  // This function is for any additional initialization if needed
  console.log('[Analytics] Initialized');
}

// Custom event tracking
interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// Track custom events (for future integration with Cloudflare Zaraz or other providers)
export function trackEvent({ action, category, label, value }: AnalyticsEvent) {
  // Log in development
  if (import.meta.env.DEV) {
    console.log('[Analytics Event]', { action, category, label, value });
  }
  
  // Send to analytics provider when configured
  // Cloudflare Web Analytics doesn't support custom events natively
  // You can integrate with Zaraz for advanced tracking
}

// Pre-defined event helpers
export const analytics = {
  // Page views (handled automatically by Cloudflare)
  
  // Conversion events
  signupStarted: () => trackEvent({ action: 'signup_started', category: 'conversion' }),
  signupCompleted: () => trackEvent({ action: 'signup_completed', category: 'conversion' }),
  checkoutStarted: (plan: string) => trackEvent({ action: 'checkout_started', category: 'conversion', label: plan }),
  subscriptionCreated: (plan: string) => trackEvent({ action: 'subscription_created', category: 'conversion', label: plan }),
  
  // Engagement events
  downloadClicked: (assetId: string) => trackEvent({ action: 'download_clicked', category: 'engagement', label: assetId }),
  freeSampleRequested: () => trackEvent({ action: 'free_sample_requested', category: 'engagement' }),
  searchPerformed: (query: string) => trackEvent({ action: 'search', category: 'engagement', label: query }),
  filterApplied: (filter: string) => trackEvent({ action: 'filter_applied', category: 'engagement', label: filter }),
  
  // Navigation events
  vaultViewed: () => trackEvent({ action: 'vault_viewed', category: 'navigation' }),
  pricingViewed: () => trackEvent({ action: 'pricing_viewed', category: 'navigation' }),
  assetViewed: (assetId: string) => trackEvent({ action: 'asset_viewed', category: 'navigation', label: assetId }),
};

export default analytics;
