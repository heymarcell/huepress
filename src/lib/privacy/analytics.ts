export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  region: 'EEA' | 'US' | 'Unknown';
}

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize dataLayer and gtag
export const initAnalytics = () => {
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  window.gtag = window.gtag || gtag;

  // Set default consent to 'denied' (Strict Mode / Advanced Consent Mode)
  // This allows Google tags to load restricted signals for modeling but prevents cookie storage
  window.gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied',
    'wait_for_update': 500 // Allow 500ms for update signal before firing
  });

  // Ensure 'dataLayer' is defined before loading scripts
};

// Map internal categories to Google Consent Mode v2 keys
export const updateGoogleConsent = (state: ConsentState) => {
  if (!window.gtag) return;

  const consentMap = {
    'ad_storage': state.marketing ? 'granted' : 'denied',
    'ad_user_data': state.marketing ? 'granted' : 'denied',
    'ad_personalization': state.marketing ? 'granted' : 'denied',
    'analytics_storage': state.analytics ? 'granted' : 'denied',
  };

  window.gtag('consent', 'update', consentMap);
  
  // Also push a custom event for GTM triggers if needed
  window.dataLayer.push({
    event: 'consent_update',
    consent_state: state
  });
};
