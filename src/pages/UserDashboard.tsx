import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ResourceCard } from "@/components/ui/ResourceCard";
import { Loader2, Heart, History, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import SEO from "@/components/SEO";

type Tab = "likes" | "history";

const PAGE_SIZE = 12;

export default function UserDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("likes");
  const queryClient = useQueryClient();
  
  // Pagination state
  const [likesPage, setLikesPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  
  // Replace manual state with React Query with pagination
  const { data: likesData, isLoading: likesLoading } = useQuery({
    queryKey: ['user', 'likes', likesPage],
    queryFn: () => apiClient.user.getLikes({ limit: PAGE_SIZE, offset: likesPage * PAGE_SIZE }),
    enabled: !!isSignedIn,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['user', 'history', historyPage],
    queryFn: () => apiClient.user.getHistory({ limit: PAGE_SIZE, offset: historyPage * PAGE_SIZE }),
    enabled: !!isSignedIn,
  });

  const likes = likesData?.likes || [];
  const likesTotal = likesData?.total || 0;
  const likesTotalPages = Math.ceil(likesTotal / PAGE_SIZE);
  
  const history = historyData?.history || [];
  const historyTotal = historyData?.total || 0;
  const historyTotalPages = Math.ceil(historyTotal / PAGE_SIZE);
  
  const loading = (activeTab === "likes" ? likesLoading : historyLoading);

  // Reset page when switching tabs
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Prefetch next page for smoother UX
  const prefetchNextPage = (tab: Tab, currentPage: number) => {
    if (tab === "likes" && currentPage + 1 < likesTotalPages) {
      queryClient.prefetchQuery({
        queryKey: ['user', 'likes', currentPage + 1],
        queryFn: () => apiClient.user.getLikes({ limit: PAGE_SIZE, offset: (currentPage + 1) * PAGE_SIZE }),
      });
    } else if (tab === "history" && currentPage + 1 < historyTotalPages) {
      queryClient.prefetchQuery({
        queryKey: ['user', 'history', currentPage + 1],
        queryFn: () => apiClient.user.getHistory({ limit: PAGE_SIZE, offset: (currentPage + 1) * PAGE_SIZE }),
      });
    }
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // Pagination Controls Component
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    total,
    onPrev, 
    onNext,
    tab
  }: { 
    currentPage: number; 
    totalPages: number; 
    total: number;
    onPrev: () => void; 
    onNext: () => void;
    tab: Tab;
  }) => {
    if (totalPages <= 1) return null;
    
    const start = currentPage * PAGE_SIZE + 1;
    const end = Math.min((currentPage + 1) * PAGE_SIZE, total);
    
    return (
      <div className="flex items-center justify-between pt-6 border-t border-neutral-100">
        <span className="text-sm text-neutral-500">
          Showing {start}–{end} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentPage === 0}
            className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-neutral-700 px-2">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => {
              onNext();
              prefetchNextPage(tab, currentPage + 1);
            }}
            disabled={currentPage >= totalPages - 1}
            className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 pt-24 px-4 sm:px-6">
      <SEO title="My Dashboard" description="Manage your downloads and favorites." />
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
              onClick={() => handleTabChange("likes")}
              className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                activeTab === "likes" 
                  ? "text-primary" 
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <Heart className={`w-4 h-4 ${activeTab === "likes" ? "fill-current" : ""}`} />
              My Favorites
              <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs">
                {likesTotal}
              </span>
              {activeTab === "likes" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => handleTabChange("history")}
              className={`pb-4 px-1 flex items-center gap-2 text-sm font-medium transition-colors relative ${
                activeTab === "history" 
                  ? "text-primary" 
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <History className="w-4 h-4" />
              Download History
              <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs">
                {historyTotal}
              </span>
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
                  <div className="space-y-6">
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
                    <PaginationControls
                      currentPage={likesPage}
                      totalPages={likesTotalPages}
                      total={likesTotal}
                      onPrev={() => setLikesPage(p => Math.max(0, p - 1))}
                      onNext={() => setLikesPage(p => Math.min(likesTotalPages - 1, p + 1))}
                      tab="likes"
                    />
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
                  <div className="space-y-6">
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
                    <PaginationControls
                      currentPage={historyPage}
                      totalPages={historyTotalPages}
                      total={historyTotal}
                      onPrev={() => setHistoryPage(p => Math.max(0, p - 1))}
                      onNext={() => setHistoryPage(p => Math.min(historyTotalPages - 1, p + 1))}
                      tab="history"
                    />
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
