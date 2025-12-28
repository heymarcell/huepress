import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/Button"; // Assuming this exists or using standard button
import { 
  ArrowRight, Check, User, Users, BookOpen, Briefcase, Palette, 
  Cat, Crown, Turtle, Car, Rocket, Leaf, Sparkles, Gift, Circle, 
  GraduationCap, Sun, Heart, Instagram, Music, Search, Facebook, Pin, MoreHorizontal 
} from "lucide-react";

// Types
type OnboardingStep = "welcome" | "role" | "ages" | "themes" | "goal" | "source" | "complete";

const ROLES = [
  { id: "mom", label: "Mom", icon: User },
  { id: "dad", label: "Dad", icon: User },
  { id: "grandparent", label: "Grandparent", icon: Users },
  { id: "teacher", label: "Teacher", icon: BookOpen },
  { id: "professional", label: "Therapist/Pro", icon: Briefcase },
  { id: "self", label: "Just for Me", icon: Palette }
];

const SOURCES = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "tiktok", label: "TikTok", icon: Music },
  { id: "google", label: "Google Search", icon: Search },
  { id: "friend", label: "Friend / Family", icon: Heart },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "pinterest", label: "Pinterest", icon: Pin },
  { id: "other", label: "Other", icon: MoreHorizontal }
];

const AGE_RANGES = [
  "Toddler (1-3)",
  "Preschool (3-5)",
  "Big Kid (5-8)",
  "Pre-Teen (9-12)",
  "Adult"
];

const THEMES = [
  { id: "Animals", label: "Animals", icon: Cat },
  { id: "Princesses", label: "Princesses", icon: Crown },
  { id: "Dinosaurs", label: "Dinosaurs", icon: Turtle },
  { id: "Vehicles", label: "Vehicles", icon: Car },
  { id: "Space", label: "Space", icon: Rocket },
  { id: "Nature", label: "Nature", icon: Leaf },
  { id: "Fantasy", label: "Fantasy", icon: Sparkles },
  { id: "Holidays", label: "Holidays", icon: Gift },
  { id: "Educational", label: "Educational", icon: BookOpen },
  { id: "Mandala", label: "Mandala", icon: Circle }
];

const GOALS = [
  { id: "fun", label: "Just for Fun", icon: Palette },
  { id: "education", label: "Education & Learning", icon: GraduationCap },
  { id: "calm", label: "Relaxation & Calm", icon: Sun },
  { id: "bonding", label: "Family Bonding", icon: Heart }
];

export default function Onboarding() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [loading, setLoading] = useState(false);

  // Form State
  const [role, setRole] = useState<string>("");
  const [ages, setAges] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [goal, setGoal] = useState<string>("");
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    if (isLoaded && !user) {
      navigate("/sign-in");
    }
  }, [isLoaded, user, navigate]);

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
          userRole: role,
          kidsAges: ages,
          favoriteThemes: themes,
          usageGoal: goal,
          acquisitionSource: source
        }
      });
      navigate("/"); // Redirect to home/dashboard
    } catch (err) {
      console.error("Failed to save onboarding data", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (item: string, current: string[], setter: (val: string[]) => void) => {
    if (current.includes(item)) {
      setter(current.filter(i => i !== item));
    } else {
      setter([...current, item]);
    }
  };

  if (!isLoaded || !user) return null;

  return (
    <div className="min-h-screen bg-soft-beige flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden transition-all">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-2 bg-primary/20 w-full">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ 
              width: step === "welcome" ? "10%" : 
                     step === "role" ? "20%" :
                     step === "ages" ? "40%" : 
                     step === "themes" ? "60%" : 
                     step === "goal" ? "80%" : "100%" 
            }}
          />
        </div>

        {/* STEP: WELCOME */}
        {step === "welcome" && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-3xl text-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-3xl text-ink">Hi {user.firstName || 'there'}, I'm Sarah.</h1>
            <p className="text-gray-600">
              I built HuePress to help you find peace (and good art). Let's customize your Vault so you see the right things first.
            </p>
            <Button onClick={() => setStep("role")} className="w-full h-12 text-lg">
              Let's Go! <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}

        {/* STEP: ROLE */}
        {step === "role" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center">
              <h2 className="font-serif text-2xl text-ink">Tell me about you</h2>
              <p className="text-gray-500 text-sm mt-1">This helps me customize your content.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 h-32 ${
                    role === r.id
                      ? "border-primary bg-primary/5 text-primary-dark"
                      : "border-gray-100 hover:border-primary/30 hover:bg-gray-50"
                  }`}
                >
                  <r.icon className={`w-8 h-8 ${role === r.id ? "text-primary" : "text-gray-400"}`} />
                  <span className="font-medium text-sm">{r.label}</span>
                </button>
              ))}
            </div>

            <Button 
              onClick={() => setStep("ages")} 
              disabled={!role}
              className="w-full mt-4"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP: AGES */}
        {step === "ages" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center">
              <h2 className="font-serif text-2xl text-ink">Who are the little hands?</h2>
              <p className="text-gray-500 text-sm mt-1">Select all age ranges that apply.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {AGE_RANGES.map((age) => (
                <button
                  key={age}
                  onClick={() => toggleSelection(age, ages, setAges)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    ages.includes(age)
                      ? "border-primary bg-primary/5 text-primary-dark"
                      : "border-gray-100 hover:border-primary/30 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{age}</span>
                  {ages.includes(age) && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>

            <Button 
              onClick={() => setStep("themes")} 
              disabled={ages.length === 0}
              className="w-full"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP: THEMES */}
        {step === "themes" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center">
              <h2 className="font-serif text-2xl text-ink">What do they love?</h2>
              <p className="text-gray-500 text-sm mt-1">Pick a few favorites to get started.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => toggleSelection(theme.id, themes, setThemes)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 h-24 ${
                    themes.includes(theme.id)
                      ? "bg-secondary/10 text-secondary-dark border-secondary shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-secondary/50 hover:bg-secondary/5"
                  }`}
                >
                  <theme.icon className={`w-6 h-6 ${themes.includes(theme.id) ? "text-secondary" : "text-gray-400"}`} />
                  <span>{theme.label}</span>
                </button>
              ))}
            </div>

            <Button 
              onClick={() => setStep("goal")} 
              disabled={themes.length === 0}
              className="w-full mt-4"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP: GOAL */}
        {step === "goal" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center">
              <h2 className="font-serif text-2xl text-ink">Main Goal?</h2>
              <p className="text-gray-500 text-sm mt-1">How can we help you most?</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                    goal === g.id
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 hover:border-primary/30 hover:bg-gray-50"
                  }`}
                >
                  <g.icon className={`w-6 h-6 ${goal === g.id ? "text-primary" : "text-gray-400"}`} />
                  <span className={`font-medium ${goal === g.id ? "text-primary-dark" : "text-gray-700"}`}>
                    {g.label}
                  </span>
                </button>
              ))}
            </div>

            <Button 
              onClick={() => setStep("source")} 
              disabled={!goal}
              isLoading={loading}
              className="w-full mt-4"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP: SOURCE */}
        {step === "source" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="text-center">
              <h2 className="font-serif text-2xl text-ink">How did you find us?</h2>
              <p className="text-gray-500 text-sm mt-1">We'd love to know where you came from.</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                    source === s.id
                      ? "border-primary bg-primary/5 text-primary-dark"
                      : "border-gray-100 hover:border-primary/30 hover:bg-gray-50"
                  }`}
                >
                  <s.icon className={`w-5 h-5 ${source === s.id ? "text-primary" : "text-gray-400"}`} />
                  <span className="font-medium">{s.label}</span>
                  {source === s.id && <Check className="ml-auto w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>

            <Button 
              onClick={handleComplete} 
              disabled={!source}
              isLoading={loading}
              className="w-full mt-4"
            >
              Finish Customization <Sparkles className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* Skip Link */}
        <div className="mt-6 text-center">
           <button 
             onClick={handleComplete}
             className="text-xs text-gray-400 hover:text-gray-600 underline"
           >
             Skip for now
           </button>
        </div>

      </div>
    </div>
  );
}
