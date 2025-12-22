import { useState } from "react";
import { Button } from "@/components/ui";
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
    priceId: "price_monthly", // Replace with actual Stripe Price ID
    popular: false,
  },
  {
    name: "Annual",
    price: "$45",
    period: "/year",
    description: "Best value — save 25%",
    features: ["Everything in Monthly", "Save $15 per year", "Priority access to new themes", "Exclusive seasonal packs", "Early access to new features", "Cancel anytime"],
    priceId: "price_annual", // Replace with actual Stripe Price ID
    popular: true,
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

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  const handleSubscribe = async (priceId: string) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setLoading(priceId);
    analytics.checkoutStarted(priceId);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      await createCheckoutSession(priceId, token);
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
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative bg-white rounded-2xl shadow-lg p-8 ${plan.popular ? "border-2 border-primary ring-4 ring-primary/10" : "border border-gray-200"}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1 rounded-full">BEST VALUE</div>
                )}
                <div className="text-center mb-6">
                  <h2 className="font-serif text-h2 text-ink mb-2">{plan.name}</h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="font-serif text-5xl font-bold text-ink">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0" strokeWidth={2} />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? "primary" : "outline"}
                  size="lg"
                  className="w-full"
                  onClick={() => handleSubscribe(plan.priceId)}
                  isLoading={loading === plan.priceId}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
          <div className="text-center mt-12 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Lock className="w-4 h-4" strokeWidth={1.5} />
            Secure checkout powered by Stripe · Cancel anytime · No hidden fees
          </div>
        </div>
      </section>

      {/* Social Proof - Light Version */}
      <section className="py-16 bg-accent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-gray-500 mb-2">Trusted by</p>
            <p className="font-serif text-h1 text-ink">500+ Happy Families</p>
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
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-ink mb-2">{faq.question}</h3>
                <p className="text-gray-500">{faq.answer}</p>
              </div>
            ))}
          </div>
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
