import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/lib/auth";
import { ResourceCard, ResourceCardSkeleton, FilterBar, SearchBar, Button, StickyCTA } from "@/components/ui";
import { Gift, Sparkles, Send, ArrowUpDown, Filter, Search, X } from "lucide-react";
import SEO from "@/components/SEO";

// Mock data with real thumbnails
const mockAssets = [
  {
    id: "1",
    title: "Cozy Capybara",
    imageUrl: "/thumbnails/thumb_capybara_1766354990805.png",
    category: "Animals",
    skill: "Calm",
    tags: ["Animals", "Calm", "Trending"],
    isNew: true,
    isLocked: true,
  },
  {
    id: "2",
    title: "Ocean Whale",
    imageUrl: "/thumbnails/thumb_whale_1766355003894.png",
    category: "Animals",
    skill: "Focus",
    tags: ["Animals", "Ocean", "Focus"],
    isNew: false,
    isLocked: true,
  },
  {
    id: "3",
    title: "Friendly T-Rex",
    imageUrl: "/thumbnails/thumb_dinosaur_1766355016602.png",
    category: "Animals",
    skill: "Bold",
    tags: ["Animals", "Dinosaur", "Bold"],
    isNew: true,
    isLocked: true,
  },
  {
    id: "4",
    title: "Astronaut Cat",
    imageUrl: "/thumbnails/thumb_astronaut_cat_1766355051538.png",
    category: "Fantasy",
    skill: "Creative",
    tags: ["Fantasy", "Space", "Cats"],
    isNew: false,
    isLocked: true,
  },
  {
    id: "5",
    title: "Beautiful Butterfly",
    imageUrl: "/thumbnails/thumb_butterfly_1766355075205.png",
    category: "Nature",
    skill: "Calm",
    tags: ["Nature", "Calm", "Patterns"],
    isNew: false,
    isLocked: true,
  },
  {
    id: "6",
    title: "Magical Unicorn",
    imageUrl: "/thumbnails/thumb_unicorn_1766355087780.png",
    category: "Fantasy",
    skill: "Creative",
    tags: ["Fantasy", "Magic", "Trending"],
    isNew: true,
    isLocked: true,
  },
];

const categories = [
  { label: "Animals (120)", value: "Animals" },
  { label: "Fantasy (90)", value: "Fantasy" },
  { label: "Nature (85)", value: "Nature" },
  { label: "Vehicles (40)", value: "Vehicles" },
  { label: "Holidays (65)", value: "Holidays" },
];

const skills = [
  { label: "Calm", value: "Calm" },
  { label: "Focus", value: "Focus" },
  { label: "Bold", value: "Bold" },
  { label: "Creative", value: "Creative" },
];

// Free Sample Banner component - High contrast interstitial
function FreeSampleBanner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-secondary text-white rounded-2xl p-6 text-center shadow-lg transform transition-all animate-fade-in">
        <Sparkles className="w-8 h-8 text-yellow-300 mx-auto mb-3" strokeWidth={2} />
        <h3 className="font-serif text-xl font-bold mb-1">Check your inbox!</h3>
        <p className="text-white/80">Sent. Check your inbox (and Promotions).</p>
      </div>
    );
  }

  return (
    <div className="bg-secondary text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left: Text content */}
        <div className="flex items-center gap-4 text-center lg:text-left">
          <div className="bg-white/20 p-3 rounded-xl hidden lg:block backdrop-blur-sm">
             <Gift className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold mb-1">Try 3 Free Pages</h3>
            <p className="text-white/90 text-sm md:text-base">See the difference bold lines make. Sent in 1–2 minutes.</p>
          </div>
        </div>
        
        {/* Right: Form */}
        <form onSubmit={handleSubmit} className="w-full lg:w-auto flex flex-col gap-1">
          <label htmlFor="vault-email" className="block text-xs font-bold text-white/90 ml-1">Email address</label>
          <div className="flex flex-col sm:flex-row gap-2">
             <input
              id="vault-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mom@example.com"
              required
              aria-label="Email address for free sample pack"
              className="w-full sm:w-64 px-4 py-3 text-sm bg-white border border-transparent rounded-md text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-sm h-[48px]"
            />
            <Button 
              variant="primary" 
              size="lg" 
              type="submit" 
              className="w-full sm:w-auto whitespace-nowrap shadow-lg !bg-white !text-secondary hover:!bg-gray-50 border-none !rounded-md h-[48px]"
              rightIcon={<Send className="w-4 h-4" />}
            >
              Get 3 Free Pages
            </Button>
          </div>
          <p className="text-[10px] text-white/80 ml-1">No credit card. Sent in 1–2 minutes.</p>
        </form>
      </div>
    </div>
  );
}

export default function VaultPage() {
  const { isSubscriber } = useSubscription();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 150);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Simulate async filtering
  const handleSearch = (query: string) => {
    setIsLoading(true);
    setSearchQuery(query);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleCategoryChange = (value: string) => {
    setIsLoading(true);
    setSelectedCategory(value);
    setTimeout(() => setIsLoading(false), 200);
  };

  const handleSkillChange = (value: string) => {
    setIsLoading(true);
    setSelectedSkill(value);
    setTimeout(() => setIsLoading(false), 200);
  };

  // Define which assets are free samples (Mock logic)
  // In real app, this would be a property on the asset
  const freeSampleIds = ["1", "3", "5"]; // Capybara, T-Rex, Butterfly

  // Filter assets based on search, category, and skill
  const filteredAssets = useMemo(() => {
    return mockAssets.filter((asset) => {
      const matchesSearch = searchQuery === "" || 
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "" || asset.category === selectedCategory;
      const matchesSkill = selectedSkill === "" || asset.skill === selectedSkill;
      
      return matchesSearch && matchesCategory && matchesSkill;
    }).sort((a, b) => {
      if (sortBy === "newest") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      return 0; 
    });
  }, [searchQuery, selectedCategory, selectedSkill, sortBy]);

  const showFreeSampleBanner = !isSubscriber;

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title="The Vault | 500+ Coloring Pages | HuePress"
        description="Browse our curated collection of 500+ therapy-grade coloring pages. Bold lines, trending themes, instant PDF downloads."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-h1 text-ink mb-2">The Vault</h1>
          <p className="text-gray-500">500+ fridge-worthy designs, ready to print</p>
        </div>

        {/* Search Bar - improved placeholder */}
        <SearchBar onSearch={handleSearch} placeholder="Try 'Dinosaur', 'Space', or 'Calm'..." />

        {/* Filters - Horizontal Scroll on Mobile */}
        <div className="space-y-4 mb-8">
          <div className="flex overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap items-center gap-2 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Theme:</span>
            <FilterBar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
          <div className="flex overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap items-center gap-2 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Skill:</span>
            <FilterBar
              categories={skills}
              selectedCategory={selectedSkill}
              onCategoryChange={handleSkillChange}
            />
          </div>
        </div>

        {/* Sorting & Free Toggle */}
        <div className="flex items-center justify-between mb-6">


           <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm font-medium text-ink bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
              >
                 <option value="newest">Newest First</option>
                 <option value="popular">Most Popular</option>
                 <option value="calmest">Calmest</option>
              </select>
           </div>
        </div>

        {/* Clear filters button - only when filters are active */}
        {(searchQuery || selectedCategory || selectedSkill) && (
          <div className="mb-6">
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedSkill("");
              }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              ✕ Clear all filters
            </button>
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
              // Determine if free sample
              const isFreeSample = freeSampleIds.includes(asset.id);
              return (
              <React.Fragment key={asset.id}>
                 <ResourceCard
                    id={asset.id}
                    title={asset.title}
                    imageUrl={asset.imageUrl}
                    tags={asset.tags}
                    isLocked={!isSubscriber && !isFreeSample}
                    isNew={asset.isNew}

                  />
                  {/* Inject Banner after 4th item (approx row 1 on desktop, row 2 on mobile) */}
                  {showFreeSampleBanner && index === 3 && (
                    <div className="col-span-full py-4 lg:py-8">
                       <FreeSampleBanner />
                    </div>
                  )}
              </React.Fragment>
            )})}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-serif text-h3 text-ink mb-2">No designs found</h3>
            <p className="text-gray-500 mb-4">Try a different search or filter</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="text-sm text-gray-400">Popular:</span>
              {["Capybara", "Calm", "Animals", "Fantasy"].map(tag => (
                <button 
                  key={tag}
                  onClick={() => handleSearch(tag)}
                  className="text-sm text-primary hover:underline"
                >
                  {tag}
                </button>
              ))}
            </div>
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedSkill("");
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
                {!showMobileFilters && (selectedCategory || selectedSkill) && (
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
                      <option value="popular">Popular</option>
                      <option value="calmest">Calmest</option>
                  </select>
              </div>
          </div>

          {/* Expanded Mobile Filters */}
          {showMobileFilters && (
            <div className="pt-4 pb-2 space-y-4 animate-in slide-in-from-top-2">
              <div className="space-y-2">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Theme</p>
                 <div className="flex flex-wrap gap-2">
                   {categories.map(cat => (
                     <button
                       key={cat.value}
                       onClick={() => handleCategoryChange(selectedCategory === cat.value ? "" : cat.value)}
                       className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                         selectedCategory === cat.value 
                           ? "bg-ink text-white border-ink" 
                           : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                       }`}
                     >
                       {cat.value}
                     </button>
                   ))}
                 </div>
              </div>
              <div className="space-y-2">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Skill</p>
                 <div className="flex flex-wrap gap-2">
                   {skills.map(skill => (
                     <button
                       key={skill.value}
                       onClick={() => handleSkillChange(selectedSkill === skill.value ? "" : skill.value)}
                       className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                         selectedSkill === skill.value 
                           ? "bg-ink text-white border-ink" 
                           : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                       }`}
                     >
                       {skill.value}
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <StickyCTA />
    </div>
  );
}
