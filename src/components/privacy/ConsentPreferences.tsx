import React from 'react';
import { useConsent } from '../../context/ConsentContext';
import { X, Check } from 'lucide-react';

export const ConsentPreferences: React.FC = () => {
  const { 
    consent, 
    updateConsent, 
    isPreferencesOpen, 
    setPreferencesOpen, 
    acceptAll, 
    rejectAll 
  } = useConsent();

  if (!isPreferencesOpen) return null;

  // @ts-expect-error: Navigator properties implementation varies by browser
  const isGpcEnabled = navigator.globalPrivacyControl === true || navigator.globalPrivacyControl === 1;

  const handleSave = () => {
    setPreferencesOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-paper rounded-card shadow-pop border-2 border-ink overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
          <h2 className="font-serif font-bold text-h2 text-ink">
            Privacy Preferences
          </h2>
          <button 
            onClick={() => setPreferencesOpen(false)}
            className="p-2 text-gray-400 hover:text-ink hover:bg-gray-50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          <p className="font-sans text-body text-gray-500">
            Customize your privacy preferences. We use cookies to ensure basic functionality and, with your consent, to analyze site usage and show personalized advertising.
          </p>

          {/* Necessary */}
          <div className="flex items-start justify-between group">
            <div className="flex-1 pr-6">
              <h3 className="font-serif font-bold text-h3 text-ink mb-2">Strictly Necessary</h3>
              <p className="font-sans text-small text-gray-500">
                Required for the website to function (e.g., login, cart, consent flow). These cannot be disabled.
              </p>
            </div>
            <div className="relative flex items-center shrink-0">
               <div className="w-12 h-7 bg-gray-200 rounded-full flex items-center px-1 opacity-50 cursor-not-allowed">
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm"></div>
               </div>
            </div>
          </div>

          {/* Analytics */}
          <div className="flex items-start justify-between group">
            <div className="flex-1 pr-6">
              <h3 className="font-serif font-bold text-h3 text-ink mb-2">Analytics & Performance</h3>
              <p className="font-sans text-small text-gray-500">
                Helps us understand how you use the site so we can improve it. Data is aggregated and anonymous.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={consent.analytics}
                onChange={(e) => updateConsent({ analytics: e.target.checked })}
              />
              <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary hover:bg-gray-300 peer-checked:hover:bg-primary-hover transition-colors"></div>
            </label>
          </div>

          {/* Marketing */}
          <div className="flex items-start justify-between group">
            <div className="flex-1 pr-6">
              <h3 className="font-serif font-bold text-h3 text-ink mb-2">Marketing & Targeting</h3>
              <div className="space-y-3">
                <p className="font-sans text-small text-gray-500">Used to show you relevant ads on other platforms (like Pinterest or Meta).</p>
                {isGpcEnabled && (
                  <div className="flex items-start gap-2 text-secondary text-xs font-bold bg-secondary/10 p-3 rounded-md border border-secondary/20">
                     <Check size={14} className="mt-0.5" />
                    <span>Global Privacy Control (GPC) signal detected. Marketing is disabled by default.</span>
                  </div>
                )}
              </div>
            </div>
            <label className={`relative inline-flex items-center cursor-pointer shrink-0 ${isGpcEnabled ? 'opacity-75' : ''}`}>
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={consent.marketing}
                onChange={(e) => updateConsent({ marketing: e.target.checked })}
              />
              <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary hover:bg-gray-300 peer-checked:hover:bg-primary-hover transition-colors"></div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex gap-4 w-full sm:w-auto justify-center sm:justify-start">
                 <button
                    onClick={rejectAll}
                    className="text-small font-bold text-gray-400 hover:text-ink transition-colors"
                >
                    Reject All
                </button>
                 <button
                    onClick={acceptAll}
                    className="text-small font-bold text-gray-400 hover:text-primary transition-colors"
                >
                    Accept All
                </button>
            </div>
          
          <button
            onClick={handleSave}
            className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-md font-bold text-button hover:bg-primary-hover transition-all duration-200 shadow-[2px_2px_0px_0px_#111827] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95 text-center"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
