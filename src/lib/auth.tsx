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
          <button className="text-gray-500 hover:text-ink font-medium transition-colors">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="btn-primary">
            Join the Club
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        {isSubscriber && (
          <button 
            onClick={handleManageSubscription}
            className="text-sm font-medium text-gray-500 hover:text-ink mr-2"
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
