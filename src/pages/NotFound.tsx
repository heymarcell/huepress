import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | HuePress</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <div className="min-h-screen pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center">
      
      {/* Robot Illustration */}
      <div className="w-40 h-56 mb-6 animate-fade-in">
        <img src="/404-robot.svg" alt="Lost robot" className="w-full h-full object-contain" />
      </div>

      <h1 className="font-serif text-display text-ink mb-4">
        Oops! Blank Canvas
      </h1>
      
      <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
        I think my toddler hid this page (or colored over it). It's gone. Let's get you back to safety.
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
    </>
  );
}
