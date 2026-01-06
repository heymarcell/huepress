import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">
      <SEO  
        title="About Us | HuePress"
        description="We believe in the power of bold lines and quiet moments. Learn about the mission behind HuePress and our therapy-grade coloring page philosophy."
        canonical="https://huepress.co/about"
        breadcrumbs={[
          { name: "Home", url: "https://huepress.co/" },
          { name: "About", url: "https://huepress.co/about" }
        ]}
      />
      
      {/* Hero */}
      <section className="bg-accent py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs 
            items={[
              { name: "Home", url: "/" },
              { name: "About", url: "/about" }
            ]}
            className="mb-8"
          />
          <div className="text-center">
            <h1 className="font-serif text-display text-ink mb-6">Bold Lines, Quiet Minds</h1>
            <p className="text-gray-600 text-lg">The story behind the fridge-worthy art.</p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg mx-auto text-gray-600">
            <p className="mb-6">
              Hi, I'm Sarah. I’m a Senior Frontend Engineer, a mom to two (Leo and Maya), and the founder of HuePress.
            </p>
            <p className="mb-6">
              The idea for HuePress happened on a rainy Tuesday. Leo (then 4) was melting down, and I needed 15 minutes of quiet to fix a critical bug for work. I Googled "dinosaur coloring page," and what I found made my designer brain hurt.
            </p>
            <p className="mb-6">
              The sites were a nightmare of pop-up ads, fake "Download" buttons, and pixelated clip-art that wasted my printer ink. It was pure <strong>friction</strong>.
            </p>
            <p className="mb-6">
              I thought: <em>"I build scalable dashboards for a living. Why am I letting a spammy website ruin my morning?"</em>
            </p>
            <p className="mb-6">
              So, I wrote a script to generate a perfect SVG dinosaur with 3pt thick lines—heavy enough for Leo to stay inside them. I printed it. He loved it. And for the first time in weeks, the living room was quiet.
            </p>

            <h3 className="font-serif text-ink text-2xl font-bold mt-10 mb-4">The "Bold Lines" Philosophy</h3>
            <p className="mb-6">
              I didn’t just build HuePress to look good. I built it to work. I worked with my friend Emily (a pediatric Occupational Therapist) to define our "Therapy-Grade" standard:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-8">
              <li><strong>Bold Lines (2pt+):</strong> To help little hands develop visual-motor control.</li>
              <li><strong>Zero Clutter:</strong> No distractions on the page means more focus for the child.</li>
              <li><strong>Vector Crisp:</strong> Professional outlines that look like art, not a xerox of a xerox.</li>
            </ul>
            <p>
              HuePress isn't a unicorn startup. It's a small, calm corner of the internet designed to save you from "clutter anxiety." I hope it buys you a hot coffee and a moment of peace.
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
