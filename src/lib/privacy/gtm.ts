// src/lib/privacy/gtm.ts
// Lazy GTM loader - now only used as fallback since GTM is in index.html

let gtmLoaded = false;

export function loadGTM(containerId: string): void {
  if (gtmLoaded) return;
  
  // Check if GTM is already loaded (from index.html)
  const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${containerId}"]`);
  if (existingScript) {
    gtmLoaded = true;
    return;
  }
  
  gtmLoaded = true;

  // Create and inject GTM script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
  document.head.appendChild(script);

  // Initialize dataLayer if not already done
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    "gtm.start": new Date().getTime(),
    event: "gtm.js",
  });
}

// Schedule GTM load after idle to protect LCP/INP
export function loadGTMWhenIdle(containerId: string): void {
  if (gtmLoaded) return;

  const run = () => loadGTM(containerId);

  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(run, { timeout: 2000 });
  } else {
    // Fallback for Safari
    setTimeout(run, 1500);
  }
}

// Note: dataLayer type is declared in analytics.ts, we just use it here
