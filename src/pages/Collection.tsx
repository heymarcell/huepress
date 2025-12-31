import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ResourceCard, ResourceCardSkeleton, Heading, Button } from "@/components/ui";
import SEO from "@/components/SEO";
import Markdown from "react-markdown";

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  // Sync scroll listener for sticky headers if needed
  // useEffect(() => {
  //   const handleScroll = () => {
  //     setIsScrolled(window.scrollY > 150);
  //   };
  //   window.addEventListener("scroll", handleScroll);
  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, []);

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ["collection", slug],
    queryFn: () => apiClient.seo.getLandingPage(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-12 w-2/3 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-12 max-w-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-ink mb-4">Collection Not Found</h1>
        <p className="text-gray-500 mb-6">We couldn't find the coloring pages you were looking for.</p>
        <Link to="/vault">
          <Button variant="primary">Browse All Designs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title={pageData.title}
        description={pageData.meta_description}
        keywords={`coloring pages, ${pageData.target_keyword}, printable, pdf`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
           <Heading as="h1" variant="h1" className="mb-6">{pageData.title}</Heading> 
           
           {/* AI Generated Intro Content */}
           <div className="prose prose-lg prose-gray mx-auto text-gray-600">
             <Markdown>{pageData.intro_content}</Markdown>
           </div>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 gap-y-8">
           {pageData.assets.map((asset) => (
             <ResourceCard
               key={asset.id}
               id={asset.id}
               title={asset.title}
               imageUrl={asset.image_url}
               tags={asset.tags}
               isLocked={false} // Collections might be previews, but usually we want to show lock state based on auth. 
               // For pSEO, we want users to CLICK. 
               // If we pass isLocked=true, they see a lock.
               // Let's assume standard behavior: locked unless subscriber.
               // But we need `isSubscriber` hook here.
               // For now, let's just pass false to make it look inviting, or fetch auth state.
               slug={asset.slug}
               assetId={asset.asset_id}
             />
           ))}
        </div>

        {/* Related Collections (Internal Link Mesh) */}
        {pageData.related && pageData.related.length > 0 && (
           <div className="mt-16 mb-12">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Explore Related Collections</h3>
              <div className="flex flex-wrap gap-3">
                 {pageData.related.map((link) => (
                    <Link 
                      key={link.slug} 
                      to={`/collection/${link.slug}`}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:text-primary hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      {link.target_keyword}
                    </Link>
                 ))}
              </div>
           </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-20 text-center bg-white rounded-2xl p-8 sm:p-12 border border-blue-100 shadow-sm max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-4">
            Get these {pageData.assets.length} designs + 500 more
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Join HuePress to unlock instant PDF downloads for every single coloring page in our vault.
            Therapist-approved, bold lines, frustration-free.
          </p>
          <Link to="/pricing">
             <Button variant="primary" size="lg" className="w-full sm:w-auto px-12">
               Unlock Full Access ($5/mo)
             </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-400">Cancel anytime. 7-day money-back guarantee.</p>
        </div>

      </div>
    </div>
  );
}
