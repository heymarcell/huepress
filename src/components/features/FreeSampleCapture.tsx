import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Sparkles, Gift } from "lucide-react";
import { analytics } from "@/lib/analytics";

export interface FreeSampleCaptureProps {
  source?: string;
  variant?: "default" | "vault";
}

export function FreeSampleCapture({ 
  source = "free_sample_homepage",
  variant = "default" 
}: FreeSampleCaptureProps) {
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
    if (variant === "vault") {
      return (
        <div className="bg-white/10 rounded-xl p-4 text-center animate-fade-in border border-white/20">
          <Sparkles className="w-6 h-6 text-white mx-auto mb-2" />
          <p className="text-white font-bold">Check your inbox!</p>
          <p className="text-white/80 text-sm">Sent. Check your inbox (and Promotions).</p>
        </div>
      );
    }
    return (
      <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center animate-fade-in">
        <Sparkles className="w-6 h-6 text-success mx-auto mb-2" />
        <p className="text-success-dark font-bold">Check your inbox!</p>
        <p className="text-gray-600 text-sm">Sent. Check your inbox (and Promotions).</p>
      </div>
    );
  }

  const isVault = variant === "vault";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      {/* 
          Layout Fix: 
          To perfectly align the Button with the Input FIELD (ignoring helper text height), 
          we separate the Label.
          Row 1: Label
          Row 2: Input + Button (aligned items-start)
      */}
      <label 
        htmlFor={`email-capture-${variant}`}
        className={`block text-xs font-bold ml-1 ${isVault ? "text-white/90" : "text-gray-700"}`}
      >
        Email address
      </label>
      
      <div className="flex flex-col sm:flex-row gap-2 items-start">
        <div className="flex-1 w-full">
          <Input
            id={`email-capture-${variant}`}
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
            helperText="No credit card. Sent in 1–2 minutes."
            // Override styles for vault variant
            className={isVault ? "!border-transparent focus:!ring-white/50" : ""}
          />
          {/* Helper text override for vault since Input handles it internally with gray text */}
          {isVault && !error && (
             <style>{`
               #email-capture-${variant} + p { color: rgba(255, 255, 255, 0.8) !important; }
             `}</style>
          )}
        </div>
        <div className="">
          <Button 
            variant={isVault ? undefined : "outline"} /* Remove variant for vault locally overridden */
            type="submit" 
            isLoading={isLoading} 
            disabled={isLoading} 
            className={`whitespace-nowrap w-full sm:w-auto ${
              isVault 
                ? "bg-white text-secondary hover:bg-gray-50 border-none shadow-lg" 
                : ""
            }`}
          >
            <Gift className={`w-4 h-4 ${isVault ? "text-secondary" : ""}`} />
            {isVault ? "Get 3 Free Pages" : "Send Me Free Pages"}
          </Button>
        </div>
      </div>
    </form>
  );
}
