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
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Assets */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-ink">Recent Assets</h2>
          <Link to="/admin/assets" className="text-primary text-sm hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentAssets.map((asset) => (
            <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-medium text-ink">{asset.title}</p>
                <p className="text-sm text-gray-500">{asset.downloads} downloads</p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  asset.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {asset.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
