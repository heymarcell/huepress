import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Search, Layers, Download, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { useUser, useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { AlertModal } from "@/components/ui/AlertModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AdminAsset {
  id: string;
  title: string;
  category: string;
  skill: string;
  status: 'published' | 'draft';
  download_count?: number;
  createdAt?: string;
}

// Metrics Card Component
function StatCard({ icon: Icon, label, value, color = "gray" }: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string;
  color?: "gray" | "green" | "yellow" | "blue";
}) {
  const colorClasses = {
    gray: "bg-gray-50 text-gray-600 border-gray-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    yellow: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color === "gray" ? "bg-gray-100" : color === "green" ? "bg-emerald-100" : color === "yellow" ? "bg-amber-100" : "bg-blue-100"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminAssets() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    assetId: string | null;
    isBulk: boolean;
  }>({
    isOpen: false,
    assetId: null,
    isBulk: false
  });

  // Notification modal state
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'success'
  });

  // Fetch Assets with server-side pagination
  const { data: assetsData, isLoading: loading } = useQuery({
    queryKey: ['admin', 'assets', currentPage, filter, debouncedSearch],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const offset = (currentPage - 1) * itemsPerPage;
      return apiClient.admin.listAssets(token, {
        limit: itemsPerPage,
        offset,
        search: debouncedSearch || undefined,
        status: filter
      });
    },
    enabled: !!user,
    placeholderData: (prev) => prev, // Keep previous data while loading
  });

  // Fetch stats for metrics (separate query for global counts)
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return apiClient.admin.getStats(token);
    },
    enabled: !!user,
  });

  // Assets from current page
  const paginatedAssets = useMemo(() => 
    (assetsData?.assets || []) as AdminAsset[], 
    [assetsData?.assets]
  );

  // Server-side total for pagination
  const totalAssets = assetsData?.total || 0;
  const totalPages = Math.ceil(totalAssets / itemsPerPage);

  // Metrics from stats API
  const metrics = useMemo(() => ({
    total: statsData?.totalAssets || 0,
    published: statsData?.publishedAssets || 0,
    draft: statsData?.draftAssets || 0,
    downloads: statsData?.totalDownloads || 0,
  }), [statsData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, debouncedSearch]);

  // Mutations
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'published' | 'draft' }) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return apiClient.admin.updateStatus(id, status, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
    },
    onError: (error) => {
      console.error("Failed to update status:", error);
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: 'published' | 'draft' }) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return apiClient.admin.bulkUpdateStatus(ids, status, token);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
      setNotificationModal({
        isOpen: true,
        title: variables.status === 'published' ? 'Assets Published' : 'Assets Unpublished',
        message: `${data.updatedCount} asset(s) updated.`,
        variant: 'success'
      });
      setSelectedIds(new Set());
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, isBulk, ids }: { id?: string; isBulk: boolean; ids?: string[] }) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      
      if (isBulk && ids) {
        return apiClient.admin.bulkDeleteAssets(ids, token);
      } else if (id) {
        return apiClient.admin.deleteAsset(id, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'assets'] });
      setDeleteModal({ isOpen: false, assetId: null, isBulk: false });
      setSelectedIds(new Set());
    }
  });
  
  const regenerateMutation = useMutation({
     mutationFn: async (ids: string[]) => {
       const token = await getToken();
       return apiClient.admin.bulkRegenerateAssets(ids, token!);
     },
     onSuccess: (data) => {
        setNotificationModal({
          isOpen: true,
          title: 'Regeneration Queued',
          message: `${data.queuedCount} asset(s) queued.`,
          variant: 'success'
        });
        setSelectedIds(new Set());
     }
  });

  const toggleStatus = (id: string) => {
    const asset = paginatedAssets.find((a: AdminAsset) => a.id === id);
    if (!asset) return;
    const newStatus = asset.status === "published" ? "draft" : "published";
    statusMutation.mutate({ id, status: newStatus });
  };

  const handleDeleteConfirm = async () => {
      if (deleteModal.isBulk) {
        deleteMutation.mutate({ isBulk: true, ids: Array.from(selectedIds) });
      } else if (deleteModal.assetId) {
        deleteMutation.mutate({ isBulk: false, id: deleteModal.assetId });
      }
  };

  const isDeleting = deleteMutation.isPending;
  const isUpdatingStatus = statusMutation.isPending || bulkStatusMutation.isPending;
  const isRegenerating = regenerateMutation.isPending;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedAssets.map(a => a.id)));
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteModal({ isOpen: true, assetId: id, isBulk: false });
  };

  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteModal({ isOpen: true, assetId: null, isBulk: true });
  };
  
  const handleBulkRegenerate = () => {
    if (selectedIds.size === 0) return;
    regenerateMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkStatus = (status: 'published' | 'draft') => {
    if (selectedIds.size === 0) return;
    bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status });
  };

  // Thumbnail URL helper
  const getThumbnailUrl = (assetId: string) => 
    `https://assets.huepress.co/thumbnails/${assetId}.webp`;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading assets...</div>;
  }

  return (
    <>
      <AlertModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, assetId: null, isBulk: false })}
        title={deleteModal.isBulk ? `Delete ${selectedIds.size} Assets` : "Delete Asset"}
        message={deleteModal.isBulk 
          ? `Are you sure you want to delete ${selectedIds.size} selected assets? This action cannot be undone.`
          : "Are you sure you want to delete this asset? This action cannot be undone."
        }
        variant="error"
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        onConfirm={handleDeleteConfirm}
      />

      <AlertModal
        isOpen={notificationModal.isOpen}
        onClose={() => setNotificationModal({ ...notificationModal, isOpen: false })}
        title={notificationModal.title}
        message={notificationModal.message}
        variant={notificationModal.variant === 'success' ? 'success' : 'error'}
        confirmText="OK"
        onConfirm={() => setNotificationModal({ ...notificationModal, isOpen: false })}
      />
      
      <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-h2 text-ink">Assets</h1>
          <p className="text-gray-500">Manage your coloring page library</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Actions - Only show when items selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 mr-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <span className="text-sm font-medium text-gray-700">{selectedIds.size} selected</span>
              <div className="w-px h-4 bg-gray-300 mx-2" />
              <button 
                onClick={handleBulkRegenerate} 
                disabled={isRegenerating}
                title="Regenerate selected"
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => handleBulkStatus('published')} 
                disabled={isUpdatingStatus}
                title="Publish selected"
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleBulkStatus('draft')} 
                disabled={isUpdatingStatus}
                title="Unpublish selected"
                className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors disabled:opacity-50"
              >
                <EyeOff className="w-4 h-4" />
              </button>
              <button 
                onClick={confirmBulkDelete}
                title="Delete selected"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <Link to="/admin/assets/new">
            <Button variant="primary">
              <Plus className="w-4 h-4" />
              Add Asset
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Layers} label="Total Assets" value={metrics.total} />
        <StatCard icon={Eye} label="Published" value={metrics.published} color="green" />
        <StatCard icon={EyeOff} label="Drafts" value={metrics.draft} color="yellow" />
        <StatCard icon={Download} label="Downloads" value={metrics.downloads.toLocaleString()} color="blue" />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-2">
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
            </button>
          ))}
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 w-12">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === paginatedAssets.length && paginatedAssets.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="text-left px-4 py-3 w-16 text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Downloads</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedAssets.map((asset, idx) => (
              <tr 
                key={asset.id} 
                className={`transition-colors ${
                  selectedIds.has(asset.id) 
                    ? 'bg-primary/5' 
                    : idx % 2 === 0 
                      ? 'bg-white' 
                      : 'bg-gray-50/50'
                } hover:bg-primary/5`}
              >
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(asset.id)}
                    onChange={() => toggleSelect(asset.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                    <img 
                      src={getThumbnailUrl(asset.id)} 
                      alt="" 
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      onError={(e) => {
                        // Simply hide the broken image, gray background shows through
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{asset.title}</p>
                  <p className="text-xs text-gray-400">{asset.createdAt}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{asset.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{asset.skill}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      asset.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {asset.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                  {(asset.download_count || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleStatus(asset.id)}
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-all"
                      title={asset.status === "published" ? "Unpublish" : "Publish"}
                    >
                      {asset.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <Link
                      to={`/admin/assets/${asset.id}/edit`}
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => confirmDelete(asset.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Footer */}
        {totalAssets > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
              {" - "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalAssets)}</span>
              {" of "}
              <span className="font-medium">{totalAssets}</span> assets
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-[80px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {paginatedAssets.length === 0 && !loading && (
          <div className="py-12 text-center text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No assets found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
