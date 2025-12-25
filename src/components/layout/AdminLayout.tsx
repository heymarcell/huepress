import { useUser, RedirectToSignIn } from "@clerk/clerk-react";
import { Outlet } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Images, Plus, Settings, Sparkles } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <RedirectToSignIn />;
  }

  // Check if user is admin
  const userEmail = user.primaryEmailAddress?.emailAddress;
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center max-w-md">
          <h1 className="text-xl font-bold text-ink mb-2">Access Denied</h1>
          <p className="text-gray-500 mb-6">
            The account <strong>{userEmail}</strong> does not have permission to access the admin area.
          </p>
          <Link to="/">
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              Return Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/requests", label: "Requests", icon: Sparkles },
    { path: "/admin/assets", label: "Assets", icon: Images },
    { path: "/admin/assets/new", label: "Add Asset", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary/5">
      {/* Top Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-500 hover:text-primary text-sm font-medium transition-colors">
              ← Back to Site
            </Link>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-lg font-serif">H</div>
               <h1 className="font-serif font-bold text-ink text-lg">HuePress Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 font-medium">{userEmail}</span>
            <Link to="/admin/settings" className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto pt-6 px-4 gap-6">
        {/* Sidebar - Floating Card */}
        <aside className="w-64 hidden lg:block">
          <div className="bg-white/60 backdrop-blur-md border border-white/40 shadow-sm rounded-xl p-4 sticky top-24">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-gray-600 hover:bg-white hover:text-primary hover:shadow-sm"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-gray-400 group-hover:text-primary"}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
