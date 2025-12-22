import { Link } from "react-router-dom";

export interface ResourceCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  tags?: string[];
  isLocked?: boolean;
  isNew?: boolean;
  isFree?: boolean;
}

export function ResourceCard({
  id,
  title,
  imageUrl,
  tags = [],
  isLocked = true,
  isNew = false,
  isFree = false,
}: ResourceCardProps) {
  return (
    <article className="group relative">
      <Link to={`/vault/${id}`} className="block">
        {/* Card container with shadow, not on the paper */}
        <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100">
          
          {/* Pure white paper - NO gradients, NO gray */}
          <div className="relative aspect-a4 bg-white overflow-hidden">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={title} 
                className="object-contain w-full h-full p-3 transition-transform duration-300 ease-out group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl opacity-30">🎨</span>
              </div>
            )}

            {/* Badges container */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
              {isFree && (
                <div className="bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  FREE
                </div>
              )}
              {isNew && (
                <div className="bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                  NEW
                </div>
              )}
            </div>



            {/* Hover overlay - Preview CTA */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="bg-white/95 backdrop-blur-sm text-ink text-sm font-medium px-4 py-2 rounded-md shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">
                {isLocked ? "Unlock Full Page" : "See Details"}
              </span>
            </div>
          </div>

          {/* Card footer */}
          <div className="p-5 border-t border-gray-50">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif font-semibold text-ink text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {title}
              </h3>
              {/* Small lock indicator - not blocking */}
              {/* Small lock indicator - not blocking */}
              {isLocked && (
                <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded" title="Club members only">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Members-only</span>
                </span>
              )}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.slice(0, 2).map((tag) => (
                  <span 
                    key={tag} 
                    className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ResourceCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="aspect-a4 skeleton" />
      <div className="p-5 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="flex gap-1">
          <div className="h-3 skeleton rounded w-12" />
          <div className="h-3 skeleton rounded w-10" />
        </div>
      </div>
    </div>
  );
}

export default ResourceCard;
