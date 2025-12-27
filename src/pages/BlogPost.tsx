import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SEO from "@/components/SEO";
import { ArrowLeft, Calendar } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${slug}`);
        
        if (response.ok) {
          const data = await response.json() as { post: BlogPost };
          setPost(data.post);
        } else if (response.status === 404) {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to fetch post:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

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

  if (notFound || !post) {
    return (
      <>
        <SEO title="Post Not Found" />
        <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="w-32 h-44 mb-6 animate-fade-in">
            <img src="/404-robot.svg" alt="Post not found" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-serif text-h1 text-ink mb-4">Post Not Found</h1>
          <p className="text-gray-500 mb-8 max-w-md">
            Sorry, the post you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/blog"
            className="text-primary hover:underline flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.excerpt || undefined}
        image={post.cover_image || undefined}
        type="article"
      />

      <article className="min-h-screen bg-white">
        {/* Hero / Cover Image */}
        {post.cover_image && (
          <div className="w-full h-64 md:h-96 relative">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Link */}
          <Link
            to="/blog"
            className="text-gray-500 hover:text-primary flex items-center gap-2 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Title & Meta */}
          <header className="mb-8">
            <h1 className="font-serif text-display text-ink mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.published_at || post.created_at}>
                {formatDate(post.published_at || post.created_at)}
              </time>
            </div>
          </header>

          {/* Markdown Content */}
          <div className="prose prose-lg lg:prose-xl max-w-none 
            prose-headings:font-serif prose-headings:text-ink prose-headings:font-bold
            prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
            prose-p:text-gray-600 prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-ink prose-strong:font-semibold
            prose-ul:text-gray-600 prose-ol:text-gray-600
            prose-li:marker:text-primary
            prose-blockquote:border-l-primary prose-blockquote:text-gray-500 prose-blockquote:italic
            prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-gray-900 prose-pre:text-gray-100
            prose-img:rounded-xl prose-img:shadow-lg
            prose-hr:border-gray-200
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Footer CTA */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-8 text-center">
              <h3 className="font-serif text-h2 text-ink mb-2">
                Explore Our Collection
              </h3>
              <p className="text-gray-500 mb-6">
                Discover therapy-grade coloring pages designed for creative minds.
              </p>
              <Link
                to="/vault"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-hover transition-colors"
              >
                Browse The Vault
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
