import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSubscription } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { Asset, Tag } from "@/api/types";
import { ResourceCard, ResourceCardSkeleton, SearchBar, Button, Heading, Combobox } from "@/components/ui";
import { ArrowUpDown, Filter, Search, X } from "lucide-react";
import SEO from "@/components/SEO";
import { useDebounce } from "@/hooks/useDebounce";

import { FreeSampleBanner } from "@/components/features/FreeSampleBanner";



export default function VaultPage() {
  const { isSubscriber } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<Record<string, Tag[]>>({});
  
  // Filter States - Initialize from URL query params
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedSkill, setSelectedSkill] = useState(searchParams.get("skill") || "");
  const [selectedTag, setSelectedTag] = useState(searchParams.get("tag") || ""); // General tag filter (Theme/Age)
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSkill) params.set("skill", selectedSkill);
    if (selectedTag) params.set("tag", selectedTag);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (sortBy && sortBy !== "newest") params.set("sort", sortBy);
    
    setSearchParams(params, { replace: true });
  }, [selectedCategory, selectedSkill, selectedTag, debouncedSearch, sortBy, setSearchParams]);

  // Fetch Tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await apiClient.tags.list();
        setTags(data.grouped);
      } catch (err) {
        console.error("Failed to load tags", err);
      }
    };
    fetchTags();
  }, []);

  // Fetch Assets when filters change
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.assets.list({
            category: selectedCategory || undefined,
            skill: selectedSkill || undefined,
            tag: selectedTag || undefined,
            search: debouncedSearch || undefined,
            limit: 100 
        });
        setAssets(data.assets || []);
      } catch (err) {
        console.error("Failed to load assets", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [selectedCategory, selectedSkill, selectedTag, debouncedSearch]);


  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredAssets = useMemo(() => {
    // Client-side sorting only (Search is server-side now)
    return [...assets].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // oldest
    });
  }, [assets, sortBy]);

  const showFreeSampleBanner = !isSubscriber;


  // assets.category column stores "Animals".
  // So value should be t.name!
  // Same for skill.
  const categoriesUI = (tags.category || []).map(t => ({ label: t.name, value: t.name }));
  const skillsUI = (tags.skill || []).map(t => ({ label: t.name, value: t.name }));
  const themesUI = (tags.theme || []).map(t => ({ label: t.name, value: t.name }));

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
          <p className="text-gray-500">500+ fridge-worthy designs, ready to print</p>
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
            {(selectedCategory || selectedSkill || selectedTag) && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${showMobileFilters ? 'bg-white/20' : 'bg-primary text-white'}`}>
                {[selectedCategory, selectedSkill, selectedTag].filter(Boolean).length}
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
          {selectedTag && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
              {selectedTag}
              <button onClick={() => setSelectedTag("")} className="hover:bg-primary/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedSkill && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
              {selectedSkill}
              <button onClick={() => setSelectedSkill("")} className="hover:bg-primary/20 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          
          {(selectedCategory || selectedSkill || selectedTag) && (
            <button 
              onClick={() => {
                setSelectedCategory("");
                setSelectedSkill("");
                setSelectedTag("");
              }}
              className="text-sm text-gray-500 hover:text-primary"
            >
              Clear all
            </button>
          )}
          
          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-200" />
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm font-medium text-ink bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>
        
        {/* Collapsible Filter Panel */}
        {showMobileFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6 animate-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Categories</option>
                  {categoriesUI.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Theme */}
              {themesUI.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <Combobox
                    label="Theme"
                    value={selectedTag}
                    onChange={(val) => setSelectedTag(val)}
                    options={[{ label: "All Themes", value: "" }, ...themesUI]}
                    placeholder="All Themes"
                  />
                </div>
              )}
              
              {/* Skill */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Levels</option>
                  {skillsUI.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
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
                setSelectedTag("");
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
                {!showMobileFilters && (selectedCategory || selectedSkill || selectedTag) && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-secondary border-2 border-white rounded-full" />
                )}
            </button>
            
            {/* Sort (Simplified) */}
              <div className="flex items-center">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm font-medium text-ink bg-transparent border-none outline-none focus:ring-0 cursor-pointer max-w-[80px]"
                  >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                  </select>
              </div>
          </div>

          {/* Active filter chips - compact summary */}
          {(selectedCategory || selectedSkill || selectedTag) && (
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory("")} className="hover:bg-primary/20 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                  {selectedTag}
                  <button onClick={() => setSelectedTag("")} className="hover:bg-primary/20 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
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
