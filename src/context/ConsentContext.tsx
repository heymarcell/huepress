/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConsentState, initAnalytics, updateGoogleConsent } from '../lib/privacy/analytics';
import { loadGTMWhenIdle } from '../lib/privacy/gtm';

interface ConsentContextType {
  consent: ConsentState;
  updateConsent: (updates: Partial<ConsentState>) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  isBannerOpen: boolean;
  setBannerOpen: (isOpen: boolean) => void;
  isPreferencesOpen: boolean;
  setPreferencesOpen: (isOpen: boolean) => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

const STORAGE_KEY = 'huepress-consent-v1';

const DEFAULT_STATE: ConsentState = {
  necessary: true,
  analytics: true, // Pre-checked for UI (tags still blocked by default until explicit update)
  marketing: true, // Pre-checked for UI
  region: 'Unknown',
};

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_STATE);
  const [isBannerOpen, setBannerOpen] = useState(false);
  const [isPreferencesOpen, setPreferencesOpen] = useState(false);

  // Initialize
  useEffect(() => {
    initAnalytics();

    const stored = localStorage.getItem(STORAGE_KEY);
    
    // Check Global Privacy Control
    // @ts-expect-error: Navigator properties implementation varies by browser
    const gpcSignal = navigator.globalPrivacyControl;
    const isGpcEnabled = gpcSignal === true || gpcSignal === 1;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If GPC is on, force marketing off even if stored as true (privacy first)
        if (isGpcEnabled) {
          parsed.marketing = false;
        }
        setConsent(parsed);
        updateGoogleConsent(parsed);
      } catch (e) {
        console.error('Failed to parse consent', e);
      }
    } else {
      // No stored consent - defer geo check to avoid blocking render
      // Use requestIdleCallback for best performance, with setTimeout fallback
      const runGeoCheck = () => {
        const API_URL = import.meta.env.VITE_API_URL || "https://api.huepress.co";
        performance.mark('geo-fetch-start');
        
        fetch(`${API_URL}/api/geo?t=${Date.now()}`)
          .then(res => res.json() as Promise<{ country?: string }>)
          .then((data) => {
            performance.mark('geo-fetch-end');
            performance.measure('geo-fetch', 'geo-fetch-start', 'geo-fetch-end');
            const geoTime = performance.getEntriesByName('geo-fetch')[0]?.duration;
            if (geoTime && geoTime > 1000) {
              console.warn(`[Perf] Geo API took ${geoTime.toFixed(0)}ms`);
            }
            
            const country = data.country || 'US';
            const EEA_COUNTRIES = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH'];
            
            if (EEA_COUNTRIES.includes(country)) {
              // EEA User: Show Banner
              setBannerOpen(true);
              setConsent(prev => ({ ...prev, region: 'EEA' }));
            } else {
              // US/Other: Auto-grant consent (opt-out model)
              const autoGrant: ConsentState = {
                  necessary: true,
                  analytics: true,
                  marketing: true,
                  region: 'US'
              };
              if (!isGpcEnabled) {
                  setConsent(autoGrant);
                  updateGoogleConsent(autoGrant);
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(autoGrant));
              } else {
                   // GPC is on, grant analytics but deny marketing
                   const gpcGrant = { ...autoGrant, marketing: false };
                   setConsent(gpcGrant);
                   updateGoogleConsent(gpcGrant);
                   localStorage.setItem(STORAGE_KEY, JSON.stringify(gpcGrant));
              }
            }
          })
          .catch(() => {
             // Fallback: Show banner to be safe
             setBannerOpen(true);
          });
      };

      // Defer geo check - don't block initial paint
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
          .requestIdleCallback(runGeoCheck, { timeout: 2000 });
      } else {
        // Fallback for Safari
        setTimeout(runGeoCheck, 100);
      }

      // If GPC is active, we must UNCHECK marketing by default logic
      if (isGpcEnabled) {
        setConsent(prev => ({ ...prev, marketing: false }));
      }
    }
  }, []);

  // Load GTM only after consent is granted (moved from index.html for better LCP)
  useEffect(() => {
    if (consent.analytics || consent.marketing) {
      loadGTMWhenIdle('GTM-K9KM3953');
    }
  }, [consent.analytics, consent.marketing]);

  const saveConsent = (newState: ConsentState) => {
    setConsent(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    updateGoogleConsent(newState);
    setBannerOpen(false); // Close banner on save
  };

  const updateConsent = (updates: Partial<ConsentState>) => {
    // Prevent disabling necessary
    const newState = { ...consent, ...updates, necessary: true };
    saveConsent(newState);
  };

  const acceptAll = () => {
    // If GPC is on, we should arguably NOT enable marketing automatically or warn.
    // However, "Accept All" is an explicit user override.
    // For safety, let's respect GPC *intent* but allow explicit override if the user clicks "Accept All".
    // Alternatively, strictly adhering to GPC would mean "Accept all allowed".
    // Let's implement full accept for "Accept All" as it is an explicit opt-in action.
    
    const newState: ConsentState = {
      ...consent,
      analytics: true,
      marketing: true,
    };
    saveConsent(newState);
  };

  const rejectAll = () => {
    const newState: ConsentState = {
      ...consent,
      analytics: false,
      marketing: false,
    };
    saveConsent(newState);
  };

  return (
    <ConsentContext.Provider
      value={{
        consent,
        updateConsent,
        acceptAll,
        rejectAll,
        isBannerOpen,
        setBannerOpen,
        isPreferencesOpen,
        setPreferencesOpen,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
};

// Guard component for wrapping marketing pixels
export const ConsentGuard: React.FC<{
  category: keyof ConsentState;
  children: React.ReactNode;
}> = ({ category, children }) => {
  const { consent } = useConsent();
  
  if (category === 'necessary') return <>{children}</>;
  
  // If consent is granted, render
  if (consent[category]) {
    return <>{children}</>;
  }

  return null;
};
