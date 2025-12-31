import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Printer, Unlock, Sparkles, Gift } from "lucide-react";
import { useSubscription } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { AlertModal } from "@/components/ui/AlertModal";
import { FreeSampleCapture } from "@/components/features/FreeSampleCapture";

interface ApiErrorResponse {
  error?: string;
}

interface DownloadSectionProps {
  assetId: string;
  formattedAssetId: string;
  title: string;
}



export function DownloadSection({ assetId, formattedAssetId, title }: DownloadSectionProps) {
  const { isSubscriber, isLoaded, isSignedIn } = useSubscription();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const downloadUrl = apiClient.assets.getDownloadUrl(assetId);
      
      const token = await getToken();
      const response = await fetch(downloadUrl, {
          headers: {
             "Authorization": `Bearer ${token}`
          }
      });
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch { /* ignore json parse error */ }
        const errorMsg = (errorData as ApiErrorResponse).error || "";

        // Handle Rate Limits (429) - Velocity
        if (response.status === 429) {
          setAlertState({
            isOpen: true,
            title: "Downloading too fast",
            message: errorMsg || "Please wait a few minutes before downloading more.",
            variant: "info"
          });
          return;
        }

        // Handle Forbidden (403) - Subscription or Daily Limit
        if (response.status === 403) {
          if (errorMsg.toLowerCase().includes("limit")) {
             setAlertState({
              isOpen: true,
              title: "Daily Limit Reached",
              message: errorMsg,
              variant: "info"
            });
          } else {
            setAlertState({
              isOpen: true,
              title: "Access Denied",
              message: "Subscription required to download. Join The Club to unlock!",
              variant: "info"
            });
          }
          return;
        }

        if (response.status === 401) {
           setAlertState({
            isOpen: true,
            title: "Access Denied",
            message: "Please log in to download.",
            variant: "info"
          });
          return;
        }

        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Generate clean filename: huepress-{slug}-{formattedAssetId}.pdf
      const cleanSlug = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
      a.download = `huepress-${cleanSlug}-${formattedAssetId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      // Track successful download
      analytics.fileDownload(assetId, title);
      
      // Record activity in user history
      apiClient.user.recordActivity(assetId, 'download').catch(() => {});
      
      // Invalidate user history cache so dashboard updates
      queryClient.invalidateQueries({ queryKey: ['user', 'history'] });
    } catch (error) {
      console.error("Download error:", error);
      setAlertState({
        isOpen: true,
        title: "Download Failed",
        message: "We encountered an issue downloading your file. Please try again.",
        variant: "error"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const downloadUrl = apiClient.assets.getDownloadUrl(assetId);
      
      const token = await getToken();
      const response = await fetch(downloadUrl, {
          headers: {
             "Authorization": `Bearer ${token}`
          }
      });
      
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch { /* ignore json parse error */ }
        const errorMsg = (errorData as ApiErrorResponse).error || "";

        // Handle Rate Limits (429) - Velocity
        if (response.status === 429) {
          setAlertState({
            isOpen: true,
            title: "Downloading too fast",
            message: errorMsg || "Please wait a few minutes before downloading more.",
            variant: "info"
          });
          return;
        }

        // Handle Forbidden (403) - Subscription or Daily Limit
        if (response.status === 403) {
          if (errorMsg.toLowerCase().includes("limit")) {
            setAlertState({
              isOpen: true,
              title: "Daily Limit Reached",
              message: errorMsg,
              variant: "info"
            });
          } else {
            setAlertState({
              isOpen: true,
              title: "Access Denied",
              message: "Subscription required to print. Join The Club to unlock!",
              variant: "info"
            });
          }
          return;
        }
        
        if (response.status === 401) {
           setAlertState({
            isOpen: true,
            title: "Access Denied",
            message: "Please log in to print.",
            variant: "info"
          });
          return;
        }

        throw new Error("Print failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Detect touch devices (tablets, phones) - iframe printing doesn't work on them
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (isTouchDevice) {
        // On touch devices, open PDF in new tab for native print
        window.open(url, '_blank');
        setAlertState({
          isOpen: true,
          title: "PDF Opened",
          message: "Use your browser's print option to print the PDF.",
          variant: "info"
        });
      } else {
        // Desktop: use iframe print approach
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }, 60000);
        };
      }
      
      analytics.fileDownload(assetId, title);
      
      // Record activity in user history
      apiClient.user.recordActivity(assetId, 'print').catch(() => {});
      
      // Invalidate user history cache so dashboard updates
      queryClient.invalidateQueries({ queryKey: ['user', 'history'] });
    } catch (error) {
      console.error("Print error:", error);
      setAlertState({
        isOpen: true,
        title: "Print Failed",
        message: "We encountered an issue printing your file. Please try again.",
        variant: "error"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isLoaded) {
    return <div className="h-14 skeleton rounded-xl w-full bg-gray-100 animate-pulse" />;
  }

  // Subscriber: Show download button (print hidden on mobile)
  if (isSubscriber) {
    return (
      <div className="flex gap-3">
        <Button 
          variant="primary" 
          size="lg" 
          className="flex-1" 
          onClick={handleDownload}
          isLoading={isDownloading}
        >
          <Download className="w-5 h-5" />
          Download
        </Button>
        {/* Hide print on mobile - doesn't work correctly (prints page not PDF) */}
        <Button 
          variant="outline" 
          size="lg" 
          className="hidden sm:flex flex-1" 
          onClick={handlePrint}
          isLoading={isPrinting}
        >
          <Printer className="w-5 h-5" />
          Print
        </Button>
      </div>
    );
  }

  // Non-subscriber: Show unlock + free sample options
  return (
    <div className="space-y-4">
      {/* Primary CTA - Unlock */}
      <Link to="/pricing" className="block">
        <Button variant="primary" size="lg" className="w-full shadow-md">
          <Unlock className="w-5 h-5" />
          Join to download
        </Button>
      </Link>
      
      {/* Value Prop */}
      <div className="flex items-center justify-center gap-1.5 mt-2 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-medium text-ink">Instant access to 500+ therapy-grade designs</span>
      </div>
      
      {/* Social Proof - NEW */}
      <div className="flex items-center justify-center gap-2 mb-4">
         <div className="flex -space-x-2">
            {[
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&fit=crop",
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&q=80&fit=crop",
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&fit=crop",
              "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=64&h=64&q=80&fit=crop"
            ].map((src, i) => (
               <img key={i} src={src} alt="User" className="w-6 h-6 rounded-full border-2 border-white object-cover" />
            ))}
         </div>
         <span className="text-xs text-gray-500 font-medium ml-1">Trusted by 1,000+ parents & therapists</span>
      </div>

      <p className="text-center text-xs text-gray-400">
        $5/mo, cancel anytime
      </p>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-white text-gray-400">or</span>
        </div>
      </div>

      {/* Secondary CTA - Free Sample */}
      {!showEmailCapture ? (
        <button
          onClick={() => setShowEmailCapture(true)}
          className="w-full py-3 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm rounded-md transition-colors text-sm font-bold flex items-center justify-center gap-2"
        >
          <Gift className="w-4 h-4" />
          Get 3 Free Pages
        </button>
      ) : (
        <div className="pt-2">
           <FreeSampleCapture source="free_sample_pdp" />
           <p className="text-[10px] text-gray-400 text-center mt-2">
             Watermarked samples. No spam, unsubscribe anytime.
           </p>
        </div>
      )}

      {/* Login link */}
      {!isSignedIn && (
        <p className="text-center text-sm text-gray-500">
          Already a member? <Link to="/pricing" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      )}

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
