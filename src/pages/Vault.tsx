import React, { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSubscription } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { ResourceCard, ResourceCardSkeleton, SearchBar, Button, Heading, Combobox } from "@/components/ui";
import { ArrowUpDown, Filter, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import SEO from "@/components/SEO";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";

import { FreeSampleBanner } from "@/components/features/FreeSampleBanner";

const PAGE_SIZE = 24;

export default function VaultPage() {
  const { isSubscriber } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Filter States - Initialize from URL query params
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSkill, setSelectedSkill] = useState(searchParams.get("skill") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tag") ? searchParams.get("tag")!.split(",").filter(Boolean) : []
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchQuery, 500);
  
  // Pagination state - Initialize from URL
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") || "1");
    return Math.max(1, p) - 1; // Convert to 0-indexed
  });

  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync scroll listener
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(0);
  }, [selectedCategory, selectedSkill, selectedTags, debouncedSearch]);

  // Sync filters to URL
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSkill) params.set("skill", selectedSkill);
    if (selectedTags.length > 0) params.set("tag", selectedTags.join(","));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (sortBy && sortBy !== "newest") params.set("sort", sortBy);
    if (page > 0) params.set("page", (page + 1).toString());
    
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedSkill, selectedTags, debouncedSearch, sortBy, page, setSearchParams]);

  // Query: Tags
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.tags.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const tags = tagsData?.grouped || {};

  // Query: Assets with pagination
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['assets', { selectedCategory, selectedSkill, selectedTags, debouncedSearch, page }],
    queryFn: () => apiClient.assets.list({
      category: selectedCategory || undefined,
      skill: selectedSkill || undefined,
      tag: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE
    }),
    placeholderData: keepPreviousData,
  });

  const totalAssets = assetsData?.total || 0;
  const totalPages = Math.ceil(totalAssets / PAGE_SIZE);

  // Prefetch next page
  React.useEffect(() => {
    if (page + 1 < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['assets', { selectedCategory, selectedSkill, selectedTags, debouncedSearch, page: page + 1 }],
        queryFn: () => apiClient.assets.list({
          category: selectedCategory || undefined,
          skill: selectedSkill || undefined,
          tag: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
          search: debouncedSearch || undefined,
          limit: PAGE_SIZE,
          offset: (page + 1) * PAGE_SIZE
        }),
      });
    }
  }, [page, totalPages, selectedCategory, selectedSkill, selectedTags, debouncedSearch, queryClient]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredAssets = useMemo(() => {
    const assets = assetsData?.assets || [];
    // Client-side sorting only (Search is server-side now)
    return [...assets].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // oldest
    });
  }, [assetsData?.assets, sortBy]);

  const showFreeSampleBanner = !isSubscriber && page === 0;

  // assets.category column stores "Animals".
  // So value should be t.name!
  // Same for skill.
  const categoriesUI = (tags.category || []).map(t => ({ label: t.name, value: t.name }));
  const skillsUI = (tags.skill || []).map(t => ({ label: t.name, value: t.name }));
  const themesUI = (tags.theme || []).map(t => ({ label: t.name, value: t.name }));

  // Pagination Controls
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, totalAssets);
    
    return (
      <div className="flex items-center justify-between py-6 border-t border-gray-200 mt-8">
        <span className="text-sm text-gray-500">
          Showing {start}–{end} of {totalAssets} designs
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPage(p => Math.max(0, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page === 0}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-gray-700 px-3">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => {
              setPage(p => Math.min(totalPages - 1, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title="The Vault | 500+ Coloring Pages | HuePress"
        description="Browse our curated collection of 500+ therapy-grade coloring pages. Bold lines, trending themes, instant PDF downloads."
        keywords="coloring pages, bold lines, therapy grade, printable pdf, autism friendly, adhd friendly"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Heading as="h1" variant="h1" className="mb-2">The Vault</Heading>
          <p className="text-gray-500">{totalAssets > 0 ? `${totalAssets} fridge-worthy designs, ready to print` : '500+ fridge-worthy designs, ready to print'}</p>
        </div>

        {/* Search Bar - Centered with max width */}
        <div className="max-w-2xl mx-auto mb-6">
          <SearchBar onSearch={handleSearch} placeholder="Search designs..." />
        </div>
        
        {/* Filter Controls Row - Centered */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {/* Filter Button */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              showMobileFilters 
                ? 'bg-primary text-white border-primary' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {(selectedCategory || selectedSkill || selectedTags.length > 0) && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${showMobileFilters ? 'bg-white/20' : 'bg-primary text-white'}`}>
                {([selectedCategory, selectedSkill].filter(Boolean).length + selectedTags.length)}
              </span>
            )}
          </button>
          
          {/* Applied Filter Chips */}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
              {selectedCategory}
              <button onClick={() => setSelectedCategory("")} className="hover:bg-primary/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedTags.length > 0 && selectedTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
              {tag}
              <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="hover:bg-primary/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {selectedSkill && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
              {selectedSkill}
              <button onClick={() => setSelectedSkill("")} className="hover:bg-primary/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {(selectedCategory || selectedSkill || selectedTags.length > 0) && (
            <button 
              onClick={() => {
                setSelectedCategory("");
                setSelectedSkill("");
                setSelectedTags([]);
              }}
              className="text-sm text-gray-500 hover:text-primary"
            >
              Clear all
            </button>
          )}
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-200" />
          
          {/* Sort Dropdown */}
          {/* Sort Toggle Button */}
          <button
            onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-ink hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <span>{sortBy === "newest" ? "Newest" : "Oldest"}</span>
          </button>
        </div>
        
        {/* Collapsible Filter Panel */}
        {showMobileFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6 animate-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <Combobox
                    value={selectedCategory}
                    onChange={(val) => setSelectedCategory(Array.isArray(val) ? val[0] || "" : val)}
                    options={[{ label: "All Categories", value: "" }, ...categoriesUI]}
                    placeholder="All Categories"
                    className="w-full"
                  />
              </div>
              
              {/* Tag (was Theme) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                <Combobox
                  value={selectedTags}
                  onChange={(val: string | string[]) => setSelectedTags(Array.isArray(val) ? val : [val])}
                  options={themesUI}
                  placeholder="Select Tags"
                  className="w-full"
                  multiple={true}
                />
              </div>
              
              {/* Skill */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                  <Combobox
                    value={selectedSkill}
                    onChange={(val) => setSelectedSkill(Array.isArray(val) ? val[0] || "" : val)}
                    options={[{ label: "All Levels", value: "" }, ...skillsUI]}
                    placeholder="All Levels"
                    className="w-full"
                  />
              </div>
            </div>
          </div>
        )}

      {/* Grid with Injected Banner */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAssets.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-8">
              {/* Resource Cards with Banner Injection */}
              {filteredAssets.map((asset, index) => {
                // TODO: Determine if free sample from asset property
                const isFreeSample = false; 
                return (
                <React.Fragment key={asset.id}>
                   <ResourceCard
                      id={asset.id}
                      title={asset.title}
                      imageUrl={asset.image_url}
                      tags={asset.tags}
                      isLocked={!isSubscriber && !isFreeSample}
                      isNew={asset.status === 'published' && new Date(asset.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)} // Logic for isNew? Asset missing isNew prop in interface unless I add it or compute it
                      slug={asset.slug}
                      assetId={asset.asset_id}
                    />
                    {/* Inject Banner after 4th item (approx row 1 on desktop, row 2 on mobile) */}
                    {showFreeSampleBanner && index === 3 && (
                      <div className="col-span-full py-4 lg:py-8">
                         <FreeSampleBanner className="rounded-[32px] border-none ring-1 ring-secondary/10 bg-secondary/5 shadow-sm py-10 overflow-hidden" />
                      </div>
                    )}
                </React.Fragment>
              )})}
            </div>
            <PaginationControls />
          </>
        ) : (
          <div className="text-center py-16">
            <img src="/404-robot.svg" alt="No designs found" className="w-48 h-48 mx-auto mb-6" />
            <h3 className="font-serif text-h3 text-ink mb-2">No designs found</h3>
            <p className="text-gray-500 mb-4">Try a different search or filter</p>
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedSkill("");
                setSelectedTags([]);
              }}
              className="text-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Bottom CTA - Hide for subscribers */}
        {!isSubscriber && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 mb-4">Ready to unlock the full vault?</p>
            <div className="flex flex-col items-center gap-2">
              <Link to="/pricing">
                <Button variant="primary" size="lg">Join for instant downloads</Button>
              </Link>
              <p className="text-sm text-gray-400">Just $5/mo, cancel anytime</p>
            </div>
          </div>
        )}

        {/* SEO Content Block */}
        <div className="mt-16 pt-16 border-t border-gray-200 text-center max-w-3xl mx-auto">
          <h2 className="font-serif text-lg font-bold text-ink mb-4">Therapy-Grade Coloring Pages for Motor Skills & Calm</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            HuePress provides high-quality, bold and easy printable art designed specifically for children. 
            Our collection focuses on fine motor skills coloring, anxiety relief, and creative expression without the frustration of complex patterns.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            Trusted by parents, teachers, and occupational therapists, our library offers safe, ad-free downloads 
            perfect for quiet time, classroom activities, and therapeutic sessions. Join the club to unlock unlimited access.
          </p>
        </div>
        
        {/* Bottom Spacer for Sticky CTA */}
        <div className="h-24 md:h-0" />
      </div>

      {/* Sticky Collapsed Header */}
      <div 
        className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-sm transform transition-transform duration-300 ${
          isScrolled ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Compact Search */}
            <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:ring-1 focus:ring-primary"
                />
            </div>
            
            {/* Filter Trigger */}
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`p-2 rounded-full text-ink hover:bg-gray-200 relative transition-colors ${showMobileFilters ? "bg-secondary text-white hover:bg-secondary/90" : "bg-gray-100"}`}
            >
                {showMobileFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
                {/* Dot if filters active */}
                {!showMobileFilters && (selectedCategory || selectedSkill || selectedTags.length > 0) && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-secondary border-2 border-white rounded-full" />
                )}
            </button>
            
            {/* Sort (Simplified) */}
            {/* Sort (Simplified Toggle) */}
              <button
                onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink hover:bg-gray-100 rounded-lg transition-colors"
              >
                  <ArrowUpDown className="w-4 h-4 text-gray-500" />
                  <span className="hidden sm:inline">{sortBy === "newest" ? "Newest" : "Oldest"}</span>
              </button>
          </div>

          {/* Active filter chips - compact summary */}
          {(selectedCategory || selectedSkill || selectedTags.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory("")} className="hover:bg-primary/20 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedTags.length > 0 && selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {tag}
                  <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="hover:bg-primary/20 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedSkill && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {selectedSkill}
                  <button onClick={() => setSelectedSkill("")} className="hover:bg-primary/20 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
