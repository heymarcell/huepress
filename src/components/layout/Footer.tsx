import { Link } from "react-router-dom";
import { useConsent } from "../../context/ConsentContext";

const footerLinks = {
  product: [
    { to: "/vault", label: "The Vault" },
    { to: "/pricing", label: "Pricing" },
    { to: "/vault?skill=Calm", label: "For Therapists" },
    { to: "/about", label: "About" },
  ],
  legal: [
    { to: "/privacy", label: "Privacy Policy" },
    { to: "/terms", label: "Terms of Service" },
    // { to: "/privacy#choices", label: "Your Privacy Choices" }, // Replaced by dynamic button in component
  ],
  social: [
    { href: "https://pinterest.com/huepress", label: "Pinterest" },
    { href: "https://instagram.com/huepress", label: "Instagram" },
  ],
};

export function Footer() {
  const { setPreferencesOpen } = useConsent();
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {/* Logo - uses inverted/white version if available */}
              <img 
                src="/logo_grayscale_white.svg" 
                alt="HuePress" 
                className="h-8"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              {/* Fallback */}
              <div className="hidden items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-serif font-bold text-xl">H</span>
                </div>
                <span className="font-serif font-bold text-xl">HuePress</span>
              </div>
            </div>
            <p className="text-gray-300 max-w-md">
              Curated, therapy-grade coloring pages for design-conscious parents
              and pediatric professionals. Bold lines, big calm.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-sans font-bold text-sm uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-sans font-bold text-sm uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setPreferencesOpen(true)}
                  className="text-gray-300 hover:text-white transition-colors text-left"
                >
                  Your Privacy Choices
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-300 text-sm">
            © {new Date().getFullYear()} HuePress. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {footerLinks.social.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
