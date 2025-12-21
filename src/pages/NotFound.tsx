import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <span className="text-8xl mb-6 block">🎨</span>
        <h1 className="font-serif text-h1 text-ink mb-4">Page Not Found</h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Looks like this page wandered off to color somewhere else. Let's get you back to the vault.
        </p>
        <Link to="/vault">
          <Button variant="primary" size="lg">
            Back to The Vault
          </Button>
        </Link>
      </div>
    </div>
  );
}
