import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./Button";

export const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      // Logic: Show after 300px, Hide when near bottom (footer)
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const footerOffset = 400; // Approximate footer height + buffer

      const isScrolledPastHero = scrollY > 300;
      const isNotNearFooter = (scrollY + windowHeight) < (documentHeight - footerOffset);

      if (isScrolledPastHero && isNotNearFooter) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]); // Re-check on route change

  // Don't show on admin pages
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden flex gap-3 pb-8 transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link to="/pricing" className="flex-1">
        <Button variant="primary" className="w-full shadow-lg font-bold">
          Join for $5/mo
        </Button>
      </Link>
      <a href="#free-sample" className="flex-1">
        <Button variant="secondary" className="w-full shadow-sm text-sm px-2 bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20">
          Get 3 Free Pages
        </Button>
      </a>
    </div>
  );
};
