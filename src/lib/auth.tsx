import { Link } from "react-router-dom";

// Simple mock auth for development without Clerk
export function useSubscription() {
  return { 
    isLoaded: true, 
    isSignedIn: false, 
    isSubscriber: false, 
    user: null 
  };
}

export function AuthButtons() {
  return (
    <div className="flex items-center gap-4">
      <Link 
        to="/pricing" 
        className="text-gray-500 hover:text-ink font-medium transition-colors"
      >
        Sign In
      </Link>
      <Link to="/pricing" className="btn-primary">
        Join the Club
      </Link>
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
