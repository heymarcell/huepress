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
  { label: "Animals", value: "Animals" },
  { label: "Fantasy", value: "Fantasy" },
  { label: "Nature", value: "Nature" },
  { label: "Vehicles", value: "Vehicles" },
  { label: "Holidays", value: "Holidays" },
];

const skills = [
  { label: "Calm", value: "Calm" },
  { label: "Focus", value: "Focus" },
  { label: "Bold", value: "Bold" },
  { label: "Creative", value: "Creative" },
];

// Free Sample Card component
function FreeSampleCard() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-accent border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
        <Sparkles className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
        <p className="font-bold text-primary">Check your inbox!</p>
        <p className="text-sm text-gray-500">3 free pages on the way.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-dashed border-primary/30 rounded-xl p-4 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
      <Gift className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
      <h3 className="font-serif font-bold text-ink mb-1">Free Sample Pack</h3>
      <p className="text-xs text-gray-500 mb-4">Try 3 pages free, no credit card</p>
      <form onSubmit={handleSubmit} className="w-full space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
        />
        <Button variant="primary" size="sm" className="w-full" type="submit">
          Get Free Pages
        </Button>
      </form>
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

  const showFreeSampleCard = !isSubscriber && !searchQuery && !selectedCategory && !selectedSkill;

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

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {isLoading ? "Searching..." : `${filteredAssets.length} designs`}
          </p>
          {(searchQuery || selectedCategory || selectedSkill) && (
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
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Pinned Free Sample Card */}
            {showFreeSampleCard && <FreeSampleCard />}
            
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
