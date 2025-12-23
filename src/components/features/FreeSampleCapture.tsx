import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { Sparkles, Gift } from "lucide-react";
import { analytics } from "@/lib/analytics";

// Revert to original signature without variant
export function FreeSampleCapture({ source = "free_sample_homepage" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validation state
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!email.includes("@")) {
      setError("That email doesn't look valid. Try again.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      
      if (!response.ok) {
        throw new Error("Subscription failed");
      }
      
      // Track lead generation
      analytics.generateLead(source);
      
      setSubmitted(true);
    } catch (err) {
      console.error("Subscribe error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center animate-fade-in">
        <Sparkles className="w-6 h-6 text-success mx-auto mb-2" />
        <p className="text-success-dark font-bold">Check your inbox!</p>
        <p className="text-gray-600 text-sm">Sent. Check your inbox (and Promotions).</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        {/* 
            Layout Fix: 
            To perfectly align the Button with the Input FIELD (ignoring helper text height), 
            we separate the Label.
            Row 1: Label
            Row 2: Input + Button (aligned items-start)
        */}
        <label 
          htmlFor="email-capture" 
          className="block text-xs font-bold text-gray-700 ml-1"
        >
          Email address
        </label>
        
        <div className="flex flex-col sm:flex-row gap-2 items-start">
          <div className="flex-1 w-full">
            <Input
              id="email-capture"
              type="email"
              // Label is handled externally for layout control
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="mom@example.com"
              aria-label="Email address for free sample pack"
              error={error || undefined}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Button variant="outline" type="submit" isLoading={isLoading} disabled={isLoading} className="whitespace-nowrap w-full sm:w-auto h-10">
              <Gift className="w-4 h-4 mr-2" />
              Send Me Free Pages
            </Button>
          </div>
        </div>
      </form>
      
      <div className="mt-3 ml-1 text-center sm:text-left">
        <p className="text-xs font-medium text-gray-600 mb-1">
          No credit card. Sent in 1–2 minutes.
        </p>
        <p className="text-[11px] text-gray-400 leading-tight">
          By signing up, you agree to our <Link to="/privacy" className="underline hover:text-gray-600 transition-colors">Privacy Policy</Link> and to receive occasional updates. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
