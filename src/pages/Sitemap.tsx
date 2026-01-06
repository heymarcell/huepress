import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Asset } from "@/api/types";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { Loader2, ExternalLink, FileText, ImageIcon, BookOpen } from "lucide-react";

interface LandingPage {
  slug: string;
  title: string;
  target_keyword: string;
}

interface BlogPost {
  slug: string;
  title: string;
  published_at?: string;
}

export default function SitemapPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSitemapData = async () => {
      setIsLoading(true);
      try {
        const [assetsRes, landingRes, postsRes] = await Promise.allSettled([
          apiClient.assets.list({ limit: 1000 }),
          fetch('/api/seo/sitemap').then((r) => r.ok ? r.json() as Promise<{ pages: LandingPage[] }> : { pages: [] }),
          fetch('/api/posts?limit=100').then((r) => r.ok ? r.json() as Promise<{ posts: BlogPost[] }> : { posts: [] }),
        ]);

        if (assetsRes.status === "fulfilled") {
          setAssets(assetsRes.value.assets || []);
        }
        if (landingRes.status === "fulfilled" && landingRes.value.pages) {
          setLandingPages(landingRes.value.pages);
        }
        if (postsRes.status === "fulfilled" && postsRes.value.posts) {
          setBlogPosts(postsRes.value.posts);
        }
      } catch (err) {
        console.error("Failed to load sitemap data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSitemapData();
  }, []);

  const staticPages = [
    { name: "Home", path: "/", desc: "Our therapy-grade coloring pages library" },
    { name: "The Vault", path: "/vault", desc: "Browse all 500+ coloring pages" },
    { name: "Pricing", path: "/pricing", desc: "Join for $5/month" },
    { name: "About", path: "/about", desc: "Learn about our mission" },
    { name: "Request Design", path: "/request-design", desc: "Submit your custom design ideas" },
    { name: "Blog", path: "/blog", desc: "Coloring tips and parenting advice" },
    { name: "Privacy Policy", path: "/privacy", desc: "Our privacy commitment" },
    { name: "Terms of Service", path: "/terms", desc: "Terms and conditions" },
  ];

  // Group assets by category
  const assetsByCategory = assets.reduce((acc, asset) => {
    const category = asset.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Sitemap | HuePress"
        description="Browse all HuePress coloring pages, collections, blog posts, and important pages."
        canonical="https://huepress.co/sitemap"
        breadcrumbs={[
          { name: "Home", url: "https://huepress.co/" },
          { name: "Sitemap", url: "https://huepress.co/sitemap" },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-accent py-12 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", url: "/" },
              { name: "Sitemap", url: "/sitemap" },
            ]}
            className="mb-6"
          />
          <h1 className="font-serif text-4xl font-bold text-ink mb-3">
            Site Map
          </h1>
          <p className="text-gray-600 text-lg">
            Navigate our entire collection of coloring pages, collections, and resources.
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading sitemap...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column: Main Pages & Collections */}
            <div className="space-y-10">
              {/* Main Pages */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="font-serif text-2xl font-bold text-ink">Main Pages</h2>
                </div>
                <ul className="space-y-2 border-l-2 border-gray-200 pl-4">
                  {staticPages.map((page) => (
                    <li key={page.path}>
                      <Link
                        to={page.path}
                        className="group flex items-start gap-2 hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        <div>
                          <div className="font-medium">{page.name}</div>
                          <div className="text-sm text-gray-500">{page.desc}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Collections */}
              {landingPages.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    <h2 className="font-serif text-2xl font-bold text-ink">
                      Collections ({landingPages.length})
                    </h2>
                  </div>
                  <ul className="space-y-2 border-l-2 border-gray-200 pl-4">
                    {landingPages.slice(0, 50).map((page) => (
                      <li key={page.slug}>
                        <Link
                          to={`/collection/${page.slug}`}
                          className="group flex items-start gap-2 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          <div>
                            <div className="font-medium">{page.title}</div>
                            <div className="text-sm text-gray-500">{page.target_keyword}</div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {landingPages.length > 50 && (
                    <p className="text-sm text-gray-400 mt-3 pl-4">
                      + {landingPages.length - 50} more collections...{" "}
                      <Link to="/vault" className="text-primary hover:underline">
                        Browse all
                      </Link>
                    </p>
                  )}
                </section>
              )}

              {/* Blog Posts */}
              {blogPosts.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h2 className="font-serif text-2xl font-bold text-ink">
                      Blog Posts ({blogPosts.length})
                    </h2>
                  </div>
                  <ul className="space-y-2 border-l-2 border-gray-200 pl-4">
                    {blogPosts.slice(0, 20).map((post) => (
                      <li key={post.slug}>
                        <Link
                          to={`/blog/${post.slug}`}
                          className="group flex items-start gap-2 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          <div className="font-medium">{post.title}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {blogPosts.length > 20 && (
                    <p className="text-sm text-gray-400 mt-3 pl-4">
                      + {blogPosts.length - 20} more posts...{" "}
                      <Link to="/blog" className="text-primary hover:underline">
                        View blog
                      </Link>
                    </p>
                  )}
                </section>
              )}
            </div>

            {/* Right Column: Coloring Pages by Category */}
            <div className="space-y-10">
              <section>
                <h2 className="font-serif text-2xl font-bold text-ink mb-4">
                  Coloring Pages by Category ({assets.length} total)
                </h2>

                {Object.entries(assetsByCategory)
                  .sort(([, a], [, b]) => b.length - a.length)
                  .map(([category, categoryAssets]) => (
                    <div key={category} className="mb-6">
                      <h3 className="font-bold text-ink mb-2 capitalize">
                        {category} ({categoryAssets.length})
                      </h3>
                      <ul className="space-y-1 border-l-2 border-gray-100 pl-4 text-sm">
                        {categoryAssets.slice(0, 10).map((asset) => (
                          <li key={asset.id}>
                            <Link
                              to={`/coloring-pages/${asset.slug || "design"}-${asset.asset_id || asset.id}`}
                              className="text-gray-600 hover:text-primary transition-colors"
                            >
                              {asset.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {categoryAssets.length > 10 && (
                        <p className="text-xs text-gray-400 mt-2 pl-4">
                          + {categoryAssets.length - 10} more...{" "}
                          <Link
                            to={`/vault?category=${encodeURIComponent(category)}`}
                            className="text-primary hover:underline"
                          >
                            View all
                          </Link>
                        </p>
                      )}
                    </div>
                  ))}
              </section>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-16 pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Looking for the XML sitemap?{" "}
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View sitemap.xml
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
