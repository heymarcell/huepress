import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Asset } from "@/api/types";
import { Button } from "@/components/ui";
import { AlertModal } from "@/components/ui/AlertModal";
import { useSubscription } from "@/lib/auth";
import { useAuth } from "@clerk/clerk-react";
import { 
  FileText, 
  Printer, 
  PenTool, 
  Sparkles,
  Star,
  Download,
  Unlock,
  ImageIcon
} from "lucide-react";
import SEO from "@/components/SEO";
import { apiClient } from "@/lib/api-client";
import { StructuredData } from "@/components/StructuredData";
import { analytics } from "@/lib/analytics";
import { FreeSampleCapture } from "@/components/features/FreeSampleCapture";
import { ReviewForm } from "@/components/features/ReviewForm";
import { ReviewList } from "@/components/features/ReviewList";
import { AboutDesign } from "@/components/features/AboutDesign";

// Mock asset removed - fetching from API now



// Trust badges with Lucide icons
const trustBadges = [
  { icon: FileText, label: "Vector PDF" },
  { icon: Printer, label: "A4 + US Letter" },
  { icon: PenTool, label: "Bold Lines" },
  { icon: Sparkles, label: "No Watermark" },
];

// Reviews section component
function ReviewsSection({ assetId }: { assetId: string }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isSubscriber } = useSubscription();

  const handleReviewSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 mt-6">
      <h3 className="font-serif text-h3 text-ink mb-4">Reviews</h3>
      
      {/* Review List */}
      <ReviewList assetId={assetId} refreshTrigger={refreshTrigger} />
      
      {/* Review Form (subscribers only) */}
      {isSubscriber && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <ReviewForm assetId={assetId} onReviewSubmitted={handleReviewSubmitted} />
        </div>
      )}
    </div>
  );
}

function DownloadSection({ assetId, title }: { assetId: string; title: string }) {
  const { isSubscriber, isLoaded, isSignedIn } = useSubscription();
  const { getToken } = useAuth();
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });

  const handleDownload = async () => {
    try {
      const downloadUrl = apiClient.assets.getDownloadUrl(assetId);
      
      const token = await getToken();
      const response = await fetch(downloadUrl, {
          headers: {
             "Authorization": `Bearer ${token}`
          }
      });
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          setAlertState({
            isOpen: true,
            title: "Access Denied",
            message: "Subscription required to download. Join The Club to unlock!",
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
      a.download = `${title}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      // Track successful download
      analytics.fileDownload(assetId, title);
    } catch (error) {
      console.error("Download error:", error);
      setAlertState({
        isOpen: true,
        title: "Download Failed",
        message: "We encountered an issue downloading your file. Please try again.",
        variant: "error"
      });
    }
  };

  const handlePrint = async () => {
    try {
      const downloadUrl = apiClient.assets.getDownloadUrl(assetId);
      
      const token = await getToken();
      const response = await fetch(downloadUrl, {
          headers: {
             "Authorization": `Bearer ${token}`
          }
      });
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          setAlertState({
            isOpen: true,
            title: "Access Denied",
            message: "Subscription required to print. Join The Club to unlock!",
            variant: "info"
          });
          return;
        }
        throw new Error("Print failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
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
      
      analytics.fileDownload(assetId, title);
    } catch (error) {
      console.error("Print error:", error);
      setAlertState({
        isOpen: true,
        title: "Print Failed",
        message: "We encountered an issue printing your file. Please try again.",
        variant: "error"
      });
    }
  };

  if (!isLoaded) {
    return <div className="h-14 skeleton rounded-xl w-full" />;
  }

  // Subscriber: Show download button
  if (isSubscriber) {
    return (
      <div className="flex gap-3">
        <Button variant="primary" size="lg" className="flex-1" onClick={handleDownload}>
          <Download className="w-5 h-5" />
          Download
        </Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={handlePrint}>
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
      
      {/* Social Proof */}
      <div className="flex items-center justify-center gap-1.5 mt-2 mb-1">
        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
        <span className="text-sm font-medium text-ink">4.9/5 from 500+ families</span>
      </div>
      
      {/* 3-Step Reassurance Micro-row */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500 font-medium text-center">
         <span className="flex items-center">Join</span>
         <span className="text-gray-300">→</span>
         <span className="flex items-center">Download</span>
         <span className="text-gray-300">→</span>
         <span className="flex items-center">Print & Color</span>
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
          className="w-full py-3 px-4 border-2 border-dashed border-gray-200 rounded-md text-gray-500 hover:border-primary hover:text-primary transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
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

export default function ResourceDetailPage() {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [relatedItems, setRelatedItems] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        let lookupId = id;
        
        // Handle SEO slug: cozy-capybara-HP-ANM-0001 -> HP-ANM-0001
        if (!lookupId && slug) {
            const match = slug.match(/(HP-[A-Z]{3}-\d{4})$/);
            lookupId = match ? match[1] : slug;
        }

        if (!lookupId) {
            setError("Asset not found");
            return;
        }

        const data = await apiClient.assets.get(lookupId);
        setAsset(data);

        // Fetch related items
        if (data.category) {
           try {
             const related = await apiClient.assets.list({ category: data.category, limit: 4 });
             setRelatedItems(related.assets?.filter(a => a.id !== data.id).slice(0, 3) || []);
           } catch(e) {
             console.error("Failed to load related items", e);
           }
        }

      } catch (err) {
        console.error(err);
        setError("Failed to load asset");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [id, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 pb-16 flex justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-500">Loading design...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 pb-16 text-center px-6">
        <div className="max-w-md mx-auto text-center">
          <img src="/404-robot.svg" alt="Robot not found" className="w-48 h-48 mx-auto mb-6" />
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-4">{error || "Design Not Found"}</h1>
          <p className="text-gray-600 mb-8">We couldn't find the coloring page you're looking for. It may have been moved or removed.</p>
          <Link to="/vault">
            <Button variant="primary" size="lg">Browse The Vault</Button>
          </Link>
        </div>
      </div>
    );
  }

  // SEO Canonical URL
  const canonicalUrl = `https://huepress.co/coloring-pages/${asset.slug || "design"}-${asset.asset_id || asset.id}`;
  
  // Use fetched asset ID for components
  const assetId = asset.id;

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title={`${asset.title} - Coloring Page | HuePress`}
        description={asset.description}
        image={asset.image_url}
        canonical={canonicalUrl}
        type="product"
        keywords={asset.meta_keywords}
      />
      
      {asset.asset_id && (
        <StructuredData 
          type="Product"
          data={{
            name: asset.title,
            description: asset.description,
            image: asset.image_url,
            sku: asset.asset_id,
            offers: {
              "@type": "Offer",
              "price": "5.00",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock"
            }
          }}
        />
      )}

      {/* Hero Section */}
      <div className="pt-24 lg:pt-32 pb-12 lg:pb-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start max-w-6xl mx-auto">
            
            {/* Left Column: Preview */}
            <div className="w-full lg:w-1/2">
               <div className="sticky top-32">
                 <div className="relative aspect-a4 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 group">
                   {asset.image_url && !asset.image_url.includes("__draft__") ? (
                     <img 
                       src={asset.image_url} 
                       alt={asset.title}
                       className="w-full h-full object-contain p-4 group-hover:scale-[1.02] transition-transform duration-500"
                     />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                       <ImageIcon className="w-20 h-20 text-gray-300" strokeWidth={1} />
                       <span className="text-sm text-gray-400 mt-3">Preview not available</span>
                     </div>
                   )}
                   
                   {/* Capture Overlay */}
                   <FreeSampleCapture source={`ResourceDetail:${assetId}`} />
                 </div>

                 {/* Trust Badges */}
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                   {trustBadges.map((badge, idx) => (
                     <div key={idx} className="flex flex-col items-center gap-2 text-center">
                       <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary">
                         <badge.icon className="w-5 h-5" />
                       </div>
                       <span className="text-xs font-medium text-gray-500">{badge.label}</span>
                     </div>
                   ))}
                 </div>
               </div>
            </div>

            {/* Right Column: Details */}
            <div className="w-full lg:w-1/2">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                 <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">
                   {asset.category}
                 </span>
                 <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-full">
                   {asset.skill} Level
                 </span>
              </div>

              <h1 className="font-serif text-4xl lg:text-5xl text-ink mb-6 leading-tight">
                {asset.title}
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {asset.description}
              </p>

              {/* Download/Unlock Section */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
                <DownloadSection assetId={assetId} title={asset.title} />
              </div>

              {/* Reviews Section */}
              <ReviewsSection assetId={assetId} />

              {/* About This Design - Rich Content Module */}
              <AboutDesign
                extendedDescription={asset.extended_description}
                funFacts={asset.fun_facts}
                suggestedActivities={asset.suggested_activities}
                coloringTips={asset.coloring_tips}
                therapeuticBenefits={asset.therapeutic_benefits}
                category={asset.category}
                skill={asset.skill}
              />

              {/* Related */}
              <div className="mt-8">
                <h3 className="font-serif text-h3 text-ink mb-4">You might also like</h3>
                <div className="grid grid-cols-3 gap-4">
                  {relatedItems.map((item) => (
                    <Link key={item.id} to={item.asset_id && item.slug ? `/coloring-pages/${item.slug}-${item.asset_id}` : `/vault/${item.id}`} className="group">
                      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="aspect-a4 bg-white p-3">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="object-contain w-full h-full" />
                          ) : (
                            <FileText className="w-8 h-8 text-gray-200 mx-auto" />
                          )}
                        </div>
                        <div className="px-5 pb-5">
                          <h4 className="text-xs font-medium text-ink group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
