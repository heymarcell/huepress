import React from 'react';
import { useConsent } from '../../context/ConsentContext';
import { Cookie } from 'lucide-react';

export const ConsentBanner: React.FC = () => {
  const { isBannerOpen, acceptAll, rejectAll, setPreferencesOpen } = useConsent();

  if (!isBannerOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-4xl bg-white/95 backdrop-blur-md rounded-card shadow-pop border-2 border-ink p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
        
        {/* Icon & Text */}
        <div className="flex-1 flex gap-4">
          <div className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Cookie size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
              <span className="md:hidden"><Cookie size={18} className="inline text-primary"/></span>
              Your Privacy Matters
            </h3>
            <p className="font-sans text-sm text-gray-500 leading-relaxed max-w-2xl">
              We use necessary cookies to make our site work. We'd also like to use analytics and marketing cookies to improve your experience and show you improved content.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto min-w-[280px] justify-end pt-2 md:pt-0">
          <button
            onClick={() => setPreferencesOpen(true)}
            className="px-3 py-1.5 text-sm font-bold text-gray-500 hover:text-primary transition-colors underline decoration-2 decoration-transparent hover:decoration-primary underline-offset-4"
          >
            Customize
          </button>
          
          <button
            onClick={rejectAll}
            className="px-4 py-2 rounded-md bg-white border-2 border-ink text-sm font-bold text-ink hover:bg-ink hover:text-white transition-all duration-200 active:scale-95"
          >
            Reject All
          </button>

          <button
            onClick={acceptAll}
            className="px-4 py-2 rounded-md bg-primary text-sm font-bold text-white hover:bg-primary-hover transition-all duration-200 shadow-[2px_2px_0px_0px_#111827] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};
