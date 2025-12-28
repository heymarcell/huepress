import { useUser } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";

export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    // Render public UI while Clerk initializes - prevents blank screen LCP issue
    return <>{children}</>;
  }

  // If user is not signed in, they are free to browse public pages
  // Note: If the route *requires* auth (Protected), that should be handled by a separate valid auth check
  // This component's job is ONLY to enforce onboarding *if* they are signed in.
  if (!isSignedIn) {
    return <>{children}</>;
  }

  // Check metadata
  const metadata = user.unsafeMetadata;
  const isOnboardingComplete = metadata?.onboardingComplete === true;
  
  // If on onboarding page, don't redirect (infinite loop)
  if (location.pathname === "/onboarding") {
    // If they ARE complete, kick them out of onboarding
    if (isOnboardingComplete) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // If signed in but NOT complete, redirect to onboarding
  if (!isOnboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  // Signed in AND complete
  return <>{children}</>;
}
