import { useParams, Link } from "react-router-dom";
import { useState } from "react";
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
  Unlock
} from "lucide-react";
import SEO from "@/components/SEO";
import { apiClient } from "@/lib/api-client";
import { StructuredData } from "@/components/StructuredData";
import { analytics } from "@/lib/analytics";
import { FreeSampleCapture } from "@/components/features/FreeSampleCapture";

const mockAsset = {
  id: "1",
  title: "Cozy Capybara",
  description: "A friendly capybara enjoying a peaceful moment. Perfect for calming activities and developing fine motor skills with bold, easy-to-color lines.",
  category: "Animals",
  skill: "Calm",
  imageUrl: "/thumbnails/thumb_capybara_1766354990805.png",
  isNew: true,
};

const relatedItems = [
  { id: "2", title: "Ocean Whale", imageUrl: "/thumbnails/thumb_whale_1766355003894.png" },
  { id: "3", title: "Friendly T-Rex", imageUrl: "/thumbnails/thumb_dinosaur_1766355016602.png" },
  { id: "4", title: "Astronaut Cat", imageUrl: "/thumbnails/thumb_astronaut_cat_1766355051538.png" },
];

// Trust badges with Lucide icons
const trustBadges = [
  { icon: FileText, label: "Vector PDF" },
  { icon: Printer, label: "A4 + US Letter" },
  { icon: PenTool, label: "Bold Lines" },
  { icon: Sparkles, label: "No Watermark" },
];

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
  const { id } = useParams<{ id: string }>();
  // In a real app, use SWR/React Query or loader data
  const asset = mockAsset; 
  const canonicalUrl = `https://huepress.co/vault/${id}`;

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title={asset.title} 
        description={asset.description}
        image={asset.imageUrl}
        url={canonicalUrl}
        type="article"
      />
      <StructuredData 
        type="Product"
        data={{
          name: asset.title,
          description: asset.description,
          image: asset.imageUrl.startsWith("http") ? asset.imageUrl : `https://huepress.co${asset.imageUrl}`,
          brand: {
             "@type": "Brand",
             "name": "HuePress"
          },
          // Aggregate rating for product snippets
          aggregateRating: {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "512",
            "bestRating": "5",
            "worstRating": "1"
          },
          // Sample review for rich results
          review: {
            "@type": "Review",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5"
            },
            "author": {
              "@type": "Person",
              "name": "Sarah M."
            },
            "reviewBody": "Perfect for my kids! The bold lines are so easy to color and keep them focused."
          },
          offers: {
            "@type": "Offer",
            "price": "5.00",
            "priceCurrency": "USD",
            "priceValidUntil": "2025-12-31",
            "availability": "https://schema.org/InStock",
            "url": canonicalUrl,
            // Digital delivery - no shipping required
            "shippingDetails": {
              "@type": "OfferShippingDetails",
              "shippingRate": {
                "@type": "MonetaryAmount",
                "value": "0",
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
                  "minValue": "0",
                  "maxValue": "0",
                  "unitCode": "d"
                },
                "transitTime": {
                  "@type": "QuantitativeValue",
                  "minValue": "0",
                  "maxValue": "0",
                  "unitCode": "d"
                }
              }
            },
            "hasMerchantReturnPolicy": {
              "@type": "MerchantReturnPolicy",
              "applicableCountry": "US",
              "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
              "merchantReturnDays": "0",
              "returnMethod": "https://schema.org/ReturnByMail",
              "returnFees": "https://schema.org/FreeReturn"
            }
          }
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li><Link to="/vault" className="text-gray-500 hover:text-ink">The Vault</Link></li>
            <li className="text-gray-400">/</li>
            <li className="text-ink font-medium">{asset.title}</li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Preview on pure white paper */}
          <div className="relative">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Pure white paper - NO gray, NO overlays */}
                <div className="relative aspect-a4 bg-white p-6">
                  {asset.imageUrl ? (
                    <img 
                      src={asset.imageUrl} 
                      alt={asset.title} 
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-16 h-16 text-gray-200" />
                    </div>
                  )}
                  {asset.isNew && (
                    <div className="absolute top-4 left-4 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-md">NEW</div>
                  )}
                </div>
              </div>
              
              {/* Trust badges below preview */}
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {trustBadges.map((badge) => (
                  <span key={badge.label} className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-md shadow-sm">
                    <badge.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div>
            <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
              <div className="flex gap-2 mb-4">
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-md">{asset.category}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-md">{asset.skill}</span>
              </div>

              <h1 className="font-serif text-h1 text-ink mb-4">{asset.title}</h1>
              <p className="text-gray-500 mb-8">{asset.description}</p>

              {/* Download/Unlock Section */}
              <DownloadSection assetId={id || "1"} title={asset.title} />


            </div>

            {/* Related */}
            <div className="mt-8">
              <h3 className="font-serif text-h3 text-ink mb-4">You might also like</h3>
              <div className="grid grid-cols-3 gap-4">
                {relatedItems.map((item) => (
                  <Link key={item.id} to={`/vault/${item.id}`} className="group">
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="aspect-a4 bg-white p-3">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="object-contain w-full h-full" />
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
  );
}
