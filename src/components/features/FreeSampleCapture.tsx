import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Sparkles, Gift } from "lucide-react";

export function FreeSampleCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Validation state
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!email.includes("@")) {
      setError("That email doesn't look valid. Try again.");
      return;
    }
    // TODO: Integrate with email service
    setSubmitted(true);
    setError(null);
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
            helperText="No credit card. Sent in 1–2 minutes."
          />
        </div>
        <div className="">
          <Button variant="outline" type="submit" className="whitespace-nowrap w-full sm:w-auto">
            <Gift className="w-4 h-4" />
            Send Me Free Pages
          </Button>
        </div>
      </div>
    </form>
  );
}
