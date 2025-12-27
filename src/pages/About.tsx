import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">
      <SEO 
        title="About Us | HuePress"
        description="We believe in the power of bold lines and quiet moments. Learn about the mission behind HuePress."
      />
      
      {/* Hero */}
      <section className="bg-accent py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-display text-ink mb-6">Bold Lines, Quiet Minds</h1>
          <p className="text-gray-600 text-lg">The story behind the fridge-worthy art.</p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg mx-auto text-gray-600">
            <p className="mb-6">
              Hi, I'm Sarah. I started HuePress with a simple mission: to create coloring pages that don't frustrate kids (or parents).
            </p>
            <p className="mb-6">
              We've all been there: searching for "free coloring pages" only to find low-quality pixelated images, aggressive ads, or designs so complex they end up in the trash bin after 5 minutes of struggle.
            </p>
            <h3 className="font-serif text-ink text-2xl font-bold mt-10 mb-4">Why "Bold & Easy"?</h3>
            <p className="mb-6">
              As I learned more about child development, I realized that super-thick lines aren't just an aesthetic choice. They act as "training wheels" for fine motor skills, helping young artists stay within the lines and build confidence.
            </p>
            <p className="mb-6">
              That's why every single page on HuePress is quality-checked against what I call "Therapy-Grade" standards:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8">
              <li>Bold, consistent line weights</li>
              <li>Clear, recognizable shapes</li>
              <li>Zero visual clutter</li>
              <li>Themes that spark legitimate joy</li>
            </ul>
            <p>
              HuePress is a small, independent publisher. When you join the club, you're not just buying PDFs. You're supporting a philosophy that childhood should be creative, calm, and ad-free.
            </p>
          </div>

          <div className="mt-16 text-center border-t border-gray-100 pt-10">
            <h3 className="font-serif text-ink text-xl font-bold mb-4">Ready to join us?</h3>
            <Link to="/pricing">
              <Button variant="primary" size="lg">Join the Club ($5/mo)</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
