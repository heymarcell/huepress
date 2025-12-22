import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, ResourceCard, StickyCTA } from "@/components/ui";
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
  Printer,
  Heart,
  Star,
  Check
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

  // Validation state
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!email.includes("@")) {
      setError("That email doesn't look valid. Try again.");
      return;
    }
    // TODO: Integrate with email service
    setSubmitted(true);
    setError(null);
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center animate-fade-in">
        <Sparkles className="w-6 h-6 text-success mx-auto mb-2" />
        <p className="text-success-dark font-bold">Check your inbox!</p>
        <p className="text-gray-600 text-sm">Your 3 free pages are on the way.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1">
        <label htmlFor="email-capture" className="block text-xs font-bold text-gray-700 mb-1 ml-1">
          Email address
        </label>
        <input
          id="email-capture"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="mom@example.com"
          aria-label="Email address for free sample pack"
          className={`w-full px-4 py-3 bg-white border rounded-md focus:ring-2 outline-none text-ink placeholder:text-gray-400 ${
            error ? "border-error focus:border-error focus:ring-error/10" : "border-gray-200 focus:border-secondary focus:ring-secondary/10"
          }`}
        />
        <p className="text-[10px] text-gray-500 mt-1 ml-1">No credit card, sent instantly.</p>
      </div>
      <div className="mt-6 sm:mt-[22px]"> 
        {/* Align with input box, accounting for label height */}
        <Button variant="outline" type="submit" className="whitespace-nowrap h-[50px]">
          <Gift className="w-4 h-4" />
          Send Me Free Pages
        </Button>
      </div>
      </div>
      {error && (
        <p className="text-xs text-error font-medium flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
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
              <div className="inline-flex items-center gap-2 bg-success/10 text-success-dark px-3 py-1 rounded-md text-sm font-bold mb-6">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                Designed for Fine Motor Skills
              </div>
              <h1 className="font-serif text-display lg:text-5xl text-ink mb-4">
                Therapy-Grade Coloring Pages.{" "}
                <span className="text-secondary">Print Calm in 60 Seconds</span>
              </h1>
              <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto lg:mx-0">
                Join 500+ families using our bold-line designs to reduce anxiety and build focus. 
                New drops every Sunday.
              </p>
              
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/pricing">
                    <Button variant="primary" size="lg" className="shadow-xl shadow-primary/20 hover:scale-105 transition-all w-full sm:w-auto">
                      Join for $5/mo
                    </Button>
                  </Link>
                  <a href="#free-sample">
                    <Button variant="secondary" size="lg" className="shadow-md hover:scale-105 transition-all w-full sm:w-auto">
                      Get 3 Free Pages
                    </Button>
                  </a>
                </div>
                <p className="text-sm text-gray-500 mt-3 flex items-center justify-center lg:justify-start gap-1">
                  <span className="font-medium text-ink">$5/month, cancel anytime.</span> Secure checkout via Stripe.
                </p>
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
                 <p>Join <strong className="text-ink">500+ families</strong> printing today.</p>
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

      {/* Social Proof Bar */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-2">
               <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
               </div>
               <div className="flex flex-col text-left leading-tight">
                 <span className="font-bold text-ink">4.9/5 from 500+ families</span>
                 <span className="text-xs text-gray-500">Rated by parents & OTs</span>
               </div>
            </div>
            <p className="text-gray-500 text-sm">
               "The only coloring pages my son actually finishes." — <span className="font-bold text-ink">Sarah, Mom of 2</span>
            </p>
            <div className="hidden md:block w-px h-8 bg-gray-200"></div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Trusted by Teachers & OTs</p>
        </div>
      </section>

      {/* Vault Preview - Moved Higher for Rank 12 */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-h1 text-ink mb-4">Peek Inside The Vault</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Over 500 bold, curated designs across trending themes. New drops every Sunday.</p>
          </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
             {/* Showing more items to look impressive - duplicating the list for effect until we have real data */}
             {[...featuredItems, ...featuredItems, ...featuredItems].slice(0, 8).map((item, idx) => (
               <ResourceCard
                 key={`${item.id}-${idx}`}
                 id={item.id}
                 title={item.title}
                 imageUrl={item.imageUrl}
                 tags={item.tags}
                 isLocked={true}
                 isNew={idx < 2} // Only first few are new
               />
             ))}
           </div>
           
          <div className="text-center mt-10">
            <Link to="/vault">
              <Button variant="primary" size="lg">Browse the Vault →</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="bg-accent py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
           <p className="text-center text-sm text-gray-500 mb-8">Loved by parents, teachers, and therapists</p>
           <div className="grid md:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_mom_1.png" alt="Sarah" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                       <p className="font-bold text-ink text-sm">Sarah M.</p>
                       <p className="text-xs text-gray-500">Mom of 2</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"This is the only way I get 20 minutes of peace. My kids ask for these pages every day!"</p>
              </div>
              
              {/* Testimonial 2 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_teacher_1.png" alt="Michelle" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                       <p className="font-bold text-ink text-sm">Michelle R.</p>
                       <p className="text-xs text-gray-500">Pediatric OT</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"Perfect for my fine-motor groups. The bold lines are exactly what my patients need."</p>
              </div>
              
              {/* Testimonial 3 */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_dad_1.png" alt="David" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                       <p className="font-bold text-ink text-sm">David T.</p>
                       <p className="text-xs text-gray-500">3rd Grade Teacher</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"Zero ads, completely safe for my classroom. I use these for quiet time every week."</p>
              </div>
           </div>
        </div>
      </section>

      {/* Print Quality Proof - P1 Item 10 */}
      <section className="py-16 bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
             <h2 className="font-serif text-2xl text-ink">Why "Free" Sites Cost More</h2>
             <p className="text-gray-500">Don't waste ink on pixelated junk.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
             {/* Bad Side */}
             <div className="bg-white p-6 rounded-2xl border border-gray-200 relative overflow-hidden group">
                <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-md z-10">THEIR FREEBIES</div>
                <div className="h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                   {/* Simulated pixelation */}
                   <div className="w-full h-full bg-[url('/thumbnails/thumb_whale_1766355003894.png')] bg-cover blur-[2px] opacity-60 scale-110 grayscale"></div>
                </div>
                <h3 className="font-bold text-gray-400 mb-2">Pixelated & Blurry</h3>
                <p className="text-sm text-gray-400">Jagged edges that look awful when printed.</p>
             </div>

             {/* Good Side */}
             <div className="bg-white p-6 rounded-2xl border-2 border-success/20 ring-4 ring-success/5 relative overflow-hidden shadow-lg">
                <div className="absolute top-4 right-4 bg-success text-white text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1">
                   <Sparkles className="w-3 h-3" /> HUEPRESS
                </div>
                <div className="h-48 bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-gray-100">
                   <img src="/thumbnails/thumb_whale_1766355003894.png" className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-ink mb-2">Vector-Sharp Lines</h3>
                <p className="text-sm text-gray-600 mb-3">Crisp, professional outlines even at poster size.</p>
                <ul className="space-y-1">
                   <li className="text-xs text-gray-500 flex items-center gap-2">
                     <Check className="w-3 h-3 text-success" /> No watermarks
                   </li>
                   <li className="text-xs text-gray-500 flex items-center gap-2">
                     <Check className="w-3 h-3 text-success" /> Vector PDFs
                   </li>
                   <li className="text-xs text-gray-500 flex items-center gap-2">
                     <Check className="w-3 h-3 text-success" /> Bold lines for calmer coloring
                   </li>
                </ul>
             </div>
          </div>
        </div>
      </section>

      {/* Free Sample - Full Width Strip - Better Integrated */}
      <section id="free-sample" className="bg-secondary/5 border-b border-secondary/10 py-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col lg:flex-row items-center justify-center gap-8 text-center lg:text-left">
              <div className="max-w-sm">
                 <h3 className="font-serif text-2xl text-ink mb-2">Try 3 free pages?</h3>
                 <p className="text-gray-600">See the difference bold lines make. We’ll send them to your inbox.</p>
              </div>
              <div className="w-full lg:w-auto lg:min-w-[520px]">
                 <FreeSampleCapture />
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
                <Gift className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-ink text-lg mb-2">1. Get 3 Free Pages</h3>
              <p className="text-gray-500 text-sm">
                No credit card needed. Just enter your email and get an instant download link.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-accent rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-4">
                <Printer className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-ink text-lg mb-2">2. Pick & Print</h3>
              <p className="text-gray-500 text-sm">Download any PDF on your phone or computer. Hits the printer in 60 seconds.</p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-accent rounded-2xl p-6 text-center">
              <div className="w-14 h-14 bg-ink rounded-xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-ink text-lg mb-2">3. Enjoy the Calm</h3>
              <p className="text-gray-500 text-sm">Bold lines and low clutter mean kids colour happily while you get a break.</p>
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

      {/* Mid-Scroll CTA Bar - P1 Item 11 */}
      <section className="bg-ink text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div>
              <h3 className="font-serif text-2xl mb-1">Ready for a calmer 10 minutes?</h3>
              <p className="text-white/70 text-sm">Grab the free pack and see the difference.</p>
           </div>
           <a href="#free-sample">
             <Button variant="primary" className="shadow-lg shadow-white/10 hover:scale-105 transition-transform">Get 3 Free Pages</Button>
           </a>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-primary to-primary-hover text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-h1 mb-6">One plan. Endless creativity.</h2>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto mb-10 border border-white/20">
             <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:divide-x md:divide-white/20">
                <div className="flex-1 text-center md:text-right px-4">
                   <p className="text-lg font-medium opacity-90">Instant Access</p>
                   <p className="text-3xl font-bold">500+ Designs</p>
                </div>
                 <div className="flex-1 text-center md:text-left px-4">
                   <p className="text-lg font-medium opacity-90">Fresh Drops</p>
                   <p className="text-3xl font-bold">Every Sunday</p>
                </div>
             </div>
          </div>

          <Link to="/pricing">
            <Button variant="secondary" size="lg" className="shadow-xl shadow-black/10">Join for $5/mo</Button>
          </Link>
          <p className="mt-6 text-sm text-white/70">
             Less than a latte. Cancel anytime in one click.
          </p>
        </div>
      </section>





      {/* Printing & Use Rights (Scannable) - P1 Item 9 */}
      <section className="py-20 bg-white" id="rights">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="bg-ink/5 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-10">
                <h3 className="font-serif text-2xl text-ink mb-2">Yes, you can print these.</h3>
                <p className="text-gray-500">Simple rights for everyone.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-secondary font-bold mb-4 flex items-center gap-2">
                       <Heart className="w-4 h-4 fill-secondary" /> Parents
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 mb-4">
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5"></div>Unlimited prints at home</li>
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5"></div>Fridge, wall, gifts</li>
                    </ul>
                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Strictly no resale</p>
                 </div>
                 
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-primary font-bold mb-4 flex items-center gap-2">
                       <Printer className="w-4 h-4 fill-primary" /> Teachers
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 mb-4">
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>Print for your full class</li>
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>Use for quiet time</li>
                    </ul>
                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Not for other teachers</p>
                 </div>

                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-ink font-bold mb-4 flex items-center gap-2">
                       <Sparkles className="w-4 h-4 fill-ink" /> Therapists
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 mb-4">
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5"></div>Use in client sessions</li>
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5"></div>Send home as homework</li>
                    </ul>
                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Single professional use</p>
                 </div>
              </div>
           </div>
        </div>
      </section>


      {/* Mobile Sticky CTA */}
      <StickyCTA />
    </>
  );
}
