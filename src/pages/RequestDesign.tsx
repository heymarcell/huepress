import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

export default function RequestDesign() {
  const { user, isLoaded } = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Auto-fill email when user loads
  if (isLoaded && user && !email) {
    setEmail(user.primaryEmailAddress?.emailAddress || "");
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pass any auth token if needed, but endpoint supports anonymous for now
          // If we want detailed tracking, we rely on cookies/headers if configured, or just the body
          ...(user ? { "Authorization": `Bearer ${(await (window as any).Clerk?.session?.getToken())}` } : {})
        },
        body: JSON.stringify({
          title,
          description,
          email: user?.primaryEmailAddress?.emailAddress || email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit request");
      }

      setStatus("success");
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 container mx-auto flex flex-col items-center justify-center text-center max-w-lg">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-3xl text-ink mb-4">Request Received!</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Thanks for your idea! We review every request and add the best ones to our production queue.
        </p>
        <Link 
          to="/"
          className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-dark transition-colors"
        >
          Back to Home
        </Link>
        <button 
          onClick={() => setStatus("idle")} 
          className="mt-4 text-sm text-gray-500 hover:text-ink underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-ink mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl text-ink">Request a Design</h1>
            </div>

            <p className="text-gray-600 mb-8">
              Can't find what you're looking for? Let us know what you'd like to color next. 
              Subscribers get priority processing for their requests.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {!user && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  What should we verify/draw? (Subject)
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. A cute astronaut cat"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Details & Specifics
                </label>
                <textarea
                  id="description"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="Tell us about style, mood, or specific elements to include..."
                />
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === "submitting" ? (
                  "Sending..."
                ) : (
                  <>
                    Send Request <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
