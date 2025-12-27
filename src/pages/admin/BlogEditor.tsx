import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useUser, useAuth } from "@clerk/clerk-react";
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import { toast } from "sonner";

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  status: "draft" | "published";
  published_at: string;
}

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const isEditing = !!id;
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PostFormData>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    status: "draft",
    published_at: "",
  });

  // Fetch post for editing
  useEffect(() => {
    if (!isEditing || !user) return;
    
    const fetchPost = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        
        const response = await fetch(`/api/admin/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json() as { post: PostFormData };
          setFormData({
            title: data.post.title || "",
            slug: data.post.slug || "",
            excerpt: data.post.excerpt || "",
            content: data.post.content || "",
            cover_image: data.post.cover_image || "",
            status: data.post.status || "draft",
            published_at: data.post.published_at || "",
          });
        } else {
          toast.error("Post not found");
          navigate("/admin/blog");
        }
      } catch (error) {
        console.error("Failed to fetch post:", error);
        toast.error("Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, isEditing, user, getToken, navigate]);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setFormData(prev => ({
      ...prev,
      title: newTitle,
      // Only auto-generate slug if it hasn't been manually edited
      slug: prev.slug === generateSlug(prev.title) ? generateSlug(newTitle) : prev.slug
    }));
  };

  const handleContentChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, content: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const token = await getToken();
    if (!token) return;

    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const url = isEditing ? `/api/admin/posts/${id}` : "/api/admin/posts";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formData,
          slug: formData.slug || generateSlug(formData.title),
        })
      });

      if (response.ok) {
        toast.success(isEditing ? "Post updated!" : "Post created!");
        navigate("/admin/blog");
      } else {
        const error = await response.json() as { error: string };
        toast.error(error.error || "Failed to save post");
      }
    } catch (error) {
      console.error("Failed to save post:", error);
      toast.error("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  // SimpleMDE options - memoized to prevent re-renders
  const editorOptions = useMemo(() => ({
    spellChecker: false,
    autofocus: false,
    placeholder: "Write your post content in Markdown...",
    status: false,
    toolbar: [
      "bold", "italic", "heading", "|",
      "quote", "unordered-list", "ordered-list", "|",
      "link", "image", "|",
      "preview", "side-by-side", "fullscreen", "|",
      "guide"
    ] as const,
  }), []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading post...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/blog")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-serif text-h2 text-ink">
              {isEditing ? "Edit Post" : "New Post"}
            </h1>
            <p className="text-gray-500">
              {isEditing ? "Update your blog post" : "Create a new blog post"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {formData.slug && formData.status === "published" && (
            <a
              href={`/blog/${formData.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary border border-gray-200 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              View
            </a>
          )}
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Enter post title"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">/blog/</span>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated-from-title"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="Short description for SEO and post cards..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Markdown Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <SimpleMDE
                  value={formData.content}
                  onChange={handleContentChange}
                  options={editorOptions}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/60 shadow-sm">
              <h3 className="font-medium text-ink mb-4">Publishing</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      status: e.target.value as "draft" | "published" 
                    }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                {formData.status === "published" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Publish Date
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.published_at ? formData.published_at.slice(0, 16) : ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        published_at: e.target.value ? new Date(e.target.value).toISOString() : ""
                      }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cover Image */}
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/60 shadow-sm">
              <h3 className="font-medium text-ink mb-4">Cover Image</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <Input
                  value={formData.cover_image}
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_image: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              {formData.cover_image && (
                <div className="mt-4">
                  <img
                    src={formData.cover_image}
                    alt="Cover preview"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
