import React from 'react';
import { useConsent } from '../../context/ConsentContext';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui';

export const ConsentBanner: React.FC = () => {
  const { isBannerOpen, acceptAll, rejectAll, setPreferencesOpen } = useConsent();

  if (!isBannerOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-500">
      <div className="mx-auto max-w-4xl bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
        
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
          <Button
            variant="ghost"
            onClick={() => setPreferencesOpen(true)}
            size="sm"
            className="text-gray-500 hover:text-primary underline decoration-2 decoration-transparent hover:decoration-primary underline-offset-4"
          >
            Customize
          </Button>
          
          <Button
            variant="outline"
            onClick={rejectAll}
            size="sm"
            className="border-2 border-ink hover:bg-ink hover:text-white"
          >
            Reject All
          </Button>

          <Button
            variant="primary"
            onClick={acceptAll}
            size="sm"
            className="shadow-md"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
};
