/* eslint-disable react-refresh/only-export-components */
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { AlertModal } from "@/components/ui/AlertModal";
import { Button } from "@/components/ui";
import { analytics } from "@/lib/analytics";
import { useAssetCount } from "@/hooks/useAssetCount";

export function useSubscription() {
  const { user, isLoaded, isSignedIn } = useUser();
  // Check subscription status from public metadata (to be synced via webhooks)
  const status = user?.publicMetadata?.subscriptionStatus as string;
  const isSubscriber = status === "active" || status === "trialing";

  return { 
    isLoaded, 
    isSignedIn, 
    isSubscriber, 
    user 
  };
}



// ... imports
import { UserMenu } from "@/components/layout/UserMenu";

export function AuthButtons() {
   const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button 
            onClick={() => analytics.login('nav_button')}
            className="text-ink/70 hover:text-primary font-medium transition-colors px-4"
          >
            Member Login
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button 
            variant="primary" 
            size="sm" 
            className="font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-sm"
            onClick={() => analytics.selectContent('signup_modal', 'nav_button')}
          >
            Join for $5/mo
          </Button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserMenu />
      </SignedIn>

      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </div>
  );
}

export function SubscriptionGate({
  children: _children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  // In dev mode without auth, always show subscribe prompt
  return fallback || <SubscribePrompt />;
}

function SubscribePrompt() {
  const count = useAssetCount();
  return (
    <div className="text-center p-8 bg-accent rounded-xl">
      <h3 className="font-serif text-h3 text-ink mb-4">Unlock This Design</h3>
      <p className="text-center text-sm text-gray-500 mb-4">
        Subscribe for $5/mo to download this and {count} more designs.
      </p>
      <Link to="/pricing" className="btn-primary inline-block">
        View Pricing
      </Link>
    </div>
  );
}
