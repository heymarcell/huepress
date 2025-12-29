import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useSubscription } from "@/lib/auth";
import { Asset } from "@/api/types";
import { 
  Button, 
  ResourceCard, 
  Section, 
  Heading, 
  Text,
  Badge,
  Card
} from "@/components/ui";
import { FreeSampleBanner } from "@/components/features/FreeSampleBanner";
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
  Check,
  PartyPopper,
  Unlock
} from "lucide-react";

// Featured items with real thumbnails


// Value propositions with Lucide icons
const features = [
  { 
    title: "Therapy-Grade Quality", 
    description: "Bold, thick lines designed for fine motor development. Trusted by OTs and therapists.", 
    icon: Sparkles 
  },
  { 
    title: "Zero Ads, Zero Clutter", 
    description: "A calm, focused experience. No pop-ups, no distractions. Just beautiful art.", 
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

export default function HomePage() {
  const [featuredItems, setFeaturedItems] = useState<Asset[]>([]);
  const { isSubscriber } = useSubscription();

  useEffect(() => {
    let cancelled = false;

    const fetchFeatured = async () => {
      try {
        performance.mark('assets-fetch-start');
        const data = await apiClient.assets.list({ limit: 8 });
        performance.mark('assets-fetch-end');
        performance.measure('assets-fetch', 'assets-fetch-start', 'assets-fetch-end');
        const apiTime = performance.getEntriesByName('assets-fetch')[0]?.duration;
        if (apiTime && apiTime > 1000) {
          console.warn(`[Perf] Assets API took ${apiTime.toFixed(0)}ms`);
        }
        if (!cancelled) setFeaturedItems(data.assets || []);
      } catch (err) {
        console.error("Failed to load featured assets", err);
      }
    };

    // Defer fetch to prioritize above-the-fold render
    const timer = setTimeout(fetchFeatured, 1200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <>
      <SEO />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-accent via-white to-accent overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              {isSubscriber ? (
                // ========== SUBSCRIBER HERO ==========
                <>
                  <Badge variant="soft-success" className="mb-6 pl-1 pr-3 py-1">
                     <PartyPopper className="w-4 h-4 mr-2" />
                     You're a Member!
                  </Badge>
                  
                  <Heading as="h1" variant="display" className="mb-4">
                    Welcome Back!{" "}
                    <span className="text-secondary">Ready to Print?</span>
                  </Heading>
                  
                  <Text variant="large" className="mb-8 max-w-lg mx-auto lg:mx-0">
                    Your full library awaits. New designs drop every Sunday. 
                    dive in and find your next masterpiece.
                  </Text>
                  
                  <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <Link to="/vault">
                        <Button variant="primary" size="lg" className="w-full sm:w-auto">
                          Browse the Vault
                        </Button>
                      </Link>
                      <Link to="/request-design">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto">
                          Request a Design
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 flex items-center justify-center lg:justify-start gap-1">
                      <Check className="w-4 h-4 text-success" />
                      <span className="font-medium text-ink">Unlimited downloads.</span> Print as many as you like.
                    </p>
                  </div>

                  {/* Subscriber social proof - reinforcement */}
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                     <div className="flex">
                       {[1,2,3,4,5].map(i => (
                         <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                       ))}
                     </div>
                     <p>Thank you for being part of the <strong className="text-ink">HuePress family</strong>!</p>
                  </div>
                </>
              ) : (
                // ========== NON-SUBSCRIBER HERO ==========
                <>
                  <Badge variant="soft-success" className="mb-6 pl-1 pr-3 py-1">
                     <span className="w-2 h-2 rounded-full bg-success mr-2"></span>
                     Designed for Fine Motor Skills
                  </Badge>
                  
                  <Heading as="h1" variant="display" className="mb-4">
                    Therapy-Grade Coloring Pages.{" "}
                    <span className="text-secondary">Guilt-Free Peace in 60 Seconds</span>
                  </Heading>
                  
                  <Text variant="large" className="mb-8 max-w-lg mx-auto lg:mx-0">
                    Join 1,000+ families using our bold, clutter-free designs to buy themselves 20 minutes of silence. (And help kids build focus).
                  </Text>
                  
                  <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      <Link to="/pricing">
                        <Button variant="primary" size="lg" className="w-full sm:w-auto">
                          Join for $5/mo
                        </Button>
                      </Link>
                      <a href="#free-sample">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto">
                          Get 3 Free Pages
                        </Button>
                      </a>
                    </div>
                    <p className="text-sm text-gray-500 mt-3 flex items-center justify-center lg:justify-start gap-1">
                      <span className="font-medium text-ink">$5/month, cancel anytime.</span> Secure checkout via Stripe.
                    </p>
                  </div>

                  {/* Trust/Social Proof */}
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                     <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                          <img src="/avatars/avatar_mom_1.webp" alt="Happy Mom" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                          <img src="/avatars/avatar_dad_1.webp" alt="Happy Dad" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                          <img src="/avatars/avatar_teacher_1.webp" alt="Teacher" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                          <img src="/avatars/avatar_mom_2.webp" alt="Happy Mom" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                     </div>
                     <p>Join <strong className="text-ink">1,000+ families</strong> printing today.</p>
                  </div>
                </>
              )}


            </div>

            {/* Right: Hero Image - Real thumbnails on white paper */}
            <div className="relative">
                <div className="relative rounded-2xl shadow-xl overflow-hidden border border-gray-100 rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img 
                    src="/hero_lifestyle.webp" 
                    alt="Child coloring a HuePress page with markers"
                    width="662"
                    height="662"
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
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
                 <span className="font-bold text-ink">4.9/5 from 1,000+ families</span>
                 <span className="text-xs text-gray-500">Rated by parents & OTs</span>
               </div>
            </div>
            <p className="text-gray-500 text-sm">
               "The lines are thick enough for my patients to actually succeed." <span className="font-bold text-ink">Emily, Pediatric OT</span>
            </p>
            <div className="hidden md:block w-px h-8 bg-gray-200"></div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">Trusted by Teachers & OTs</p>
        </div>
      </section>

      {/* Vault Preview - Moved Higher for Rank 12 */}
      <Section>
          <div className="text-center mb-12">
            <Heading as="h2" variant="h1" className="mb-4">Peek Inside The Vault</Heading>
            <Text variant="large" className="max-w-2xl mx-auto">Over 500 bold, curated designs across trending themes. New drops every Sunday.</Text>
          </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
             {featuredItems.length > 0 ? (
               featuredItems.map((item, idx) => (
               <ResourceCard
                 key={item.id}
                 id={item.id}
                 title={item.title}
                 imageUrl={item.image_url}
                 tags={(item.tags || []).slice(0, 2)}
                 isLocked={!isSubscriber}
                 isSubscriber={isSubscriber}
                 isNew={idx < 2} 
                 assetId={item.asset_id}
                 slug={item.slug}
               />
             ))
             ) : (
               // Loading Skeletons
               [...Array(4)].map((_, i) => (
                   <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-64 animate-pulse">
                       <div className="bg-gray-100 w-full h-40 rounded-lg mb-4"></div>
                       <div className="bg-gray-100 h-4 w-3/4 rounded mb-2"></div>
                       <div className="bg-gray-100 h-3 w-1/2 rounded"></div>
                   </div>
               ))
             )}
           </div>
           
          <div className="text-center mt-10">
            <div className="flex flex-col items-center gap-4">
               {isSubscriber ? (
                 // Subscriber CTAs
                 <>
                   <Link to="/vault">
                     <Button variant="primary" size="lg">Explore Your Vault</Button>
                   </Link>
                   <div className="flex items-center justify-center gap-2 text-sm mt-3">
                   <Unlock className="w-4 h-4 text-gray-400" />
                   <Text variant="muted">All 500+ designs unlocked for you</Text>
                </div>
                 </>
               ) : (
                 // Non-subscriber CTAs
                 <>
                   <div className="flex flex-col sm:flex-row gap-4 justify-center">
                     <Link to="/pricing">
                       <Button variant="primary" size="lg">Join for $5/mo</Button>
                     </Link>
                     <Link to="/vault">
                       <Button variant="outline" size="lg">Browse the Vault</Button>
                     </Link>
                   </div>
                   <div className="flex items-center justify-center gap-2 text-sm mt-3">
                   <Sparkles className="w-4 h-4 text-gray-400" />
                   <Text variant="muted">Instant access to 500+ designs</Text>
                </div>
                 </>
               )}
            </div>
          </div>
      </Section>

      {/* Social Proof - Testimonials */}
      <Section background="accent" size="lg">
           <p className="text-center text-sm text-gray-500 mb-8">Loved by parents, teachers, and therapists</p>
           <div className="grid md:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <Card className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_mom_1.webp" alt="Jessica" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                    <div>
                       <p className="font-bold text-ink text-sm">Jessica</p>
                       <p className="text-xs text-gray-500">Mom of 3</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"This is the only way I get 20 minutes of peace. My kids ask for these pages every day!"</p>
              </Card>
              
              {/* Testimonial 2 */}
              <Card className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_teacher_1.webp" alt="Michelle" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                    <div>
                       <p className="font-bold text-ink text-sm">Michelle R.</p>
                       <p className="text-xs text-gray-500">Pediatric OT</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"Perfect for my fine-motor groups. The bold lines are exactly what my patients need."</p>
              </Card>
              
              {/* Testimonial 3 */}
              <Card className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_dad_1.webp" alt="David" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                    <div>
                       <p className="font-bold text-ink text-sm">David T.</p>
                       <p className="text-xs text-gray-500">3rd Grade Teacher</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"Zero ads, completely safe for my classroom. I use these for quiet time every week."</p>
              </Card>
           </div>
      </Section>

      {/* Print Quality Proof - P1 Item 10 */}
      <Section background="muted" className="border-y border-gray-200" size="md">
          <div className="text-center mb-10">
             <Heading className="mb-2">Why "Free" Sites Cost More</Heading>
             <Text>Don't waste ink on pixelated junk.</Text>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
             {/* Bad Side */}
             <div className="bg-white p-6 rounded-2xl border border-gray-200 relative overflow-hidden group flex flex-col">
                <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-md z-10">THEIR FREEBIES</div>
                <div className="h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                   {/* Use lazy img instead of CSS background for better performance */}
                   <img
                     src="/thumbnails/thumb_whale_1766355003894.webp"
                     alt=""
                     loading="lazy"
                     decoding="async"
                     className="absolute inset-0 w-full h-full object-cover blur-[2px] opacity-60 scale-110 grayscale"
                   />
                </div>
                <div className="mt-auto">
                   <h3 className="font-bold text-gray-400 mb-2">Pixelated & Blurry</h3>
                   <p className="text-sm text-gray-400">Jagged edges that look awful when printed.</p>
                   {/* Spacer to match the checklist height on the right */}
                   <ul className="space-y-1 mt-3 opacity-0 pointer-events-none" aria-hidden="true">
                      <li className="text-xs">&nbsp;</li>
                      <li className="text-xs">&nbsp;</li>
                      <li className="text-xs">&nbsp;</li>
                   </ul>
                </div>
             </div>

             {/* Good Side */}
             <div className="bg-white p-6 rounded-2xl border-2 border-success/20 ring-4 ring-success/5 relative overflow-hidden shadow-lg flex flex-col">
                <div className="absolute top-4 right-4 bg-success text-white text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1">
                   <Sparkles className="w-3 h-3" /> HUEPRESS
                </div>
                <div className="h-48 bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-gray-100">
                   <img src="/thumbnails/thumb_whale_1766355003894.webp" className="w-full h-full object-cover" loading="lazy" alt="HuePress quality comparison" />
                </div>
                <div className="mt-auto">
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
      </Section>

      {/* Free Sample - Only show for non-subscribers */}
      {!isSubscriber && <FreeSampleBanner id="free-sample" />}



      {/* How It Works - Bold Cards */}
      <Section size="md">
          <Heading className="text-center mb-10">How It Works</Heading>
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
      </Section>

      {/* Problem/Agitation Section */}
      <Section background="muted" size="md">
          <Heading as="h2" variant="h1" className="text-center mb-6">
            Tired of Visual Clutter?
          </Heading>
          <Text variant="large" className="text-center mb-8">
            I get it. You search "free coloring pages" and get bombarded with ads, 
            broken links, and designs so chaotic they give you a headache. 
            Your kids deserve better art. <span className="font-bold text-ink">And you deserve a break.</span>
          </Text>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {painPoints.map((point) => (
              <Card key={point.title} className="p-6 border-2 border-secondary/20 shadow-sm">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <point.icon className="w-6 h-6 text-secondary" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-ink mb-2">{point.title}</h3>
                <p className="text-sm text-gray-500">{point.description}</p>
              </Card>
            ))}
          </div>
      </Section>

      {/* Features */}
      <Section background="accent">
          <div className="text-center mb-12">
            <Heading as="h2" variant="h1" className="mb-4">Why Parents Love HuePress</Heading>
            <Text variant="large" className="max-w-2xl mx-auto">I obsess over path closure and line weights so you can obsess over your coffee.</Text>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} variant="hover" className="p-6">
                <feature.icon className="w-10 h-10 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="font-bold text-ink mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </Card>
            ))}
          </div>
      </Section>

      {/* Mid-Scroll CTA Bar - Conditional based on subscription */}
      {!isSubscriber ? (
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
      ) : (
        <section className="bg-primary text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
                <h3 className="font-serif text-2xl mb-1">Your next masterpiece awaits </h3>
                <p className="text-white/70 text-sm">New designs added every Sunday. Dive in!</p>
             </div>
             <Link to="/vault">
               <Button variant="secondary" className="shadow-lg shadow-white/10 hover:scale-105 transition-transform">Browse the Vault</Button>
             </Link>
          </div>
        </section>
      )}

      {/* Final CTA - Only for non-subscribers */}
      {!isSubscriber && (
        <section className="py-20 bg-gradient-to-br from-primary to-primary-hover text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Heading as="h2" variant="h1" className="mb-6 text-white font-serif">One plan. Endless creativity.</Heading>
            
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
      )}


      {/* Printing & Use Rights (Scannable) - P1 Item 9 */}
      <Section id="rights" size="md"> 
           <div className="bg-ink/5 rounded-3xl p-8 md:p-12">
              <div className="text-center mb-10">
                <Heading className="mb-2">Yes, you can print these.</Heading>
                <Text>Simple rights for everyone.</Text>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                 <Card className="p-6">
                    <div className="text-secondary font-bold mb-4 flex items-center gap-2">
                       <Heart className="w-4 h-4 fill-secondary" /> Parents
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 mb-4">
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5"></div>Unlimited prints at home</li>
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5"></div>Fridge, wall, gifts</li>
                    </ul>
                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Strictly no resale</p>
                 </Card>
                 
                 <Card className="p-6">
                    <div className="text-primary font-bold mb-4 flex items-center gap-2">
                       <Printer className="w-4 h-4 fill-primary" /> Teachers
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 mb-4">
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>Print for your full class</li>
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>Use for quiet time</li>
                    </ul>
                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Not for other teachers</p>
                 </Card>

                 <Card className="p-6">
                    <div className="text-ink font-bold mb-4 flex items-center gap-2">
                       <Sparkles className="w-4 h-4 fill-ink" /> Therapists
                    </div>
                    <ul className="space-y-3 text-sm text-gray-600 mb-4">
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5"></div>Use in client sessions</li>
                       <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-ink mt-1.5"></div>Send home as homework</li>
                    </ul>
                    <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">Single professional use</p>
                 </Card>
              </div>
           </div>
      </Section>



    </>
  );
}
