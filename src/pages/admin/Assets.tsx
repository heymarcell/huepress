import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
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
  downloads?: number;
  createdAt?: string;
}

export default function AdminAssets() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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

  // Fetch Assets
  const { data: assetsData, isLoading: loading } = useQuery({
    queryKey: ['admin', 'assets'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return apiClient.admin.listAssets(token);
    },
    enabled: !!user,
  });

  const assets = (assetsData?.assets || []) as AdminAsset[];

  const filteredAssets = assets.filter((asset) => {
    if (filter === "all") return true;
    return asset.status === filter;
  });

  // Mutations
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'published' | 'draft' }) => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      // Use single update or bulk? The UI calls toggleStatus per item.
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
    const asset = assets.find(a => a.id === id);
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
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map(a => a.id)));
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
      <div className="flex items-center justify-between mb-8">
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
            {f === "all" && ` (${assets.length})`}
            {f === "published" && ` (${assets.filter(a => a.status === "published").length})`}
            {f === "draft" && ` (${assets.filter(a => a.status === "draft").length})`}
          </button>
        ))}
      </div>

      {/* Assets Table */}
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 w-12">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === filteredAssets.length && filteredAssets.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Skill</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Downloads</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAssets.map((asset) => (
              <tr key={asset.id} className={`hover:bg-white/60 transition-colors group ${selectedIds.has(asset.id) ? 'bg-primary/5' : ''}`}>
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(asset.id)}
                    onChange={() => toggleSelect(asset.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-ink group-hover:text-primary transition-colors">{asset.title}</p>
                  <p className="text-xs text-gray-400">Created {asset.createdAt}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.category}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.skill}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      asset.status === "published"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }`}
                  >
                    {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.downloads}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleStatus(asset.id)}
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-white hover:shadow-sm transition-all"
                      title={asset.status === "published" ? "Unpublish" : "Publish"}
                    >
                      {asset.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <Link
                      to={`/admin/assets/${asset.id}/edit`}
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-white hover:shadow-sm transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => confirmDelete(asset.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
