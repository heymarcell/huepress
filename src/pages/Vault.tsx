import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/lib/auth";
import { ResourceCard, ResourceCardSkeleton, FilterBar, SearchBar, Button } from "@/components/ui";
import { Gift, Sparkles } from "lucide-react";
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

// Free Sample Banner component - Horizontal layout for above-grid placement
function FreeSampleBanner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-accent border border-primary/20 rounded-xl p-4 mb-6 flex items-center justify-center gap-3">
        <Sparkles className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.5} />
        <p className="text-primary font-medium">Check your inbox! 3 free pages on the way.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border border-primary/20 rounded-xl p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Text content */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <Gift className="w-8 h-8 text-primary flex-shrink-0 hidden sm:block" strokeWidth={1.5} />
          <div>
            <h3 className="font-serif font-bold text-ink">Try before you join?</h3>
            <p className="text-sm text-gray-500">Get 3 free coloring pages sent to your inbox.</p>
          </div>
        </div>
        
        {/* Right: Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <label htmlFor="vault-email" className="sr-only">Email Address</label>
          <input
            id="vault-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-label="Email address for free sample pack"
            className="flex-1 sm:w-64 px-4 py-2.5 text-sm border border-gray-200 rounded-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white"
          />
          <Button variant="primary" size="sm" type="submit" className="whitespace-nowrap">
            <Gift className="w-4 h-4" />
            Send Free Pages
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function VaultPage() {
  const { isSubscriber } = useSubscription();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Filter assets based on search, category, and skill
  const filteredAssets = useMemo(() => {
    return mockAssets.filter((asset) => {
      const matchesSearch = searchQuery === "" || 
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "" || asset.category === selectedCategory;
      const matchesSkill = selectedSkill === "" || asset.skill === selectedSkill;
      return matchesSearch && matchesCategory && matchesSkill;
    });
  }, [searchQuery, selectedCategory, selectedSkill]);

  const showFreeSampleBanner = !isSubscriber && !searchQuery && !selectedCategory && !selectedSkill;

  return (
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title="The Vault | 500+ Coloring Pages | HuePress"
        description="Browse our curated collection of 500+ therapy-grade coloring pages. Bold lines, trending themes, instant PDF downloads."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-h1 text-ink mb-2">The Vault</h1>
          <p className="text-gray-500">500+ fridge-worthy designs, ready to print</p>
        </div>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} />

        {/* Filters */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Theme:</span>
            <FilterBar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Skill:</span>
            <FilterBar
              categories={skills}
              selectedCategory={selectedSkill}
              onCategoryChange={handleSkillChange}
            />
          </div>
        </div>

        {/* Clear filters button - only when filters are active */}
        {(searchQuery || selectedCategory || selectedSkill) && (
          <div className="mb-4">
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("");
                setSelectedSkill("");
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Free Sample Banner - Above grid for non-subscribers */}
        {showFreeSampleBanner && <FreeSampleBanner />}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Resource Cards */}
            {filteredAssets.map((asset) => (
              <ResourceCard
                key={asset.id}
                id={asset.id}
                title={asset.title}
                imageUrl={asset.imageUrl}
                tags={asset.tags}
                isLocked={!isSubscriber}
                isNew={asset.isNew}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
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
            <Link to="/pricing">
              <Button variant="primary" size="lg">Join the Club — $5/mo</Button>
            </Link>
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
      </div>
    </div>
  );
}
