import { useState } from "react";
import { Button, Accordion, Card, Heading, Text, Section } from "@/components/ui";
import { createCheckoutSession } from "@/lib/stripe";
import { 
  Check, 
  Lock, 
  Heart, 
  Users, 
  Stethoscope, 
  BookOpen, 
  Home 
} from "lucide-react";
import SEO from "@/components/SEO";
import { analytics } from "@/lib/analytics";

const plans = [
  {
    name: "Monthly",
    price: "$5",
    period: "/month",
    description: "Perfect for trying us out",
    features: ["Unlimited downloads", "500+ bold designs", "New drops every Sunday", "High-res vector PDFs", "No watermarks", "Cancel anytime"],
    priceId: "price_1Sh99kRzWblq3ch1ACXHv20y",
    popular: false,
    cta: "Join for $5/mo",
    intent: "Cancel anytime",
  },
  {
    name: "Annual",
    price: "$45",
    period: "/year",
    description: "",
    features: ["Everything in Monthly", "Save $15 per year (25% off)", "Seasonal packs included", "New drops every Sunday", "Cancel anytime"],
    priceId: "price_1Sh9A6RzWblq3ch1IddHrwdU",
    popular: true,
    popularLabel: "BEST VALUE",
    cta: "Get Annual (Save 25%)",
    intent: "Most popular, save 25%",
  },
];


const faqs = [
  { question: "What makes HuePress different from free sites?", answer: "We focus on quality over quantity. Every design features therapy-grade bold lines, no ads, instant downloads, and a curated aesthetic you'd be proud to display on your fridge." },
  { question: "Can I cancel anytime?", answer: "Absolutely! Cancel with one click, no questions asked. You'll keep access until your billing period ends." },
  { question: "What format are the downloads?", answer: "All downloads are high-resolution vector PDFs. Print at any size without quality loss—perfect for standard paper or poster-sized prints." },
  { question: "Are these good for kids with motor delays?", answer: "Yes! Our 'Bold & Easy' designs feature thick, clear lines specifically designed to support fine motor development. Many OTs and therapists use our pages in sessions." },
  { question: "How often do you add new designs?", answer: "New designs drop every Sunday. We also create trending theme packs (like Capybara, Coquette) within 48 hours of viral moments." },
];

// User types with icons
const userTypes = [
  { icon: Heart, label: "Moms" },
  { icon: Users, label: "Dads" },
  { icon: Stethoscope, label: "OTs" },
  { icon: BookOpen, label: "Teachers" },
  { icon: Home, label: "Homeschoolers" },
];

import { useAuth, useClerk } from "@clerk/clerk-react";
import { useSubscription } from "@/lib/auth";
import { EUWaiverModal } from "@/components/checkout/EUWaiverModal";
import { AlertModal } from "@/components/ui/AlertModal";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
  });
  
  const { getToken, isSignedIn } = useAuth();
  const { openSignUp, user } = useClerk();
  const { isSubscriber } = useSubscription();

  const handleSubscribeClick = (priceId: string) => {
    if (!isSignedIn) {
      openSignUp();
      return;
    }

    if (isSubscriber) {
      setAlertState({
        isOpen: true,
        title: "Already a Member",
        message: "You are already a member! Go to the Vault to download your coloring pages.",
        variant: "info"
      });
      return;
    }

    setSelectedPriceId(priceId);
    setModalOpen(true);
  };

  const handleConfirmSubscribe = async () => {
    if (!selectedPriceId) return;

    setLoading(selectedPriceId);
    analytics.checkoutStarted(selectedPriceId);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      
      const email = user?.primaryEmailAddress?.emailAddress;
      await createCheckoutSession(selectedPriceId, token, email);
    } catch (error) {
      console.error("Checkout error:", error);
      setAlertState({
        isOpen: true,
        title: "Checkout Error",
        message: "Unable to start checkout. Please try again.",
        variant: "error"
      });
      setLoading(null);
    } 
  };

  return (
    <>
      <SEO 
        title="Pricing | $5/mo Unlimited Downloads | HuePress"
        description="Join The Club for $5/month. Unlimited access to 500+ therapy-grade coloring pages. Cancel anytime, no questions asked."
      />
      {/* Hero */}
      <Section background="accent" className="text-center" size="md">
        <Heading as="h1" variant="display" className="mb-4">Simple, Joyful Pricing</Heading>
        <Text variant="large" className="max-w-2xl mx-auto">One plan, unlimited creativity. Less than a latte for endless quiet time activities.</Text>
      </Section>

      {/* Pricing Cards */}
      <Section className="-mt-8 pt-0" size="md">
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {plans.slice().reverse().map((plan) => (
              <Card 
                key={plan.name} 
                className={`relative flex flex-col ${
                  plan.popular 
                    ? "bg-primary text-white shadow-2xl shadow-primary/30 border-transparent p-10 md:scale-110 z-10" 
                    : "bg-gray-50 border border-gray-200 shadow-lg p-8 opacity-90 hover:opacity-100 transition-opacity"
                }`}
              >
                {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-secondary text-white text-sm font-bold px-6 py-2 rounded-md whitespace-nowrap shadow-lg ring-2 ring-white">
                    ⭐ BEST VALUE — Save 25%
                  </div>
                )}
                <div className="text-center mb-6">
                  <Heading as="h2" className={`font-serif text-h2 mb-2 ${plan.popular ? "text-white" : "text-ink"}`}>{plan.name}</Heading>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`font-serif text-5xl font-bold ${plan.popular ? "text-white" : "text-ink"}`}>{plan.price}</span>
                    <span className={plan.popular ? "text-white/70" : "text-gray-500"}>{plan.period}</span>
                  </div>
                  {/* Intent Label */}
                   <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${plan.popular ? "text-secondary" : "text-primary"}`}>
                     {plan.intent}
                   </p>
                  {plan.popular && (
                      <p className="text-white font-medium bg-white/20 inline-block px-3 py-1 rounded-md text-sm mt-3">
                        Just $3.75/mo
                      </p>
                  )}
                  {plan.description && <p className={`text-sm mt-2 ${plan.popular ? "text-white/80" : "text-gray-500"}`}>{plan.description}</p>}
                  
                  {/* Visual Gallery for Annual Plan */}
                  {plan.popular && (
                    <div className="flex gap-2 justify-center mt-4">
                       <div className="w-12 h-16 bg-white/20 rounded-md overflow-hidden rotate-[-6deg] ring-1 ring-white/30">
                          <img src="/thumbnails/thumb_capybara_1766354990805.png" className="w-full h-full object-cover opacity-80" />
                       </div>
                       <div className="w-12 h-16 bg-white/20 rounded-md overflow-hidden ring-1 ring-white/30 z-10">
                          <img src="/thumbnails/thumb_unicorn_1766355087780.png" className="w-full h-full object-cover opacity-80" />
                       </div>
                       <div className="w-12 h-16 bg-white/20 rounded-md overflow-hidden rotate-[6deg] ring-1 ring-white/30">
                          <img src="/thumbnails/thumb_dinosaur_1766355016602.png" className="w-full h-full object-cover opacity-80" />
                       </div>
                    </div>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 ${plan.popular ? "text-secondary" : "text-success"}`} strokeWidth={2} />
                      <span className={plan.popular ? "text-white/90" : "text-gray-600"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button
                    variant={plan.popular ? "secondary" : "primary"}
                    size="lg"
                    className="w-full shadow-md"
                    onClick={() => handleSubscribeClick(plan.priceId)}
                    isLoading={loading === plan.priceId}
                  >
                    {isSubscriber ? "Already a Member" : plan.cta}
                  </Button>
                  
                  {/* FAQ Anchor Link - Rank 14 */}
                  {/* Prefer monthly link for Annual card */}
                  {plan.popular ? (
                    <div className="mt-4 text-center md:hidden">
                       <p className="text-xs text-white/60">
                         Prefer monthly? Scroll for $5/mo option
                       </p>
                    </div>
                  ) : (
                    <div className="mt-4 text-center">
                      <a href="#faq" className="text-xs text-gray-400 hover:text-primary underline decoration-dotted">
                        Have questions?
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          
           {/* Comparison Table - UPDATED: Annual first */}
           <div className="max-w-2xl mx-auto mt-12 mb-8">
             <Heading as="h3" className="text-center mb-6">Why switch to Annual?</Heading>
             <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
               <div className="grid grid-cols-3 text-sm border-b border-gray-200 bg-gray-50">
                 <div className="p-4 font-medium text-gray-500">Feature</div>
                 <div className="p-4 font-bold text-primary text-center bg-primary/5">Annual</div>
                 <div className="p-4 font-bold text-ink text-center">Monthly</div>
               </div>
               <div className="grid grid-cols-3 text-sm border-b border-gray-100">
                 <div className="p-4 font-medium text-ink">Price per Month</div>
                 <div className="p-4 text-center font-bold text-primary bg-primary/5">$3.75</div>
                 <div className="p-4 text-center text-gray-500">$5.00</div>
               </div>
               <div className="grid grid-cols-3 text-sm border-b border-gray-100">
                 <div className="p-4 font-medium text-ink">Total Yearly Cost</div>
                 <div className="p-4 text-center font-bold text-primary bg-primary/5">$45.00</div>
                 <div className="p-4 text-center text-gray-500">$60.00</div>
               </div>
               <div className="grid grid-cols-3 text-sm">
                 <div className="p-4 font-medium text-ink">Seasonal Packs</div>
                 <div className="p-4 text-center font-bold text-primary bg-primary/5">Instant Access</div>
                 <div className="p-4 text-center text-gray-500">Wait for drop</div>
               </div>
             </div>
             <p className="text-center text-xs text-gray-400 mt-4">Both plans include unlimited downloads and cancel-anytime access.</p>
          </div>

          <div className="text-center mt-12 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Lock className="w-4 h-4" strokeWidth={1.5} />
              Secure checkout powered by Stripe · Cancel anytime · No hidden fees
            </div>
             <p className="text-sm font-medium text-ink bg-primary/5 inline-block mx-auto px-4 py-2 rounded-md border border-primary/10">
               Instant access to 500+ designs, unlimited downloads, high-res vector PDFs.
             </p>
          </div>
      </Section>

      {/* Social Proof - Light Version */}
      <Section background="accent" size="md">
          <div className="text-center mb-10">
            <p className="text-gray-500 mb-2">Trusted by</p>
            <Heading as="h2" variant="h1" className="mb-4">500+ Happy Families</Heading>
            <Text>Used at home, in classrooms, and in pediatric OT sessions.</Text>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {userTypes.map((type, index) => (
              <div 
                key={type.label} 
                className={`rounded-xl p-4 text-center ${
                  index === 0 ? 'bg-secondary text-white' : 
                  index === 1 ? 'bg-primary text-white' : 
                  'bg-white text-ink shadow-sm'
                }`}
              >
                <type.icon className="w-6 h-6 mx-auto mb-2" strokeWidth={1.5} />
                <span className="text-sm font-medium">{type.label}</span>
              </div>
            ))}
          </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" size="sm" className="scroll-mt-20">
          <Heading as="h2" variant="h1" className="text-center mb-12">Frequently Asked Questions</Heading>
          <Accordion items={faqs} defaultOpenIndex={0} />
      </Section>

      {/* Final CTA */}
      <Section background="brand" className="bg-primary text-white" size="md">
        <div className="text-center">
          <Heading as="h2" variant="h1" className="text-white mb-4">Ready to Start Coloring?</Heading>
          <Text className="text-white/80 mb-8">Join The Club today and access 500+ fridge-worthy designs.</Text>
          <Button variant="secondary" size="lg" onClick={() => handleSubscribeClick(plans[1].priceId)}>
            Join for $5/mo
          </Button>
        </div>
      </Section>

      <EUWaiverModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmSubscribe}
        isLoading={loading === selectedPriceId}
      />

      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
      />
    </>
  );
}
