import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiClient } from "@/lib/api-client";
import { Asset } from "@/api/types";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { Loader2, Heart, History, User } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Tab = "likes" | "history";

export default function UserDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("likes");
  
  const [likes, setLikes] = useState<Asset[]>([]);
  const [history, setHistory] = useState<(Asset & { downloaded_at: string, type: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [likesRes, historyRes] = await Promise.all([
          apiClient.user.getLikes(),
          apiClient.user.getHistory()
        ]);
        setLikes(likesRes.likes);
        setHistory(historyRes.history);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSignedIn]);

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 pt-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-medium text-neutral-900">
                Welcome back, {user.firstName || "Creator"}
              </h1>
              <p className="text-neutral-500">Manage your collection and history</p>
            </div>
          </div>
          <Link to="/settings">
             <Button variant="outline">Account Settings</Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("likes")}
              className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                activeTab === "likes" 
                  ? "text-primary" 
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === "likes" ? "fill-current" : ""}`} />
              My Favorites
              <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs">
                {likes.length}
              </span>
              {activeTab === "likes" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                activeTab === "history" 
                  ? "text-primary" 
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <History className="w-4 h-4" />
              Download History
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
             <div className="py-20 flex justify-center">
               <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
             </div>
        ) : (
          <div>
            {activeTab === "likes" && (
              <>
                {likes.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                    <Heart className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">No favorites yet</h3>
                    <p className="text-neutral-500 mb-6">Start exploring and heart the ones you love!</p>
                    <Link to="/vault">
                      <Button>Explore Designs</Button>
                    </Link>
                  </div>
                ) : likes.length <= 8 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {likes.map((asset) => (
                      <ResourceCard 
                        key={asset.id} 
                        id={asset.id}
                        assetId={asset.asset_id}
                        title={asset.title}
                        imageUrl={asset.image_url}
                        slug={asset.slug}
                        tags={asset.tags}
                        isLocked={false} 
                        isSubscriber={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
                    {likes.map((asset, idx) => (
                      <Link 
                        key={asset.id} 
                        to={asset.asset_id && asset.slug ? `/coloring-pages/${asset.slug}-${asset.asset_id}` : `/vault/${asset.id}`}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors ${idx !== likes.length - 1 ? 'border-b border-neutral-100' : ''}`}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                          {asset.image_url ? (
                            <img src={asset.image_url} alt={asset.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                              <Heart className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-neutral-900 truncate">{asset.title}</h4>
                          {asset.asset_id && <span className="text-xs text-neutral-400">#{asset.asset_id}</span>}
                        </div>
                        <Heart className="w-4 h-4 text-red-400 fill-red-400 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "history" && (
              <>
                {history.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                    <History className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">No history yet</h3>
                    <p className="text-neutral-500 mb-6">Your downloaded and printed pages will appear here.</p>
                    <Link to="/vault">
                      <Button>Browse Vault</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
                    {history.map((item, idx) => (
                      <Link 
                        key={`${item.id}-${idx}`}
                        to={item.asset_id && item.slug ? `/coloring-pages/${item.slug}-${item.asset_id}` : `/vault/${item.id}`}
                        className={`flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors ${idx !== history.length - 1 ? 'border-b border-neutral-100' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                              <History className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-neutral-900 truncate">{item.title}</h4>
                          <span className="text-xs text-neutral-400">
                            {new Date(item.downloaded_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                          item.type === 'print' 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-green-50 text-green-600'
                        }`}>
                          {item.type === 'print' ? 'Printed' : 'Downloaded'}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
