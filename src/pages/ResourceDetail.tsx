import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Asset } from "@/api/types";
import { Button, ResourceCard } from "@/components/ui";
import { useSubscription } from "@/lib/auth";

import { 
  ArrowRight,
  ChevronRight,
  Star,
  ImageIcon,
  FileText,
  Printer,
  PenTool,
  Sparkles
} from "lucide-react";
import SEO from "@/components/SEO";
import { apiClient } from "@/lib/api-client";
import { analytics } from "@/lib/analytics";
import { StructuredData } from "@/components/StructuredData";
import { AboutDesign } from "@/components/features/AboutDesign";
import { LikeButton } from "@/components/features/LikeButton";
import { ReviewsSection } from "@/components/features/ReviewsSection";
import { DownloadSection } from "@/components/features/resource/DownloadSection";

// Mock asset removed - fetching from API now



// Trust badges with Lucide icons
const trustBadges = [
  { icon: FileText, label: "Vector PDF" },
  { icon: Printer, label: "A4 + US Letter" },
  { icon: PenTool, label: "Bold Lines" },
  { icon: Sparkles, label: "No Watermark" },
];



export default function ResourceDetailPage() {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [relatedItems, setRelatedItems] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const { isSubscriber, isSignedIn } = useSubscription();

  const [reviewStats, setReviewStats] = useState<{ avg: number | null; count: number }>({ avg: null, count: 0 });
  const [schemaReviews, setSchemaReviews] = useState<Array<{ id: string; rating: number; comment?: string; user_email?: string }>>([]);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      setIsLoading(true);
      setError("");
      
      try {
        let lookupId = id;
        
        // Handle SEO slug
        if (!lookupId && slug) {
            const match = slug.match(/((?:HP-[A-Z]{3}-)?\d{4,5})$/);
            lookupId = match ? match[1] : slug;
        }

        if (!lookupId) {
            setError("Asset not found");
            setIsLoading(false);
            return;
        }

        // 1. Fetch Asset Details (Primary)
        const assetPromise = apiClient.assets.get(lookupId);
        
        // Await Asset first to ensure we have ID for subsequent calls & basic UI
        const data = await assetPromise;
        setAsset(data);
        setIsLoading(false); // Render main content immediately

        // 2. Parallel Fetch: Secondary Data (Likes, Related, Reviews)
        // These don't block the main view
        const secondaryPromises = [];

        // Check Like Status (Optimized)
        if (isSignedIn && data.id) {
           secondaryPromises.push(
               apiClient.user.getLikeStatus(data.id)
                  .then(res => setIsLiked(res.liked))
                  .catch(() => {}) 
           );
        }

        // Related Items
        if (data.tags && data.tags.length > 0) {
            const tagPromise = (async () => {
                try {
                  const related = await apiClient.assets.list({ tag: data.tags![0], limit: 4 });
                  let filtered = related.assets?.filter(a => a.id !== data.id) || [];
                  if (filtered.length < 3 && data.category) {
                     const catRelated = await apiClient.assets.list({ category: data.category, limit: 4 });
                     const catFiltered = catRelated.assets?.filter(a => a.id !== data.id && !filtered.find(f => f.id === a.id)) || [];
                     filtered = [...filtered, ...catFiltered];
                  }
                  setRelatedItems(filtered.slice(0, 4));
                } catch(e) { console.error("Related items error", e); }
            })();
            secondaryPromises.push(tagPromise);
        } else if (data.category) {
            secondaryPromises.push(
               apiClient.assets.list({ category: data.category, limit: 4 })
                 .then(res => setRelatedItems(res.assets?.filter(a => a.id !== data.id).slice(0, 4) || []))
                 .catch(e => console.error("Category related error", e))
            );
        }

        // Review Stats & List (Single Source of Truth)
        if (data.id) {
            secondaryPromises.push(
                apiClient.reviews.list(data.id)
                  .then(stats => {
                    setReviewStats({ avg: stats.averageRating, count: stats.totalReviews });
                    setSchemaReviews(stats.reviews.slice(0, 5)); // Keep top 5 for schema
                  })
                  .catch(() => {})
            );
        }

        // Run all secondary fetches in parallel
        await Promise.allSettled(secondaryPromises);

      } catch (err) {
        console.error(err);
        setError("Failed to load asset");
        setIsLoading(false);
      }
    };

    fetchAsset();
  }, [id, slug, isSignedIn]);

  // Track ViewItem event when asset loads
  useEffect(() => {
    if (asset?.id) {
      analytics.viewItem(asset.asset_id || asset.id, asset.title, asset.category);
    }
  }, [asset?.id, asset?.asset_id, asset?.title, asset?.category]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-8 pb-16 flex justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-500">Loading design...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 pt-8 pb-16 text-center px-6">
        <div className="max-w-md mx-auto text-center">
          <img src="/404-robot.svg" alt="Robot not found" className="w-48 h-48 mx-auto mb-6" />
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-4">{error || "Design Not Found"}</h1>
          <p className="text-gray-600 mb-8">I think my toddler hid this page (or colored over it). It's gone. Let's get you back to the Vault.</p>
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
        breadcrumbs={[
          { name: "Home", url: "https://huepress.co/" },
          { name: "Vault", url: "https://huepress.co/vault" },
          ...(asset.category ? [{ name: asset.category, url: `https://huepress.co/vault?category=${encodeURIComponent(asset.category)}` }] : []),
          { name: asset.title, url: canonicalUrl }
        ]}
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
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviewStats.count > 0 ? reviewStats.avg : 5,
              reviewCount: reviewStats.count > 0 ? reviewStats.count : 1
            },
            ...(reviewStats.count > 0 && {
              review: schemaReviews.map(review => ({
                "@type": "Review",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": review.rating,
                  "bestRating": "5"
                },
                "author": {
                  "@type": "Person",
                  "name": review.user_email ? review.user_email.split('@')[0] : "Anonymous" 
                },
                ...(review.comment && { "reviewBody": review.comment })
              }))
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
                },
                "deliveryTime": {
                  "@type": "ShippingDeliveryTime",
                  "handlingTime": {
                    "@type": "QuantitativeValue",
                    "minValue": 0,
                    "maxValue": 0,
                    "unitCode": "d"
                  },
                  "transitTime": {
                    "@type": "QuantitativeValue",
                    "minValue": 0,
                    "maxValue": 0,
                    "unitCode": "d"
                  }
                }
              },
              "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "applicableCountry": "US",
                "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted"
              }
            }
          }}
        />
      )}

      {/* Hero Section */}
      <div className="pt-8 lg:pt-10 pb-8">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto mb-6">
             {/* Breadcrumbs */}
             <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <Link to="/vault" className="hover:text-primary transition-colors">Vault</Link>
                {asset.category && (
                  <>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <Link to={`/vault?category=${encodeURIComponent(asset.category)}`} className="hover:text-primary transition-colors capitalize">{asset.category}</Link>
                  </>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="text-gray-900 font-medium truncate max-w-[200px]">{asset.title}</span>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 max-w-7xl mx-auto">
            
            {/* Left Column: Product Image */}
            <div className="w-full lg:w-1/2">
                 <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 group">
                   {/* 1:1 container - clips bottom banner using clip-path */}
                   <div className="aspect-square w-full bg-white overflow-hidden flex items-center justify-center">
                     {asset.image_url && !asset.image_url.includes("__draft__") && !imageError ? (
                       <img 
                         src={asset.image_url} 
                         alt={asset.title}
                         className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500 select-none"
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

            {/* Right Column: Key Details & CTA */}
            <div className="w-full lg:w-1/2">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                 <Link to={`/vault?category=${encodeURIComponent(asset.category)}`} className="px-3 py-1 bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider rounded-full hover:bg-primary/10 transition-colors">
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
                {reviewStats.count > 0 && (
                   <div className="flex items-center gap-1.5">
                     <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                     <span className="font-medium text-ink">{reviewStats.avg?.toFixed(1)}</span>
                     <span className="text-gray-400">({reviewStats.count})</span>
                   </div>
                )}
              </div>

              <p className="text-gray-600 leading-relaxed mb-6">
                {asset.description}
              </p>

              {/* Download/Unlock Section */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 mb-6">
                <DownloadSection assetId={assetId} formattedAssetId={asset.asset_id as string} title={asset.title} />
              </div>

              {/* Value Props / Trust Badges */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6">
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
                        <h4 className="font-serif text-lg text-ink mb-1">Request a Custom Design</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Can't find exactly what you're looking for? As a Club member, you can request specific designs.
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
            <ReviewsSection assetId={assetId} stats={reviewStats} onStatsChange={setReviewStats} />
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
                    <ResourceCard
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      imageUrl={item.image_url}
                      assetId={item.asset_id}
                      slug={item.slug}
                      tags={item.tags || []}
                      isLocked={!isSubscriber}
                      isSubscriber={isSubscriber}
                    />
                  ))}
                </div>
           </div>
        </div>
      </div>
    </div>
  );
}
