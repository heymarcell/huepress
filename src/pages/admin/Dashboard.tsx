import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Images, TrendingUp, Users, Download } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { Asset } from "@/api/types";

interface DashboardStats {
  totalAssets: number;
  totalDownloads: number;
  totalSubscribers: number;
  newAssetsThisWeek: number;
}

export default function AdminDashboard() {
  const { user } = useUser();
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
        const email = user.primaryEmailAddress!.emailAddress;
        
        // Parallel fetch
        const [statsData, assetsData] = await Promise.all([
          apiClient.admin.getStats(email),
          apiClient.admin.listAssets(email)
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
  }, [user]);

  const statCards = [
    { label: "Total Assets", value: stats.totalAssets.toString(), icon: Images, color: "bg-primary" },
    { label: "Downloads", value: stats.totalDownloads.toLocaleString(), icon: Download, color: "bg-secondary" },
    { label: "Subscribers", value: stats.totalSubscribers.toString(), icon: Users, color: "bg-ink" },
    { label: "This Week", value: `+${stats.newAssetsThisWeek}`, icon: TrendingUp, color: "bg-green-500" },
  ];

  if (loading) {
     return <div className="p-8 text-center text-gray-500 animate-pulse">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-h2 text-ink">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's an overview of your content.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div 
            key={stat.label} 
            className="bg-white/60 backdrop-blur-md rounded-xl p-6 shadow-sm border border-white/40 hover:shadow-md hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 group"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-lg shadow-lg shadow-${stat.color.replace("bg-", "")}/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-ink mb-1">{stat.value}</p>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Assets */}
      <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white/40 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center justify-between bg-white/40">
          <h2 className="font-serif font-bold text-xl text-ink">Recent Assets</h2>
          <Link to="/admin/assets" className="text-primary text-sm font-medium hover:text-primary-hover hover:underline decoration-2 underline-offset-4 transition-all">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100/50">
          {recentAssets.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No assets found. Create your first one!</div>
          ) : (
            recentAssets.map((asset) => (
            <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-white/60 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                  <Images className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-ink group-hover:text-primary transition-colors">{asset.title}</p>
                  <p className="text-xs text-gray-500">{asset.download_count || 0} downloads</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full border ${
                  asset.status === "published"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                }`}
              >
                {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
              </span>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
