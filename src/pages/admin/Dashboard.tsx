import { Link } from "react-router-dom";
import { Images, TrendingUp, Users, Download } from "lucide-react";

// Mock stats - will be replaced with API call
const stats = [
  { label: "Total Assets", value: "24", icon: Images, color: "bg-primary" },
  { label: "Downloads", value: "1,234", icon: Download, color: "bg-secondary" },
  { label: "Subscribers", value: "156", icon: Users, color: "bg-ink" },
  { label: "This Week", value: "+12%", icon: TrendingUp, color: "bg-green-500" },
];

const recentAssets = [
  { id: 1, title: "Capybara in Flower Garden", status: "published", downloads: 45 },
  { id: 2, title: "Ocean Whale", status: "published", downloads: 32 },
  { id: 3, title: "Friendly T-Rex", status: "draft", downloads: 0 },
  { id: 4, title: "Astronaut Cat", status: "published", downloads: 28 },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-h2 text-ink">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's an overview of your content.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
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
          {recentAssets.map((asset) => (
            <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-white/60 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                  <Images className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-ink group-hover:text-primary transition-colors">{asset.title}</p>
                  <p className="text-xs text-gray-500">{asset.downloads} downloads</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
