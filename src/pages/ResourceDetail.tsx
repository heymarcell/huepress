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
  Gift,
  Unlock,
  ImageIcon,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight
} from "lucide-react";
import SEO from "@/components/SEO";
import { apiClient } from "@/lib/api-client";
import { StructuredData } from "@/components/StructuredData";
import { analytics } from "@/lib/analytics";
import { FreeSampleCapture } from "@/components/features/FreeSampleCapture";
import { ReviewForm } from "@/components/features/ReviewForm";
import { ReviewList } from "@/components/features/ReviewList";
import { AboutDesign } from "@/components/features/AboutDesign";
import { LikeButton } from "@/components/features/LikeButton";

// Mock asset removed - fetching from API now



// Trust badges with Lucide icons
const trustBadges = [
  { icon: FileText, label: "Vector PDF" },
  { icon: Printer, label: "A4 + US Letter" },
  { icon: PenTool, label: "Bold Lines" },
  { icon: Sparkles, label: "No Watermark" },
];

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Compact rating display for header
function RatingSummary({ assetId }: { assetId: string }) {
  const [rating, setRating] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });
  
  useEffect(() => {
    fetch(`${API_URL}/api/reviews/${assetId}`)
      .then(res => res.json() as Promise<{ averageRating: number | null; totalReviews: number }>)
      .then(data => {
        setRating({ avg: data.averageRating, count: data.totalReviews });
      })
      .catch(() => {});
  }, [assetId]);
  
  if (!rating.count) return null;
  
  return (
    <div className="flex items-center gap-1.5">
      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      <span className="font-medium text-ink">{rating.avg?.toFixed(1)}</span>
      <span className="text-gray-400">({rating.count})</span>
    </div>
  );
}

// Reviews section component
function ReviewsSection({ assetId }: { assetId: string }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { isSubscriber } = useSubscription();

  const handleReviewSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 lg:p-8 hover:bg-gray-50 transition-colors"
      >
        <h2 className="font-serif text-h3 text-ink">Reviews</h2>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="px-6 lg:px-8 pb-8 animate-in slide-in-from-top-2 duration-200">
          {/* Review List */}
          <ReviewList assetId={assetId} refreshTrigger={refreshTrigger} />
          
          {/* Review Form (subscribers only) */}
          {isSubscriber && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <ReviewForm assetId={assetId} onReviewSubmitted={handleReviewSubmitted} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DownloadSection({ assetId, formattedAssetId, title }: { assetId: string; formattedAssetId: string; title: string }) {
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
      
      // Record activity in user history
      apiClient.user.recordActivity(assetId, 'print').catch(() => {});
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
              "https://images.unsplash.com/photo-1521119989659-a83eee488058?w=64&h=64&q=80&fit=crop"
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

export default function ResourceDetailPage() {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [relatedItems, setRelatedItems] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const { isSubscriber, isSignedIn } = useSubscription();

  const [reviewStats, setReviewStats] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        let lookupId = id;
        
        // Handle SEO slug: cozy-capybara-HP-ANM-0001 OR cozy-capybara-00001
        if (!lookupId && slug) {
            // Match legacy HP-ANM-0001 or new 00001 at end of string
            const match = slug.match(/((?:HP-[A-Z]{3}-)?\d{4,5})$/);
            lookupId = match ? match[1] : slug;
        }

        if (!lookupId) {
            setError("Asset not found");
            return;
        }

        const data = await apiClient.assets.get(lookupId);
        setAsset(data);

        // Check availability of like status
        if (isSignedIn && data.id) {
           apiClient.user.getLikes()
             .then(res => {
                const liked = res.likes?.some(l => l.id === data.id);
                setIsLiked(!!liked);
             })
             .catch(() => {});
        }

        // Fetch related items - prioritize tags for visual similarity (e.g. "robot" > "animals")
        if (data.tags && data.tags.length > 0) {
            try {
              // Try to find items with the first tag (usually specific like "robot" or "cat")
              const related = await apiClient.assets.list({ tag: data.tags[0], limit: 4 });
              let filtered = related.assets?.filter(a => a.id !== data.id) || [];
              
              // Fallback to category if not enough tag matches
              if (filtered.length < 3 && data.category) {
                 const catRelated = await apiClient.assets.list({ category: data.category, limit: 4 });
                 const catFiltered = catRelated.assets?.filter(a => a.id !== data.id && !filtered.find(f => f.id === a.id)) || [];
                 filtered = [...filtered, ...catFiltered];
              }
              
              setRelatedItems(filtered.slice(0, 4));
            } catch(e) {
               console.error("Failed to load related items by tag", e);
            }
        } else if (data.category) {
           try {
             const related = await apiClient.assets.list({ category: data.category, limit: 4 });
             setRelatedItems(related.assets?.filter(a => a.id !== data.id).slice(0, 4) || []);
           } catch(e) {
             console.error("Failed to load related items", e);
           }
        }

        // Fetch review stats for SEO
        try {
           const res = await fetch(`${API_URL}/api/reviews/${data.id}`);
           const reviewData = await res.json() as { averageRating: number; totalReviews: number };
           setReviewStats({ avg: reviewData.averageRating, count: reviewData.totalReviews });
        } catch (e) {
           console.error("Failed to load review stats", e);
        }

      } catch (err) {
        console.error(err);
        setError("Failed to load asset");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [id, slug, isSignedIn]);

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

  // Calculate validity date (1 year from now)
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

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
            brand: {
              "@type": "Brand",
              "name": "HuePress"
            },
            ...(reviewStats.count > 0 && {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: reviewStats.avg,
                reviewCount: reviewStats.count
              }
            }),
            offers: {
              "@type": "Offer",
              "price": "5.00",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock",
              "priceValidUntil": priceValidUntil.toISOString().split('T')[0],
              "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingRate": {
                  "@type": "MonetaryAmount",
                  "value": 0,
                  "currency": "USD"
                },
                "shippingDestination": {
                  "@type": "DefinedRegion",
                  "addressCountry": "US"
                }
              },
              "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted"
              }
            }
          }}
        />
      )}

      {/* Hero Section */}
      <div className="pt-24 lg:pt-32 pb-8">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto mb-6">
             {/* Breadcrumbs */}
             <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <Link to="/vault" className="hover:text-primary transition-colors">Library</Link>
                {asset.category && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <Link to={`/vault?category=${asset.category}`} className="hover:text-primary transition-colors capitalize">{asset.category}</Link>
                  </>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-gray-900 font-medium truncate max-w-[200px]">{asset.title}</span>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 max-w-7xl mx-auto">
            
            {/* Left Column: Product Image */}
            <div className="w-full lg:w-1/2">
               <div className="sticky top-32">
                 <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 group">
                   {/* 1:1 container - clips bottom banner using clip-path */}
                   <div className="aspect-square w-full bg-slate-50 overflow-hidden flex items-center justify-center p-8 lg:p-12 relative">
                     {/* Paper Texture overlay effect could go here */}
                     {asset.image_url && !asset.image_url.includes("__draft__") && !imageError ? (
                       <img 
                         src={asset.image_url} 
                         alt={asset.title}
                         className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500 select-none drop-shadow-xl"
                         style={{ clipPath: 'inset(0 0 8% 0)', transform: 'translateY(4%)' }}
                         onError={() => setImageError(true)}
                         onContextMenu={(e) => e.preventDefault()}
                         onDragStart={(e) => e.preventDefault()}
                         draggable={false}
                       />
                     ) : (
                       <div className="flex flex-col items-center justify-center">
                         <ImageIcon className="w-20 h-20 text-gray-300" strokeWidth={1} />
                         <span className="text-sm text-gray-400 mt-3">Preview not available</span>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
            </div>

            {/* Right Column: Key Details & CTA */}
            <div className="w-full lg:w-1/2 lg:py-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                 <Link to={`/vault?category=${asset.category}`} className="px-3 py-1 bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider rounded-full hover:bg-primary/10 transition-colors">
                   {asset.category}
                 </Link>
                 <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-full">
                   {asset.skill} Level
                 </span>
              </div>

              <h1 className="font-serif text-3xl lg:text-4xl text-ink mb-2 leading-tight flex items-center gap-3">
                {asset.title}
                <LikeButton assetId={asset.id} initialLiked={isLiked} variant="icon" className="shadow-sm border border-gray-100" />
              </h1>

              {/* Asset ID and Rating */}
              <div className="flex items-center gap-3 mb-4 text-sm">
                <span className="text-gray-400">#{asset.asset_id}</span>
                <RatingSummary assetId={assetId} />
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">
                {asset.description}
              </p>

              {/* Download/Unlock Section */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 mb-6">
                <DownloadSection assetId={assetId} formattedAssetId={asset.asset_id as string} title={asset.title} />
              </div>

              {/* Value Props / Trust Badges */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {trustBadges.map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center text-primary flex-shrink-0">
                      <badge.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-gray-600">{badge.label}</span>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {asset.tags && asset.tags.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    {asset.tags.map((tag: string, idx: number) => (
                      <Link 
                        key={idx}
                        to={`/vault?tag=${encodeURIComponent(tag)}`}
                        className="px-3 py-1.5 bg-gray-50 text-gray-500 text-xs rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Right Column Card */}
            {isSubscriber && (
                // Subscriber View: "Request a Design" or Value Reinforcement
                <div className="mt-8 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-serif text-lg text-ink mb-1">Premium Member</h4>
                        <p className="text-sm text-gray-600 mb-3">
                           Enjoying this design? As a member, you get priority access to new releases every week.
                        </p>
                        <Link to="/request-design" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 group">
                           Request a Design <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Content Section - Only show if there's actual content */}
      {(asset.extended_description || asset.fun_facts?.length || asset.suggested_activities?.length || asset.coloring_tips || asset.therapeutic_benefits) && (
        <div className="py-8 bg-white border-t border-gray-100">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <AboutDesign
                extendedDescription={asset.extended_description}
                funFacts={asset.fun_facts}
                suggestedActivities={asset.suggested_activities}
                coloringTips={asset.coloring_tips}
                therapeuticBenefits={asset.therapeutic_benefits}
                category={asset.category}
                skill={asset.skill}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reviews - Compact inline */}
      <div className="py-8 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <ReviewsSection assetId={assetId} />
          </div>
        </div>
      </div>

      {/* Related Items Section - Compact */}
      <div className="py-10 bg-white border-t border-gray-200">
        <div className="container mx-auto px-6">
           <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl text-ink">You might also like</h2>
                <Link to="/vault" className="text-primary text-sm font-medium hover:text-primary-dark transition-colors">
                  View all →
                </Link>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedItems.map((item) => (
                  <Link key={item.id} to={item.asset_id && item.slug ? `/coloring-pages/${item.slug}-${item.asset_id}` : `/vault/${item.id}`} className="group">
                    <div className="bg-gray-50 rounded-lg hover:shadow-md transition-all overflow-hidden">
                      <div className="aspect-square bg-white p-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <h4 className="text-xs font-semibold text-gray-800 group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
