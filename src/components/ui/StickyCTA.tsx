import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./Button";

export const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const footerOffset = 400; // Approximate footer height + buffer

      // Show after 20% of the page or 800px, whichever is smaller (to ensure it shows on long pages)
      // but definitely past the hero (usually ~600-800px)
      const threshold = Math.min(documentHeight * 0.2, 1000); 
      
      const isScrolledPastHero = scrollY > threshold;
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
  }, [location.pathname]);

  // Don't show on admin pages
  if (location.pathname.startsWith('/admin')) return null;

  const isHomePage = location.pathname === "/";
  const freeSampleLink = isHomePage ? "#free-sample" : "/#free-sample";

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-[100] md:hidden flex gap-3 pb-[calc(16px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-y-0 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.1)]" : "translate-y-full shadow-none"
      }`}
    >
      <Link to="/pricing" className="flex-1">
        <Button variant="primary" className="w-full shadow-lg font-bold">
          Join for $5/mo
        </Button>
      </Link>
      <a href={freeSampleLink} className="flex-1">
        <Button variant="outline" className="w-full shadow-sm text-sm px-2 bg-white text-ink border-2 border-ink hover:bg-gray-50 h-[48px] font-bold">
          Get 3 Free Pages
        </Button>
      </a>
    </div>
  );
};
