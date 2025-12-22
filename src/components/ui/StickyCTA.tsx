
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "./Button";

export const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 md:hidden flex gap-3 pb-8 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link to="/pricing" className="flex-1">
        <Button variant="primary" className="w-full shadow-lg">
          Join for $5/mo
        </Button>
      </Link>
      <a href="#free-sample" className="flex-1">
        <Button variant="secondary" className="w-full shadow-sm text-sm px-2">
          Get 3 Free Pages
        </Button>
      </a>
    </div>
  );
};
