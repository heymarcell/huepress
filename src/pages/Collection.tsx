import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { ResourceCard, ResourceCardSkeleton, Button } from "@/components/ui";
import SEO from "@/components/SEO";
import Markdown from "react-markdown";

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>(); 
  const { user } = useUser();
  const isSubscriber = user?.publicMetadata?.role === "subscriber" || user?.publicMetadata?.subscriptionStatus === "active";

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ["collection", slug],
    queryFn: () => apiClient.seo.getLandingPage(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-12 w-2/3 bg-gray-200 rounded-lg animate-pulse mb-6 mx-auto" />
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-12 max-w-2xl mx-auto" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(8)].map((_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-ink mb-4">Collection Not Found</h1>
        <p className="text-gray-500 mb-6">We couldn't find the coloring pages you were looking for.</p>
        <Link to="/vault">
          <Button variant="primary">Browse All Designs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <SEO 
        title={pageData.title}
        description={pageData.meta_description}
        keywords={`coloring pages, ${pageData.target_keyword}, printable, pdf`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Hero Section - Compact & Clean */}
        <div className="max-w-4xl mx-auto mb-12">
           <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-4 text-center">
             {pageData.title}
           </h1>
           
           {/* AI Generated Intro Content */}
           <div className="prose prose-gray mx-auto text-gray-600 text-center max-w-3xl">
             <Markdown>{pageData.intro_content}</Markdown>
           </div>
        </div>

        {/* The Grid - Match Vault exactly */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 gap-y-6 sm:gap-y-8 mb-16">
           {pageData.assets.map((asset, index) => {
             // Parse tags - they come as comma-separated string from DB
             const tags = asset.tags as unknown;
             const tagsArray = typeof tags === 'string' 
               ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
               : Array.isArray(tags) ? tags : [];

             // Check if new (within last 7 days)
             const isNew = asset.created_at && new Date(asset.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? true : false;

             return (
               <ResourceCard
                 key={asset.id}
                 id={asset.id}
                 title={asset.title}
                 imageUrl={asset.image_url}
                 tags={tagsArray}
                 isLocked={!isSubscriber}
                 isNew={isNew}
                 isSubscriber={isSubscriber}
                 slug={asset.slug}
                 assetId={asset.asset_id}
                 priority={index < 4}
               />
             );
           })}
        </div>

        {/* Related Collections */}
        {pageData.related && pageData.related.length > 0 && (
           <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">More Collections You'll Love</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                 {pageData.related.map((link) => (
                    <Link 
                      key={link.slug} 
                      to={`/collection/${link.slug}`}
                      className="group p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-primary/30 hover:shadow-md transition-all"
                    >
                      <h3 className="font-medium text-ink group-hover:text-primary transition-colors line-clamp-2">
                        {link.title || link.target_keyword}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{link.target_keyword}</p>
                    </Link>
                 ))}
              </div>
           </div>
        )}

        {/* Bottom CTA - More compact */}
        <div className="text-center bg-white rounded-2xl p-8 sm:p-10 border-2 border-primary/10 shadow-sm max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
            Unlock {pageData.assets.length} Designs + 500 More
          </h2>
          <p className="text-gray-600 mb-6">
            Instant PDF downloads. Bold lines. Therapist-approved. Cancel anytime.
          </p>
          <Link to="/pricing">
             <Button variant="primary" size="lg" className="w-full sm:w-auto px-12">
               Join HuePress Club ($5/mo)
             </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-400">7-day money-back guarantee</p>
        </div>

      </div>
    </div>
  );
}
