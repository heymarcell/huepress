import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <SEO title="Page Not Found | HuePress" />
      
      {/* Robot Illustration */}
      <div className="w-40 h-56 mb-6 animate-fade-in">
        <img src="/404-robot.svg" alt="Lost robot" className="w-full h-full object-contain" />
      </div>

      <h1 className="font-serif text-display text-ink mb-4">
        Oops! Blank Canvas
      </h1>
      
      <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
        We can't seem to find the page you're looking for. It might have been colored over or erased.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/vault">
          <Button variant="primary" size="lg">
            Browse The Vault
          </Button>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
