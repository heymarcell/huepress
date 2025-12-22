import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { createPortalSession } from "./stripe";

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



export function AuthButtons() {
  const { isSubscriber } = useSubscription();
  const { getToken } = useAuth();

  const handleManageSubscription = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      await createPortalSession(token);
    } catch (error) {
      console.error("Failed to open portal:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-ink/70 hover:text-primary font-medium transition-colors px-4">
            Member Login
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-sm">
            Join the Club
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        {isSubscriber && (
          <button 
            onClick={handleManageSubscription}
            className="text-sm font-medium text-ink/70 hover:text-primary mr-4 transition-colors"
          >
            Manage Subscription
          </button>
        )}
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
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
  return (
    <div className="text-center p-8 bg-accent rounded-xl">
      <h3 className="font-serif text-h3 text-ink mb-4">Unlock This Design</h3>
      <p className="text-gray-500 mb-6">
        Subscribe for $5/mo to download this and 500+ more designs.
      </p>
      <Link to="/pricing" className="btn-primary inline-block">
        View Pricing
      </Link>
    </div>
  );
}
