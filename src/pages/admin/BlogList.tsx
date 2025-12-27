import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui";
import { useUser, useAuth } from "@clerk/clerk-react";
import { AlertModal } from "@/components/ui/AlertModal";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: 'published' | 'draft';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function BlogList() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    postId: string | null;
  }>({
    isOpen: false,
    postId: null
  });

  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        
        const response = await fetch("/api/admin/posts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json() as { posts: BlogPost[] };
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user, getToken]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading posts...</div>;
  }

  const filteredPosts = posts.filter((post) => {
    if (filter === "all") return true;
    return post.status === filter;
  });

  const toggleStatus = async (id: string) => {
    if (!user) return;
    const token = await getToken();
    if (!token) return;

    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    const newStatus = post.status === "published" ? "draft" : "published";
    
    // Optimistic update
    setPosts(posts.map((p) => 
      p.id === id ? { ...p, status: newStatus } : p
    ));
    
    try {
      await fetch(`/api/admin/posts/${id}`, {
        method: "PUT",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert on failure
      setPosts(posts.map((p) => 
        p.id === id ? { ...p, status: post.status } : p
      ));
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteModal({ isOpen: true, postId: id });
  };

  const handleDeleteConfirm = async () => {
    if (!user || !deleteModal.postId) return;
    const token = await getToken();
    if (!token) return;
    
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/posts/${deleteModal.postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.filter(p => p.id !== deleteModal.postId));
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, postId: null });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <>
      <AlertModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, postId: null })}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        variant="error"
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        onConfirm={handleDeleteConfirm}
      />
      
      <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-h2 text-ink">Blog Posts</h1>
          <p className="text-gray-500">Manage your blog content</p>
        </div>
        <Link to="/admin/blog/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-ink text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "all" && ` (${posts.length})`}
            {f === "published" && ` (${posts.filter(p => p.status === "published").length})`}
            {f === "draft" && ` (${posts.filter(p => p.status === "draft").length})`}
          </button>
        ))}
      </div>

      {/* Posts Table */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  No posts yet. Create your first post!
                </td>
              </tr>
            ) : (
              filteredPosts.map((post) => (
                <tr key={post.id} className="hover:bg-white/60 transition-colors group">
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${
                        post.status === "published"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-ink group-hover:text-primary transition-colors">{post.title}</p>
                    <p className="text-xs text-gray-400">/blog/{post.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(post.published_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleStatus(post.id)}
                        className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-white hover:shadow-sm transition-all"
                        title={post.status === "published" ? "Unpublish" : "Publish"}
                      >
                        {post.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Link
                        to={`/admin/blog/${post.id}/edit`}
                        className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-white hover:shadow-sm transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => confirmDelete(post.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
