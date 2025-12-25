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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <h3 className="font-serif text-3xl text-ink">About This Design</h3>
        <div className="h-px bg-gray-200 flex-1" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
           {/* Extended Description */}
           {extendedDescription && (
             <div className="prose prose-lg text-gray-600 leading-relaxed">
               <p>{extendedDescription}</p>
             </div>
           )}

           {/* Two-column layout for tips and activities */}
           <div className="grid md:grid-cols-2 gap-6">
             {/* Coloring Tips */}
             {coloringTips && (
               <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                 <div className="flex items-center gap-2 mb-4">
                   <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                     <Palette className="w-4 h-4" />
                   </div>
                   <h4 className="font-bold text-ink">Coloring Tips</h4>
                 </div>
                 <p className="text-gray-700 text-sm leading-relaxed">{coloringTips}</p>
               </div>
             )}
 
             {/* Suggested Activities */}
             {suggestedActivities && suggestedActivities.length > 0 && (
               <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                 <div className="flex items-center gap-2 mb-4">
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                     <BookOpen className="w-4 h-4" />
                   </div>
                   <h4 className="font-bold text-ink">Activities</h4>
                 </div>
                 <ul className="space-y-2">
                   {suggestedActivities.map((activity, index) => (
                     <li key={index} className="text-sm text-gray-700 flex gap-2">
                       <span className="font-bold text-blue-400 select-none">{index + 1}.</span>
                       {activity}
                     </li>
                   ))}
                 </ul>
               </div>
             )}
           </div>
        </div>

        {/* Sidebar Column (1/3) - Facts & Benefits */}
        <div className="space-y-6">
          {/* Fun Facts */}
          {funFacts && funFacts.length > 0 && (
             <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
               <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                   <Lightbulb className="w-4 h-4" />
                 </div>
                 <h4 className="font-bold text-ink">Fun Facts</h4>
               </div>
               <ul className="space-y-3">
                 {funFacts.map((fact, index) => (
                   <li key={index} className="text-sm text-gray-700 flex gap-2">
                     <span className="text-amber-500 mt-1">•</span>
                     <span>{fact}</span>
                   </li>
                 ))}
               </ul>
             </div>
           )}
 
           {/* Therapeutic Benefits */}
           {therapeuticBenefits && (
             <div className="bg-teal-50 rounded-2xl p-6 border border-teal-100">
               <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                   <Heart className="w-4 h-4" />
                 </div>
                 <h4 className="font-bold text-ink">Benefits</h4>
               </div>
               <p className="text-sm text-gray-700 leading-relaxed">{therapeuticBenefits}</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
