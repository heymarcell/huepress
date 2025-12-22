import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthButtons } from "@/lib/auth";

// Logo Component - uses SVG from public folder
function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      {/* Will use /logo.svg when available, fallback to brand mark */}
      <img 
        src="/logo.svg" 
        alt="HuePress" 
        className="h-9 group-hover:scale-105 transition-transform"
        onError={(e) => {
          // Fallback if SVG not yet added
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      {/* Fallback logo */}
      <div className="hidden items-center gap-2">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-serif font-bold text-lg">H</span>
        </div>
        <span className="font-serif font-bold text-xl text-ink">HuePress</span>
      </div>
    </Link>
  );
}

// Mobile Menu Button
function MenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <svg
        className="w-6 h-6 text-ink"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );
}

// Navigation Links
const navLinks = [
  { to: "/vault", label: "The Vault" },
  { to: "/pricing", label: "Pricing" },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isPricingPage = location.pathname === "/pricing";

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-20">
          {/* Logo - Flex Start */}
          <div className="flex-shrink-0 flex items-center">
            <Logo />
          </div>

          {/* Desktop Navigation - Absolute Center */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-ink/70 hover:text-primary font-medium transition-colors"
                style={{ fontSize: '15px' }} 
              >
                {link.label}
              </Link>
            ))}
            {/* Contextual CTA for Pricing Page */}
            {isPricingPage && (
               <div className="hidden lg:block ml-4 animate-fade-in">
                  <span className="text-secondary text-sm font-bold bg-secondary/10 px-3 py-1 rounded-full">
                    Save 25% on Annual
                  </span>
               </div>
            )}
          </div>

          {/* Desktop Auth - Flex End */}
          <div className="hidden lg:block flex-shrink-0">
            <AuthButtons />
          </div>

          {/* Mobile Menu Button */}
          <MenuButton
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block py-2 text-gray-500 hover:text-ink font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <AuthButtons />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
