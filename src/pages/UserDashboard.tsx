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
                ) : (
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
                  <div className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {history.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="group relative">
                           <ResourceCard 
                             id={item.id}
                             assetId={item.asset_id}
                             title={item.title}
                             imageUrl={item.image_url}
                             slug={item.slug}
                             tags={item.tags}
                             isLocked={false}
                             isSubscriber={true}
                           />
                           <div className="mt-2 text-xs text-neutral-400 flex justify-between px-1">
                              <span className="capitalize">{item.type || "download"}</span>
                              <span>{new Date(item.downloaded_at).toLocaleDateString()}</span>
                           </div>
                        </div>
                      ))}
                    </div>
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
