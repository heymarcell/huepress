/**
 * Analytics utility for HuePress
 * Integrates with Google Tag Manager via dataLayer
 * Also supports Cloudflare Web Analytics (loaded via script tag)
 */

// Push event to GTM dataLayer
function pushToDataLayer(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...params,
  });

  // Log in development
  if (import.meta.env.DEV) {
    console.log('[Analytics Event]', event, params);
  }
}

// Pre-defined event helpers matching GA4 recommended events
export const analytics = {
  // ===== LEAD GENERATION =====
  /** Track when user submits email for free sample */
  generateLead: (source: string = 'free_sample') => {
    pushToDataLayer('generate_lead', {
      lead_source: source,
      currency: 'USD',
      value: 0,
    });
  },

  // ===== SIGN-UP EVENTS =====
  /** Track when user creates an account */
  signUp: (method: string = 'email') => {
    pushToDataLayer('sign_up', { method });
  },

  /** Track when user logs in */
  login: (method: string = 'email') => {
    pushToDataLayer('login', { method });
  },

  // ===== E-COMMERCE / CHECKOUT =====
  /** Track when checkout flow begins */
  beginCheckout: (priceId: string, planName: string, value: number) => {
    pushToDataLayer('begin_checkout', {
      currency: 'USD',
      value,
      items: [{
        item_id: priceId,
        item_name: planName,
        price: value,
        quantity: 1,
      }],
    });
  },

  /** Track successful purchase (call from webhook or success page) */
  purchase: (transactionId: string, priceId: string, planName: string, value: number) => {
    pushToDataLayer('purchase', {
      transaction_id: transactionId,
      currency: 'USD',
      value,
      items: [{
        item_id: priceId,
        item_name: planName,
        price: value,
        quantity: 1,
      }],
    });
  },

  // ===== ENGAGEMENT / CONTENT =====
  /** Track when user downloads a file */
  fileDownload: (assetId: string, assetName: string) => {
    pushToDataLayer('file_download', {
      file_name: assetName,
      file_extension: 'pdf',
      link_url: `/vault/${assetId}`,
    });
  },

  /** Track when user views an asset detail page */
  viewItem: (assetId: string, assetName: string, category?: string) => {
    pushToDataLayer('view_item', {
      currency: 'USD',
      value: 0,
      items: [{
        item_id: assetId,
        item_name: assetName,
        item_category: category,
      }],
    });
  },

  /** Track search queries */
  search: (searchTerm: string) => {
    pushToDataLayer('search', { search_term: searchTerm });
  },

  /** Track filter usage */
  selectContent: (contentType: string, itemId: string) => {
    pushToDataLayer('select_content', {
      content_type: contentType,
      item_id: itemId,
    });
  },

  // ===== LEGACY ALIASES (for backward compatibility) =====
  checkoutStarted: (plan: string) => {
    const value = plan.includes('annual') ? 45 : 5;
    analytics.beginCheckout(plan, plan, value);
  },
  
  downloadClicked: (assetId: string) => {
    analytics.fileDownload(assetId, assetId);
  },

  freeSampleRequested: () => {
    analytics.generateLead('free_sample');
  },
};

export default analytics;
