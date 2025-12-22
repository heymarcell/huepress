import { useState } from "react";
import { Button, Accordion } from "@/components/ui";
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
  },
  {
    name: "Annual",
    price: "$45",
    period: "/year",
    description: "Best value — save 25%",
    features: ["Everything in Monthly", "Save $15 per year (25% off)", "Seasonal packs included", "New drops every Sunday", "Cancel anytime"],
    priceId: "price_1Sh9A6RzWblq3ch1IddHrwdU",
    popular: true,
    popularLabel: "3 Months Free",
    cta: "Get Annual (Save 25%)",
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

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const { openSignIn, user } = useClerk();
  const { isSubscriber } = useSubscription();

  const handleSubscribe = async (priceId: string) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    if (isSubscriber) {
      alert("You are already a member! Go to the Vault to download.");
      return;
    }

    setLoading(priceId);
    analytics.checkoutStarted(priceId);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      
      const email = user?.primaryEmailAddress?.emailAddress;
      await createCheckoutSession(priceId, token, email);
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Unable to start checkout. Please try again.");
    } finally {
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
      <section className="bg-accent py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-display text-ink mb-4">Simple, Joyful Pricing</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">One plan, unlimited creativity. Less than a latte for endless quiet time activities.</p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {plans.map((plan) => (
              <div 
                key={plan.name} 
                className={`relative rounded-2xl flex flex-col ${
                  plan.popular 
                    ? "bg-primary text-white shadow-2xl shadow-primary/30 p-10 md:scale-105" 
                    : "bg-white border border-gray-200 shadow-lg p-8"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-bold px-6 py-2 rounded-full whitespace-nowrap shadow-lg">
                    ⭐ MOST POPULAR — Save 25%
                  </div>
                )}
                <div className="text-center mb-6">
                  <h2 className={`font-serif text-h2 mb-2 ${plan.popular ? "text-white" : "text-ink"}`}>{plan.name}</h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`font-serif text-5xl font-bold ${plan.popular ? "text-white" : "text-ink"}`}>{plan.price}</span>
                    <span className={plan.popular ? "text-white/70" : "text-gray-500"}>{plan.period}</span>
                  </div>
                  <p className={`text-sm mt-2 ${plan.popular ? "text-white/80" : "text-gray-500"}`}>{plan.description}</p>
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
                    variant={plan.popular ? "secondary" : "outline"}
                    size="lg"
                    className="w-full"
                    onClick={() => handleSubscribe(plan.priceId)}
                    isLoading={loading === plan.priceId}
                  >
                    {isSubscriber ? "Already a Member" : plan.cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Lock className="w-4 h-4" strokeWidth={1.5} />
              Secure checkout powered by Stripe · Cancel anytime · No hidden fees
            </div>
             <p className="text-sm font-medium text-ink bg-primary/5 inline-block mx-auto px-4 py-2 rounded-full border border-primary/10">
               Instant access to 500+ designs, unlimited downloads, high-res vector PDFs.
             </p>
          </div>
        </div>
      </section>

      {/* Social Proof - Light Version */}
      <section className="py-16 bg-accent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-gray-500 mb-2">Trusted by</p>
            <p className="font-serif text-h1 text-ink mb-4">500+ Happy Families</p>
            <p className="text-gray-500 max-w-lg mx-auto">Used at home, in classrooms, and in pediatric OT sessions.</p>
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
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-h1 text-ink text-center mb-12">Frequently Asked Questions</h2>
          <Accordion items={faqs} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-h1 mb-4">Ready to Start Coloring?</h2>
          <p className="text-white/80 mb-8">Join The Club today and unlock 500+ fridge-worthy designs.</p>
          <Button variant="secondary" size="lg" onClick={() => handleSubscribe("price_monthly")}>
            Join The Club — $5/mo
          </Button>
        </div>
      </section>
    </>
  );
}
