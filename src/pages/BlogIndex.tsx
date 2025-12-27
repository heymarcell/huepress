import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch("/api/posts?limit=20");
        
        if (response.ok) {
          const data = await response.json() as { posts: BlogPost[] };
          setPosts(data.posts || []);
        } else {
          setError("Failed to load posts");
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setError("Failed to load posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Blog | Parenting & Coloring Tips"
        description="Expert tips on therapeutic coloring, child development, and creative activities for kids. Discover insights from HuePress."
        type="website"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="font-serif text-display text-ink mb-4">
              HuePress Blog
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Parenting tips, therapeutic coloring insights, and creative activities for kids.
            </p>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {error ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{error}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Cover Image */}
                  {post.cover_image ? (
                    <Link to={`/blog/${post.slug}`}>
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  ) : (
                    <Link
                      to={`/blog/${post.slug}`}
                      className="block w-full h-48 bg-gradient-to-br from-primary/10 to-secondary/10"
                    />
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <Link to={`/blog/${post.slug}`}>
                      <h2 className="font-serif text-h3 text-ink mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                    </Link>
                    
                    {post.excerpt && (
                      <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {formatDate(post.published_at)}
                      </span>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        Read More →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
