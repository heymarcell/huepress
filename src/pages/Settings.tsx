import { useUser, useClerk } from "@clerk/clerk-react";
import { useSubscription } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { createPortalSession } from "@/lib/stripe";
import { useState } from "react";
import { AlertModal } from "@/components/ui/AlertModal";
import { Loader2, CreditCard, LogOut, User, Mail } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function Settings() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { isSubscriber } = useSubscription();
  
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const token = await window.Clerk?.session?.getToken();
      if (!token) return;
      await createPortalSession(token);
    } catch (error) {
      console.error("Failed to open portal:", error);
      setAlertState({
        isOpen: true,
        title: "Portal Error",
        message: "Something went wrong loading the customer portal. Please try again.",
        variant: "error"
      });
    } finally {
      setLoadingPortal(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-serif text-ink font-medium">Account Settings</h1>

        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Profile
          </h2>
          
          <div className="flex items-center gap-4 mb-6">
            <img 
              src={user.imageUrl} 
              alt={user.fullName || "User"} 
              className="w-16 h-16 rounded-full border border-gray-100"
            />
            <div>
              <p className="font-bold text-lg text-ink">{user.fullName}</p>
              <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                <Mail className="w-3.5 h-3.5" />
                {user.primaryEmailAddress?.emailAddress}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-medium text-ink mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" />
            Subscription
          </h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <p className="font-medium text-ink">
                {isSubscriber ? "Active Membership" : "Free Account"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isSubscriber 
                  ? "You have full access to all designs and features." 
                  : "Upgrade to unlock all 500+ designs and features."}
              </p>
            </div>
            
            {isSubscriber ? (
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="shrink-0"
              >
                {loadingPortal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Manage Subscription"
                )}
              </Button>
            ) : (
               <Button onClick={() => window.location.href = '/pricing'}>
                 Upgrade Now
               </Button>
            )}
          </div>
          
          {isSubscriber && (
            <p className="text-xs text-gray-400 mt-3">
              Manage your billing information, invoices, and cancellation via our secure Stripe customer portal.
            </p>
          )}
        </div>

        {/* Sign Out */}
        <div className="flex justify-end">
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <AlertModal 
          isOpen={alertState.isOpen}
          onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
          title={alertState.title}
          message={alertState.message}
          variant={alertState.variant}
        />
      </div>
    </div>
  );
}
