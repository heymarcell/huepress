import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { useUser, useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { AlertModal } from "@/components/ui/AlertModal";

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
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
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

  useEffect(() => {
    if (!user) return;

      const fetchAssets = async () => {
        try {
          const token = await getToken();
          if (!token) return;
          const data = await apiClient.admin.listAssets(token);
          setAssets(data.assets || []);
        } catch (error) {
        console.error("Failed to fetch assets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [user, getToken]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading assets...</div>;
  }

  const filteredAssets = assets.filter((asset) => {
    if (filter === "all") return true;
    return asset.status === filter;
  });

  const toggleStatus = async (id: string) => {
    if (!user) return;
    const token = await getToken();
    if (!token) return;

    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    
    const newStatus = asset.status === "published" ? "draft" : "published";
    
    // Optimistic update
    setAssets(assets.map((a) => 
      a.id === id ? { ...a, status: newStatus } : a
    ));
    
    try {
      await apiClient.admin.updateStatus(id, newStatus, token);
    } catch (error) {
      console.error("Failed to update status:", error);
      // Revert on failure
      setAssets(assets.map((a) => 
        a.id === id ? { ...a, status: asset.status } : a
      ));
    }
  };

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

  const handleDeleteConfirm = async () => {
    if (!user) return;
    const token = await getToken();
    if (!token) return;
    
    setIsDeleting(true);
    try {
      if (deleteModal.isBulk) {
        await apiClient.admin.bulkDeleteAssets(Array.from(selectedIds), token);
        setAssets(assets.filter(a => !selectedIds.has(a.id)));
        setSelectedIds(new Set());
      } else if (deleteModal.assetId) {
        await apiClient.admin.deleteAsset(deleteModal.assetId, token);
        setAssets(assets.filter(a => a.id !== deleteModal.assetId));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
      setDeleteModal({ isOpen: false, assetId: null, isBulk: false });
    }
  };

  const handleBulkRegenerate = async () => {
    if (selectedIds.size === 0) return;
    if (!user) return;
    const token = await getToken();
    if (!token) return;
    
    setIsRegenerating(true);
    try {
      const result = await apiClient.admin.bulkRegenerateAssets(Array.from(selectedIds), token);
      setNotificationModal({
        isOpen: true,
        title: 'Regeneration Queued',
        message: `${result.queuedCount} asset(s) queued for regeneration. Check logs for progress.`,
        variant: 'success'
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Regenerate failed:", error);
      setNotificationModal({
        isOpen: true,
        title: 'Regeneration Failed',
        message: 'Failed to queue regeneration. Check console for details.',
        variant: 'error'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleBulkStatus = async (status: 'published' | 'draft') => {
    if (selectedIds.size === 0) return;
    if (!user) return;
    const token = await getToken();
    if (!token) return;
    
    setIsUpdatingStatus(true);
    try {
      const result = await apiClient.admin.bulkUpdateStatus(Array.from(selectedIds), status, token);
      // Update local state
      setAssets(assets.map(a => 
        selectedIds.has(a.id) ? { ...a, status } : a
      ));
      setNotificationModal({
        isOpen: true,
        title: status === 'published' ? 'Assets Published' : 'Assets Unpublished',
        message: `${result.updatedCount} asset(s) ${status === 'published' ? 'published' : 'set to draft'}.`,
        variant: 'success'
      });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Status update failed:", error);
      setNotificationModal({
        isOpen: true,
        title: 'Update Failed',
        message: 'Failed to update status. Check console for details.',
        variant: 'error'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={handleBulkRegenerate} 
                disabled={isRegenerating}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Regenerating...' : `Regenerate (${selectedIds.size})`}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkStatus('published')} 
                disabled={isUpdatingStatus}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Eye className="w-4 h-4" />
                {isUpdatingStatus ? 'Updating...' : 'Publish'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkStatus('draft')} 
                disabled={isUpdatingStatus}
                className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
              >
                <EyeOff className="w-4 h-4" />
                {isUpdatingStatus ? 'Updating...' : 'Unpublish'}
              </Button>
              <Button variant="outline" onClick={confirmBulkDelete} className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </Button>
            </>
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
