import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Images, TrendingUp, Users, Download, Plus, Sparkles, ImageIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { Asset } from "@/api/types";
import { Button } from "@/components/ui";

interface DashboardStats {
  totalAssets: number;
  totalDownloads: number;
  totalSubscribers: number;
  newAssetsThisWeek: number;
}

// Stat Card with optional trend indicator
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color,
  trend
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  trend?: { value: string; type: 'up' | 'down' | 'neutral' };
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend.type === 'up' ? 'bg-emerald-50 text-emerald-600' :
            trend.type === 'down' ? 'bg-red-50 text-red-600' :
            'bg-gray-100 text-gray-500'
          }`}>
            {trend.type === 'up' && <ArrowUpRight className="w-3 h-3" />}
            {trend.type === 'down' && <ArrowDownRight className="w-3 h-3" />}
            {trend.type === 'neutral' && <Minus className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-ink mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  );
}

// Quick Action Card
function QuickActionCard({ 
  icon: Icon, 
  label, 
  to,
  badge 
}: { 
  icon: React.ElementType;
  label: string;
  to: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all group"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
        <Icon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
      </div>
      <span className="font-medium text-ink group-hover:text-primary transition-colors">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-secondary text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    totalDownloads: 0,
    totalSubscribers: 0,
    newAssetsThisWeek: 0
  });
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.primaryEmailAddress?.emailAddress) return;

    const loadData = async () => {
      try {
        const token = await getToken();
        if (!token) {
            console.error("No token available");
            return;
        }

        // Parallel fetch
        const [statsData, assetsData] = await Promise.all([
          apiClient.admin.getStats(token),
          apiClient.admin.listAssets(token)
        ]);

        setStats(statsData);
        setRecentAssets(assetsData.assets.slice(0, 5)); // Top 5
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, getToken]);

  // Thumbnail URL helper
  const getThumbnailUrl = (assetId: string) => 
    `https://assets.huepress.co/thumbnails/${assetId}.webp`;

  if (loading) {
     return <div className="p-8 text-center text-gray-500 animate-pulse">Loading dashboard...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-h2 text-ink">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's an overview of your content.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <QuickActionCard icon={Plus} label="Add New Asset" to="/admin/assets/new" />
        <QuickActionCard icon={Sparkles} label="View Requests" to="/admin/requests" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={Images} 
          label="Total Assets" 
          value={stats.totalAssets} 
          color="bg-primary"
        />
        <StatCard 
          icon={Download} 
          label="Total Downloads" 
          value={stats.totalDownloads.toLocaleString()} 
          color="bg-secondary"
          trend={{ value: "all time", type: "neutral" }}
        />
        <StatCard 
          icon={Users} 
          label="Active Subscribers" 
          value={stats.totalSubscribers} 
          color="bg-ink"
        />
        <StatCard 
          icon={TrendingUp} 
          label="New This Week" 
          value={stats.newAssetsThisWeek} 
          color="bg-emerald-500"
          trend={stats.newAssetsThisWeek > 0 ? { value: "assets", type: "up" } : { value: "no change", type: "neutral" }}
        />
      </div>

      {/* Recent Assets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-serif font-bold text-xl text-ink">Recent Assets</h2>
          <Link to="/admin/assets" className="text-primary text-sm font-medium hover:underline decoration-2 underline-offset-4 transition-all flex items-center gap-1">
            View all <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentAssets.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">No assets found</p>
              <p className="text-sm text-gray-400 mb-4">Create your first coloring page to get started</p>
              <Link to="/admin/assets/new">
                <Button variant="primary" className="mx-auto">
                  <Plus className="w-4 h-4" />
                  Add Asset
                </Button>
              </Link>
            </div>
          ) : (
            recentAssets.map((asset) => (
            <Link 
              key={asset.id} 
              to={`/admin/assets/${asset.id}/edit`}
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                  <img 
                    src={getThumbnailUrl(asset.id)} 
                    alt="" 
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <p className="font-medium text-ink group-hover:text-primary transition-colors">{asset.title}</p>
                  <p className="text-xs text-gray-500">{asset.download_count || 0} downloads</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  asset.status === "published"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {asset.status === "published" ? "Published" : "Draft"}
              </span>
            </Link>
          )))}
        </div>
      </div>
    </div>
  );
}
