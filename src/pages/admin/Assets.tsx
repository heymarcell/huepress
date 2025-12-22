import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui";

// Mock assets - will be replaced with API call
const mockAssets = [
  { id: "1", title: "Capybara in Flower Garden", category: "Animals", skill: "Easy", status: "published", downloads: 45, createdAt: "2024-12-20" },
  { id: "2", title: "Ocean Whale", category: "Animals", skill: "Easy", status: "published", downloads: 32, createdAt: "2024-12-19" },
  { id: "3", title: "Friendly T-Rex", category: "Animals", skill: "Medium", status: "draft", downloads: 0, createdAt: "2024-12-18" },
  { id: "4", title: "Astronaut Cat", category: "Fantasy", skill: "Medium", status: "published", downloads: 28, createdAt: "2024-12-17" },
  { id: "5", title: "Magical Unicorn", category: "Fantasy", skill: "Hard", status: "published", downloads: 56, createdAt: "2024-12-16" },
  { id: "6", title: "Beautiful Butterfly", category: "Nature", skill: "Easy", status: "draft", downloads: 0, createdAt: "2024-12-15" },
];

export default function AdminAssets() {
  const [assets, setAssets] = useState(mockAssets);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const filteredAssets = assets.filter((asset) => {
    if (filter === "all") return true;
    return asset.status === filter;
  });

  const toggleStatus = (id: string) => {
    setAssets(assets.map((asset) => 
      asset.id === id 
        ? { ...asset, status: asset.status === "published" ? "draft" : "published" }
        : asset
    ));
  };

  const deleteAsset = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      setAssets(assets.filter((asset) => asset.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-h2 text-ink">Assets</h1>
          <p className="text-gray-500">Manage your coloring page library</p>
        </div>
        <Link to="/admin/assets/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            Add Asset
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
            {f === "all" && ` (${assets.length})`}
            {f === "published" && ` (${assets.filter(a => a.status === "published").length})`}
            {f === "draft" && ` (${assets.filter(a => a.status === "draft").length})`}
          </button>
        ))}
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
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
              <tr key={asset.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-ink">{asset.title}</p>
                  <p className="text-xs text-gray-400">Created {asset.createdAt}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.category}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.skill}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      asset.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.downloads}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleStatus(asset.id)}
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100"
                      title={asset.status === "published" ? "Unpublish" : "Publish"}
                    >
                      {asset.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <Link
                      to={`/admin/assets/${asset.id}/edit`}
                      className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
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
  );
}
