import { useUser } from "@clerk/clerk-react";
import { Navigate, Outlet } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Images, Plus, Settings } from "lucide-react";

// Admin email whitelist - add your admin emails here
const ADMIN_EMAILS = [
  "marcell@neongod.io",
  // Add more admin emails as needed
];

export function AdminLayout() {
  const { user, isLoaded } = useUser();
  const location = useLocation();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Check if user is admin
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail);

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/assets", label: "Assets", icon: Images },
    { path: "/admin/assets/new", label: "Add Asset", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <header className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-white/60 hover:text-white text-sm">
              ← Back to Site
            </Link>
            <span className="text-white/40">|</span>
            <h1 className="font-serif font-bold">HuePress Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">{userEmail}</span>
            <Link to="/admin/settings" className="text-white/60 hover:text-white">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
