import { Lightbulb, Heart, Palette, BookOpen } from "lucide-react";

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
}: AboutDesignProps) {

  // Don't render if no extended content available
  const hasContent = extendedDescription || funFacts?.length || suggestedActivities?.length || coloringTips || therapeuticBenefits;
  
  if (!hasContent) {
    return null;
  }

  // Collect available sections for smart layout
  const sections = [
    coloringTips && { 
      key: 'tips', 
      icon: Palette, 
      title: 'Coloring Tips', 
      content: coloringTips, 
      type: 'text',
      bg: 'bg-purple-50', 
      border: 'border-purple-100', 
      iconBg: 'bg-purple-100', 
      iconColor: 'text-purple-600' 
    },
    funFacts?.length && { 
      key: 'facts', 
      icon: Lightbulb, 
      title: 'Fun Facts', 
      content: funFacts, 
      type: 'list',
      bg: 'bg-amber-50', 
      border: 'border-amber-100', 
      iconBg: 'bg-amber-100', 
      iconColor: 'text-amber-600' 
    },
    suggestedActivities?.length && { 
      key: 'activities', 
      icon: BookOpen, 
      title: 'Activities', 
      content: suggestedActivities, 
      type: 'numbered',
      bg: 'bg-blue-50', 
      border: 'border-blue-100', 
      iconBg: 'bg-blue-100', 
      iconColor: 'text-blue-600' 
    },
    therapeuticBenefits && { 
      key: 'benefits', 
      icon: Heart, 
      title: 'Benefits', 
      content: therapeuticBenefits, 
      type: 'text',
      bg: 'bg-teal-50', 
      border: 'border-teal-100', 
      iconBg: 'bg-teal-100', 
      iconColor: 'text-teal-600' 
    },
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof Palette;
    title: string;
    content: string | string[];
    type: 'text' | 'list' | 'numbered';
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
  }>;

  // Dynamic grid: 1 col on mobile, 2 cols on desktop (always wide cards)
  // this prevents the "tiny scattered boxes" look
  const gridCols = 'md:grid-cols-2';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h2 className="font-serif text-2xl text-ink">About This Design</h2>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      {/* Extended Description - Full Width with better mobile readability */}
      {extendedDescription && (
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed sm:leading-[1.8] max-w-4xl">
          {extendedDescription}
        </p>
      )}

      {/* Dynamic Grid of Info Cards - Wide Layout */}
      {sections.length > 0 && (
        <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
          {sections.map((section) => (
            <div 
              key={section.key}
              className={`${section.bg} ${section.border} border rounded-2xl p-6 hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full ${section.iconBg} ${section.iconColor} flex items-center justify-center`}>
                  <section.icon className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg font-medium text-ink">{section.title}</h3>
              </div>
              
              {section.type === 'text' && (
                <p className="text-gray-700 leading-relaxed">{section.content as string}</p>
              )}
              
              {section.type === 'list' && (
                <ul className="space-y-3">
                  {(section.content as string[]).map((item, i) => (
                    <li key={i} className="text-gray-700 flex gap-3 text-base leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              {section.type === 'numbered' && (
                <ul className="space-y-2">
                  {(section.content as string[]).map((item, i) => (
                    <li key={i} className="text-gray-700 flex gap-2">
                      <span className="font-bold text-blue-400 mt-0.5">{i + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
