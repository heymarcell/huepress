import { Link } from "react-router-dom";
import { 
  Button, 
  ResourceCard, 
  Section, 
  Heading, 
  Text,
  Badge,
  Card
} from "@/components/ui";
import { FreeSampleCapture } from "@/components/features/FreeSampleCapture";
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
              <Badge variant="soft-success" className="mb-6 pl-1 pr-3 py-1">
                 <span className="w-2 h-2 rounded-full bg-success mr-2"></span>
                 Designed for Fine Motor Skills
              </Badge>
              
              <Heading as="h1" variant="display" className="mb-4">
                Therapy-Grade Coloring Pages.{" "}
                <span className="text-secondary">Print Calm in 60 Seconds</span>
              </Heading>
              
              <Text variant="large" className="mb-8 max-w-lg mx-auto lg:mx-0">
                Join 500+ families using our bold-line designs to reduce anxiety and build focus. 
                New drops every Sunday.
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

              {/* Trust/Social Proof - replacing the cluttered form */}
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                 <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_mom_1.png" alt="Happy Mom" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_dad_1.png" alt="Happy Dad" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_teacher_1.png" alt="Teacher" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src="/avatars/avatar_mom_2.png" alt="Happy Mom" className="w-full h-full object-cover" loading="lazy" />
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
                    loading="eager"
                    fetchPriority="high"
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
      <Section>
          <div className="text-center mb-12">
            <Heading as="h2" variant="h1" className="mb-4">Peek Inside The Vault</Heading>
            <Text variant="large" className="max-w-2xl mx-auto">Over 500 bold, curated designs across trending themes. New drops every Sunday.</Text>
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
            <div className="flex flex-col items-center gap-4">
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Link to="/pricing">
                   <Button variant="primary" size="lg">Join for $5/mo</Button>
                 </Link>
                 <Link to="/vault">
                   <Button variant="outline" size="lg">Browse the Vault</Button>
                 </Link>
               </div>
               <Text variant="muted">Instant access to 500+ designs</Text>
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
                    <img src="/avatars/avatar_mom_1.png" alt="Sarah" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
                    <div>
                       <p className="font-bold text-ink text-sm">Sarah M.</p>
                       <p className="text-xs text-gray-500">Mom of 2</p>
                    </div>
                 </div>
                 <p className="text-gray-600 italic">"This is the only way I get 20 minutes of peace. My kids ask for these pages every day!"</p>
              </Card>
              
              {/* Testimonial 2 */}
              <Card className="p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <img src="/avatars/avatar_teacher_1.png" alt="Michelle" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
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
                    <img src="/avatars/avatar_dad_1.png" alt="David" className="w-12 h-12 rounded-full object-cover" loading="lazy" />
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
                <div className="h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                   {/* Simulated pixelation */}
                   <div className="w-full h-full bg-[url('/thumbnails/thumb_whale_1766355003894.png')] bg-cover blur-[2px] opacity-60 scale-110 grayscale"></div>
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
                   <img src="/thumbnails/thumb_whale_1766355003894.png" className="w-full h-full object-cover" loading="lazy" alt="HuePress quality comparison" />
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

      {/* Free Sample - Full Width Strip - Better Integrated */}
      <section id="free-sample" className="bg-secondary/5 border-b border-secondary/10 py-12 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col lg:flex-row items-center justify-center gap-8 text-center lg:text-left">
              <div className="max-w-sm">
                 <Heading className="mb-2">Try 3 free pages?</Heading>
                 <Text>See the difference bold lines make. We’ll send them to your inbox.</Text>
              </div>
              <div className="w-full lg:w-auto lg:min-w-[520px]">
                 <FreeSampleCapture />
              </div>
           </div>
        </div>
      </section>



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
            Tired of Chaotic Clip Art?
          </Heading>
          <Text variant="large" className="text-center mb-8">
            We get it. You search "free coloring pages" and get bombarded with ads, 
            broken links, and designs so cluttered they give you a headache. 
            Your kids deserve better. <span className="font-bold text-ink">So do you.</span>
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
            <Text variant="large" className="max-w-2xl mx-auto">We obsess over quality so you can focus on quality time.</Text>
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
