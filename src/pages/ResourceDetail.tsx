import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Button, StickyCTA } from "@/components/ui";
import { useSubscription } from "@/lib/auth";
import { 
  FileText, 
  Printer, 
  PenTool, 
  Sparkles,
  Star,
  Download,
  Unlock,
  Check
} from "lucide-react";
import SEO from "@/components/SEO";

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
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/download/${assetId}`);
      if (!response.ok) {
        if (response.status === 403) {
          alert("Subscription required to download");
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
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed. Please try again.");
    }
  };

  const handleFreeSample = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service
    alert(`Sample will be sent to ${email}! (Demo mode)`);
    setShowEmailCapture(false);
    setEmail("");
  };

  if (!isLoaded) {
    return <div className="h-14 skeleton rounded-xl w-full" />;
  }

  // Subscriber: Show download button
  if (isSubscriber) {
    return (
      <Button variant="primary" size="lg" className="w-full" onClick={handleDownload}>
        <Download className="w-5 h-5" />
        Download PDF
      </Button>
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
      
      {/* 3-Step Reassurance Micro-row - New for Sprint 3 */}
      {/* 3-Step Reassurance Micro-row - Improved readability */}
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
        <form onSubmit={handleFreeSample} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-md focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
          />
          <Button variant="outline" size="md" className="w-full" type="submit">
            Get 3 Free Pages
          </Button>
          <p className="text-[10px] text-gray-400 text-center">
            Watermarked samples. No spam, unsubscribe anytime.
          </p>
        </form>
      )}

      {/* Login link */}
      {!isSignedIn && (
        <p className="text-center text-sm text-gray-500">
          Already a member? <Link to="/pricing" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      )}
    </div>
  );
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const asset = mockAsset;

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title={`${asset.title} | Free Coloring Page | HuePress`}
        description={asset.description}
        image={asset.imageUrl}
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

              <hr className="my-8 border-gray-100" />

              {/* What you get */}
              <div className="space-y-4">
                <h3 className="font-bold text-ink">What you get:</h3>
                <ul className="space-y-2">
                  {[
                    "Crystal-clear vector PDF — prints at any size",
                    "Bold, therapy-grade lines — easy for little hands",
                    "A4 & US Letter ready — just open and print",
                    "No watermark on Club downloads",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-gray-600 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
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
        <div className="h-24 md:h-0" />
      </div>
      <StickyCTA />
    </div>
  );
}
