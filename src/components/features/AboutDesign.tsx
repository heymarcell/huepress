import { Lightbulb, Heart, Palette, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface AboutDesignProps {
  extendedDescription?: string;
  funFacts?: string[];
  suggestedActivities?: string[];
  coloringTips?: string;
  therapeuticBenefits?: string;
  category?: string;
  skill?: string;
}

export function AboutDesign({
  extendedDescription,
  funFacts,
  suggestedActivities,
  coloringTips,
  therapeuticBenefits,
  category,
  skill,
}: AboutDesignProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Don't render if no extended content available
  const hasContent = extendedDescription || funFacts?.length || suggestedActivities?.length || coloringTips || therapeuticBenefits;
  
  if (!hasContent) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-8">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors"
      >
        <h3 className="font-serif text-h3 text-ink">About This Design</h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Content - Expandable */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Extended Description */}
          {extendedDescription && (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600 leading-relaxed">{extendedDescription}</p>
            </div>
          )}

          {/* Fun Facts */}
          {funFacts && funFacts.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h4 className="font-medium text-ink">Fun Facts</h4>
              </div>
              <ul className="space-y-2">
                {funFacts.map((fact, index) => (
                  <li key={index} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-amber-500">•</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Therapeutic Benefits */}
          {therapeuticBenefits && (
            <div className="bg-primary/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-primary" />
                <h4 className="font-medium text-ink">Therapeutic Benefits</h4>
              </div>
              <p className="text-sm text-gray-600">{therapeuticBenefits}</p>
            </div>
          )}

          {/* Two-column layout for tips and activities */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Coloring Tips */}
            {coloringTips && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-5 h-5 text-purple-500" />
                  <h4 className="font-medium text-ink">Coloring Tips</h4>
                </div>
                <p className="text-sm text-gray-600">{coloringTips}</p>
              </div>
            )}

            {/* Suggested Activities */}
            {suggestedActivities && suggestedActivities.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <h4 className="font-medium text-ink">Activities</h4>
                </div>
                <ul className="space-y-1">
                  {suggestedActivities.map((activity, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      {index + 1}. {activity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Best For Tags */}
          {(category || skill) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">Best for:</span>
              {category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {category}
                </span>
              )}
              {skill && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {skill} level
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
