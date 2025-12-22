import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, ResourceCard } from "@/components/ui";
import SEO from "@/components/SEO";
import { 
  Sparkles, 
  Leaf, 
  Zap, 
  Palette,
  Ban,
  Frown,
  Puzzle,
  Gift,
  CreditCard,
  Printer,
  Heart
} from "lucide-react";

// Featured items with real thumbnails
const featuredItems = [
  { id: "1", title: "Cozy Capybara", imageUrl: "/thumbnails/thumb_capybara_1766354990805.png", tags: ["Animals", "Calm"], isNew: true },
  { id: "2", title: "Ocean Whale", imageUrl: "/thumbnails/thumb_whale_1766355003894.png", tags: ["Animals", "Focus"], isNew: false },
  { id: "3", title: "Friendly T-Rex", imageUrl: "/thumbnails/thumb_dinosaur_1766355016602.png", tags: ["Animals", "Bold"], isNew: true },
  { id: "4", title: "Astronaut Cat", imageUrl: "/thumbnails/thumb_astronaut_cat_1766355051538.png", tags: ["Fantasy", "Creative"], isNew: false },
  { id: "5", title: "Beautiful Butterfly", imageUrl: "/thumbnails/thumb_butterfly_1766355075205.png", tags: ["Nature", "Calm"], isNew: false },
  { id: "6", title: "Magical Unicorn", imageUrl: "/thumbnails/thumb_unicorn_1766355087780.png", tags: ["Fantasy", "Creative"], isNew: true },
];

// Value propositions with Lucide icons
const features = [
  { 
    title: "Therapy-Grade Quality", 
    description: "Bold, thick lines designed for fine motor development. Trusted by OTs and therapists.", 
    icon: Sparkles 
  },
  { 
    title: "Zero Ads, Zero Clutter", 
    description: "A calm, focused experience. No pop-ups, no distractions—just beautiful art.", 
    icon: Leaf 
  },
  { 
    title: "Instant Downloads", 
    description: "High-res vector PDFs ready to print in seconds. No waiting, no watermarks.", 
    icon: Zap 
  },
  { 
    title: "Fresh Drops Weekly", 
    description: "New designs every Sunday. Stay inspired with trendy themes your kids will love.", 
    icon: Palette 
  },
];

// Pain points
const painPoints = [
  { 
    title: "Ad Overload", 
    description: "Pop-ups, redirects, and auto-play videos. Just to print one page.",
    icon: Ban
  },
  { 
    title: "Ugly Designs", 
    description: "Pixelated clip art from 2005. Would you put that on your fridge?",
    icon: Frown
  },
  { 
    title: "Too Complex", 
    description: "Tiny lines that frustrate little hands and waste printer ink.",
    icon: Puzzle
  },
];

function FreeSampleCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with email service
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-accent border border-primary/20 rounded-xl p-4 text-center">
        <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-primary font-medium">Check your inbox!</p>
        <p className="text-gray-500 text-sm">Your free sample pack is on its way.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
      />
      <Button variant="outline" type="submit" className="whitespace-nowrap">
        <Gift className="w-4 h-4" />
        Get 3 Free Pages
      </Button>
    </form>
  );
}

export default function HomePage() {
  return (
    <>
      <SEO />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-accent via-white to-accent overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-success/10 text-success-dark px-3 py-1 rounded-full text-sm font-bold mb-6">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Therapist Approved
              </div>
              <h1 className="font-serif text-display lg:text-5xl text-ink mb-6">
                From "I'm bored" to{" "}
                <span className="text-secondary">printing in 60 seconds</span>
              </h1>
              <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto lg:mx-0">
                No ads, no pixels, just bold vector art. Therapy-grade coloring pages 
                that spark joy and calm the chaos—ready for your printer right now.
              </p>
              
              {/* Primary CTAs */}
              {/* Primary CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link to="/vault">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                    Explore The Vault
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-2 hover:bg-gray-50">
                    Join the Club
                  </Button>
                </Link>
              </div>

              {/* Trust/Social Proof - replacing the cluttered form */}
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                 <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_mom_1.png" alt="Happy Mom" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_dad_1.png" alt="Happy Dad" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_teacher_1.png" alt="Teacher" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_mom_2.png" alt="Happy Mom" className="w-full h-full object-cover" />
                    </div>
                 </div>
                 <p>Join <strong className="text-ink">500+ parents</strong> printing today.</p>
              </div>


            </div>

            {/* Right: Hero Image - Real thumbnails on white paper */}
            <div className="relative">
                <div className="relative rounded-2xl shadow-xl overflow-hidden border border-gray-100 rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img 
                    src="/hero_lifestyle.png" 
                    alt="Child coloring a HuePress page with markers"
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle overlay to blend if needed */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl"></div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Sample - Minimal Strip (Lead Gen) */}
      <section className="bg-white border-b border-gray-100 py-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="bg-accent/30 border border-primary/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 text-center md:text-left">
              <div className="flex-1">
                 <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Gift className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-ink text-lg">Try before you buy</h3>
                 </div>
                 <p className="text-gray-500">Get 3 free therapist-approved pages sent straight to your inbox.</p>
              </div>
              <div className="w-full md:w-auto">
                 <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <FreeSampleCapture />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* How It Works - Bold Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-h2 text-ink text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-accent rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-ink text-lg mb-2">1. Join the Club</h3>
              <p className="text-gray-500 text-sm">$5/mo for unlimited access. Cancel anytime, no questions.</p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-accent rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Printer className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-ink text-lg mb-2">2. Pick & Print</h3>
              <p className="text-gray-500 text-sm">Download any PDF. Hit print. Done in 60 seconds.</p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-accent rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-ink rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-ink text-lg mb-2">3. Enjoy the Calm</h3>
              <p className="text-gray-500 text-sm">Kids color happily. You get a peaceful moment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Agitation Section */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-h1 text-ink mb-6">
            Tired of Chaotic Clip Art?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            We get it. You search "free coloring pages" and get bombarded with ads, 
            broken links, and designs so cluttered they give you a headache. 
            Your kids deserve better. <span className="font-bold text-ink">So do you.</span>
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {painPoints.map((point) => (
              <div key={point.title} className="p-6 bg-white rounded-xl border-2 border-secondary/20 shadow-sm">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <point.icon className="w-6 h-6 text-secondary" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-ink mb-2">{point.title}</h3>
                <p className="text-sm text-gray-500">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-20 bg-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-h1 text-ink mb-4">Why Parents Love HuePress</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">We obsess over quality so you can focus on quality time.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <feature.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="font-bold text-ink mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vault Preview - Real thumbnails */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-h1 text-ink mb-4">Peek Inside The Vault</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Over 500 bold, curated designs across trending themes. New drops every Sunday.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
            {featuredItems.map((item) => (
              <ResourceCard
                key={item.id}
                id={item.id}
                title={item.title}
                imageUrl={item.imageUrl}
                tags={item.tags}
                isLocked={true}
                isNew={item.isNew}
              />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/vault">
              <Button variant="primary" size="lg">View All Designs →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-primary to-primary-hover text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-h1 mb-4">Ready for Fridge-Worthy Art?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Join The Club for $5/month and unlock unlimited downloads. Less than a latte for endless quiet time activities.
          </p>
          <Link to="/pricing">
            <Button variant="secondary" size="lg">Join the Club</Button>
          </Link>
          <p className="mt-4 text-sm text-white/60">$5/mo, cancel anytime. No questions asked.</p>
        </div>
      </section>
    </>
  );
}
